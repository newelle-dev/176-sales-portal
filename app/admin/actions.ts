'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
import { ITEM_DICTIONARY } from '@/lib/item-dictionary';
import type { Database } from '@/types/database.types';

export type UploadState = {
  success?: boolean;
  insertedCount?: number;
  error?: string;
  filesProcessed?: {
    name: string;
    insertedCount: number;
    branchDetected: string;
  }[];
  unmappedEmployees?: {
    name: string;
    count: number;
  }[];
};

// Normalize names for fuzzy/clean matching between CSV and DB
function normalizeName(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim();

  // Normalize assist/asst abbreviations within parentheses first
  normalized = normalized.replace(/\s*\((assist|assistant|asst)\.?\)/gi, ' assist');
  // Normalize stand-alone asst abbreviations
  normalized = normalized.replace(/\basst\b\.?/gi, 'assist');

  // Strip other text in parentheses (e.g., role titles like (Manicurist))
  normalized = normalized.replace(/\s*\(.*?\)\s*/g, ' ');

  // Collapse multiple spaces and trim
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

const NAME_OVERRIDES: Record<string, string> = {
  'sven': 'sven tan',
  'alice': 'alice assist',
  'jessie': 'jessie cheah',
  'jingwen': 'jing wen',
  'williamassist': 'william assist',
};

// Safe date parser for "DD-MM-YYYY hh:mm A", "DD/MM/YYYY hh:mm A", and similar formats
function parseTransactionDate(dateStr: string): string {
  const trimmed = dateStr.trim();

  // Match "DD-MM-YYYY hh:mm A" or "DD/MM/YYYY hh:mm A" (e.g. 07-06-2026 01:47 PM)
  const match1 = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (match1) {
    let [_, day, month, year, hoursStr, minutesStr, ampm] = match1;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (ampm.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${year}-${month}-${day}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00+08:00`;
  }

  // Match "DD-MM-YYYY HH:mm" or "DD/MM/YYYY HH:mm" (24h)
  const match2 = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{2}):(\d{2})$/);
  if (match2) {
    const [_, day, month, year, hours, minutes] = match2;
    return `${year}-${month}-${day}T${hours}:${minutes}:00+08:00`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  throw new Error(`Invalid date format: ${dateStr}`);
}

/**
 * Resolves a WessConnect branch name from a ticket reference number.
 *
 * WessConnect appends a numeric suffix to reference numbers to identify branches:
 *  - No suffix (e.g. "T001")     → Bangsar (default/head office)
 *  - Suffix "-2" (e.g. "T001-2") → KLGCC
 *  - Suffix "-3" (e.g. "T001-3") → SS2
 *
 * Some reference numbers contain colon-separated parts (e.g. composite tickets);
 * each part is checked for the branch suffix.
 */
function getBranchFromRef(refNo: string): string {
  const trimmed = refNo.trim();
  if (/:/.test(trimmed)) {
    const parts = trimmed.split(':');
    for (const part of parts) {
      const match = part.trim().match(/-(\d+)$/);
      if (match) {
        const suffix = match[1];
        if (suffix === '2') return 'KLGCC';
        if (suffix === '3') return 'SS2';
      }
    }
  }

  const match = trimmed.match(/-(\d+)$/);
  if (match) {
    const suffix = match[1];
    if (suffix === '2') return 'KLGCC';
    if (suffix === '3') return 'SS2';
  }

  return 'Bangsar';
}

/**
 * Server Action: Parses one or more uploaded WessConnect CSV files, maps
 * employee names to stylist profiles, resolves branch from reference numbers,
 * and upserts all transactions into the database.
 *
 * @param formData - FormData with a `files` field containing one or more CSV File objects.
 * @returns UploadState with per-file stats, total counts, and any unmapped employee warnings.
 */
export async function uploadCsvAction(formData: FormData): Promise<UploadState> {
  try {
    // 1. Authenticate user and verify admin role
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized: No active session.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { error: 'Unauthorized: Only admins can upload files.' };
    }

    // 2. Read files from FormData
    const files = formData.getAll('files') as File[];
    if (!files || files.length === 0) {
      return { error: 'No files provided.' };
    }

    // 3. Fetch all user profiles for name matching
    const adminClient = createAdminClient();
    const { data: dbProfiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, name, wess_names');

    if (profilesError || !dbProfiles) {
      return { error: `Failed to fetch profiles: ${profilesError?.message || 'Unknown error'}` };
    }

    // Build a map of normalized names to profile IDs
    const profileMap = new Map<string, string>();
    dbProfiles.forEach((p) => {
      // Map the primary name
      const primaryNormalized = normalizeName(p.name);
      profileMap.set(primaryNormalized, p.id);

      // Map each alias name in the wess_names array
      if (p.wess_names && Array.isArray(p.wess_names)) {
        p.wess_names.forEach((aliasName) => {
          const aliasNormalized = normalizeName(aliasName);
          if (aliasNormalized) {
            profileMap.set(aliasNormalized, p.id);
          }
        });
      }
    });

    const transactionsToInsert: Database['public']['Tables']['transactions']['Insert'][] = [];
    const refCounts = new Map<string, number>();
    const filesProcessed: { name: string; insertedCount: number; branchDetected: string }[] = [];
    const unmappedEmployeeMap = new Map<string, number>();

    // 4. Parse file-by-file
    for (const file of files) {
      let csvText = await file.text();
      // Remove UTF-8 BOM if present
      if (csvText.startsWith('\ufeff')) {
        csvText = csvText.slice(1);
      }

      // Parse CSV with PapaParse
      const parseResult = Papa.parse<string[]>(csvText, {
        skipEmptyLines: true,
      });

      if (parseResult.errors.length > 0) {
        return { error: `Failed to parse CSV file "${file.name}": ${parseResult.errors[0].message}` };
      }

      const rows = parseResult.data;
      if (rows.length === 0) {
        continue;
      }

      // Detect if this is an "Employee Service Detail" CSV format (check for "Actual Value" and "Prepaid")
      let isServiceDetailFile = false;
      for (const row of rows) {
        const trimmedRow = row.map((cell) => cell?.trim() || '');
        const lowerRow = trimmedRow.map((cell) => cell.replace(/^["']|["']$/g, '').toLowerCase());
        if (
          (lowerRow.includes('reference no.') || lowerRow.includes('reference no')) &&
          lowerRow.includes('employee') &&
          lowerRow.includes('actual value')
        ) {
          isServiceDetailFile = true;
          break;
        }
      }

      let fileInsertedCount = 0;
      const branchesInFile = new Set<string>();

      if (isServiceDetailFile) {
        // Default column indices for Employee Service Detail
        let dateIdx = 0;
        let refIdx = 1;
        let empIdx = 2;
        let custIdx = 3;
        let itemCodeIdx = 4;
        let itemNameIdx = 5;
        let prepaidIdx = 8;
        let focIdx = 9;
        let qtyIdx = 10;
        let durationIdx = 11;
        let valueIdx = 12;
        let actualValueIdx = 13;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const trimmedRow = row.map((cell) => cell?.trim() || '');
          const lowerRow = trimmedRow.map((cell) => cell.replace(/^["']|["']$/g, '').toLowerCase());

          // Detect header row and update indices dynamically
          if (
            (lowerRow.includes('reference no.') || lowerRow.includes('reference no')) &&
            lowerRow.includes('employee') &&
            lowerRow.includes('actual value')
          ) {
            const foundDate = lowerRow.indexOf('date');
            if (foundDate !== -1) dateIdx = foundDate;

            const foundRef = lowerRow.includes('reference no.') ? lowerRow.indexOf('reference no.') : lowerRow.indexOf('reference no');
            if (foundRef !== -1) refIdx = foundRef;

            const foundEmp = lowerRow.indexOf('employee');
            if (foundEmp !== -1) empIdx = foundEmp;

            const foundCust = lowerRow.indexOf('customer');
            if (foundCust !== -1) custIdx = foundCust;

            const foundItemCode = lowerRow.indexOf('item code');
            if (foundItemCode !== -1) itemCodeIdx = foundItemCode;

            const foundItemName = lowerRow.indexOf('item name');
            if (foundItemName !== -1) itemNameIdx = foundItemName;

            const foundPrepaid = lowerRow.indexOf('prepaid');
            if (foundPrepaid !== -1) prepaidIdx = foundPrepaid;

            const foundFoc = lowerRow.indexOf('foc');
            if (foundFoc !== -1) focIdx = foundFoc;

            const foundQty = lowerRow.indexOf('qty');
            if (foundQty !== -1) qtyIdx = foundQty;

            const foundDuration = lowerRow.findIndex((cell) => cell.includes('duration'));
            if (foundDuration !== -1) durationIdx = foundDuration;

            const foundValue = lowerRow.indexOf('value');
            if (foundValue !== -1) valueIdx = foundValue;

            const foundActualValue = lowerRow.indexOf('actual value');
            if (foundActualValue !== -1) actualValueIdx = foundActualValue;

            continue;
          }

          // Check if transaction row (must start with a date format DD-MM-YYYY)
          const rawDate = row[dateIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          if (!/^\d{2}[-/]\d{2}[-/]\d{4}/.test(rawDate)) {
            continue; // Skip group header names, grand totals, and blank rows
          }

          const rawEmployeeName = row[empIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          if (!rawEmployeeName) {
            continue;
          }

          let normalizedEmp = normalizeName(rawEmployeeName);
          if (NAME_OVERRIDES[normalizedEmp]) {
            normalizedEmp = NAME_OVERRIDES[normalizedEmp];
          }

          const profileId = profileMap.get(normalizedEmp) || null;

          // If unmapped, track it
          if (!profileId) {
            const currentCount = unmappedEmployeeMap.get(rawEmployeeName) || 0;
            unmappedEmployeeMap.set(rawEmployeeName, currentCount + 1);
          }

          const rawRef = row[refIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          const rawCustomer = row[custIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          const rawItemCode = row[itemCodeIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          const rawItemName = row[itemNameIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          const itemDescription = rawItemCode ? `${rawItemCode}: ${rawItemName}` : rawItemName;

          const rawActualValue = row[actualValueIdx]?.trim().replace(/^["']|["']$/g, '') || '0';
          const rawQty = row[qtyIdx]?.trim().replace(/^["']|["']$/g, '') || '1';

          try {
            const transactionDate = parseTransactionDate(rawDate);
            const actualValue = parseFloat(rawActualValue.replace(/,/g, '')) || 0;
            const quantity = parseFloat(rawQty.replace(/,/g, '')) || 1;
            const branch = getBranchFromRef(rawRef);
            branchesInFile.add(branch);

            // Generate unique prefixed reference number to prevent duplicate keys with standard reports
            const baseRef = `ESD_${rawRef}`;
            const count = refCounts.get(baseRef) || 0;
            refCounts.set(baseRef, count + 1);
            const dbRef = `${baseRef}_${count + 1}`;

            transactionsToInsert.push({
              profile_id: profileId,
              employee_name: rawEmployeeName,
              branch: branch,
              transaction_date: transactionDate,
              reference_no: dbRef,
              customer_name: rawCustomer,
              item_description: itemDescription,
              type: 'S',
              amount: 0,
              deduction: actualValue,
              quantity: quantity,
            });
            fileInsertedCount++;
          } catch (err: any) {
            return { error: `File "${file.name}", Row ${i + 1} parsing error: ${err.message || err}` };
          }
        }
      } else {
        // Standard transaction file format
        let dateIdx = 1;
        let refIdx = 2;
        let empIdx = 3;
        let custIdx = 4;
        let itemIdx = 5;
        let typeIdx = 6;
        let nettIdx = 12; // Default index for Nett
        let deductionIdx = 13; // Default index for Deduction
        let qtyIdx = 7; // Default index for Qty

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          // Detect header row and update indices dynamically, trimming cell values beforehand
          const trimmedRow = row.map((cell) => cell?.trim() || '');
          const lowerRow = trimmedRow.map((cell) => cell.replace(/^["']|["']$/g, '').toLowerCase());
          if (
            (lowerRow.includes('reference no.') || lowerRow.includes('reference no')) &&
            lowerRow.includes('employee')
          ) {
            const foundDate = lowerRow.indexOf('date');
            if (foundDate !== -1) dateIdx = foundDate;

            const foundRef = lowerRow.includes('reference no.') ? lowerRow.indexOf('reference no.') : lowerRow.indexOf('reference no');
            if (foundRef !== -1) refIdx = foundRef;

            const foundEmp = lowerRow.indexOf('employee');
            if (foundEmp !== -1) empIdx = foundEmp;

            const foundCust = lowerRow.indexOf('customer');
            if (foundCust !== -1) custIdx = foundCust;

            const foundType = lowerRow.indexOf('type');
            if (foundType !== -1) typeIdx = foundType;

            const foundQty = lowerRow.indexOf('qty');
            if (foundQty !== -1) qtyIdx = foundQty;

            // Look for 'item' or similar column header
            let foundItem = lowerRow.indexOf('item');
            if (foundItem === -1) {
              foundItem = lowerRow.findIndex((cell) => cell.includes('item') || cell.includes('description') || cell.includes('service'));
            }
            if (foundItem !== -1) itemIdx = foundItem;
            
            const foundNett = lowerRow.indexOf('nett');
            if (foundNett === -1) {
              return { error: `Failed to parse CSV file "${file.name}": Required column 'Nett' not found.` };
            }
            nettIdx = foundNett;

            const foundDeduction = lowerRow.indexOf('deduction');
            deductionIdx = foundDeduction !== -1 ? foundDeduction : 13;
            continue;
          }

          // Check if it is a transaction row (starts with a row number)
          const isTransactionRow = /^\d+$/.test(row[0]?.trim());
          if (!isTransactionRow) {
            continue; // skip totals, metadata, empty lines
          }

          // Extract transaction type and filter (only keep S, G, C, P)
          const rawType = row[typeIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          if (!['S', 'G', 'C', 'P'].includes(rawType)) {
            continue; // Filter out other non-matching types
          }

          // Extract and normalize employee name
          const rawEmployeeName = row[empIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          if (!rawEmployeeName) {
            continue;
          }

          let normalizedEmp = normalizeName(rawEmployeeName);
          if (NAME_OVERRIDES[normalizedEmp]) {
            normalizedEmp = NAME_OVERRIDES[normalizedEmp];
          }

          const profileId = profileMap.get(normalizedEmp) || null;

          // If unmapped, track it
          if (!profileId) {
            const currentCount = unmappedEmployeeMap.get(rawEmployeeName) || 0;
            unmappedEmployeeMap.set(rawEmployeeName, currentCount + 1);
          }

          // Parse other fields
          const rawDate = row[dateIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          const rawRef = row[refIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          const rawCustomer = row[custIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          let rawItem = row[itemIdx]?.trim().replace(/^["']|["']$/g, '') || '';
          if (rawItem && !rawItem.includes(':') && ITEM_DICTIONARY[rawItem]) {
            rawItem = ITEM_DICTIONARY[rawItem];
          }
          const rawNett = row[nettIdx]?.trim().replace(/^["']|["']$/g, '') || '0';
          const rawDeduction = row[deductionIdx]?.trim().replace(/^["']|["']$/g, '') || '0';
          const rawQty = row[qtyIdx]?.trim().replace(/^["']|["']$/g, '') || '1';

          try {
            const transactionDate = parseTransactionDate(rawDate);
            const amount = parseFloat(rawNett.replace(/,/g, '')) || 0;
            const deduction = parseFloat(rawDeduction.replace(/,/g, '')) || 0;
            const quantity = parseFloat(rawQty.replace(/,/g, '')) || 1;
            const branch = getBranchFromRef(rawRef);
            branchesInFile.add(branch);

            // Generate unique reference number per item in ticket to prevent duplicates in bulk uploads
            let dbRef = rawRef;
            if (rawRef) {
              const count = refCounts.get(rawRef) || 0;
              refCounts.set(rawRef, count + 1);
              dbRef = `${rawRef}_${count + 1}`;
            }

            transactionsToInsert.push({
              profile_id: profileId,
              employee_name: rawEmployeeName,
              branch: branch,
              transaction_date: transactionDate,
              reference_no: dbRef,
              customer_name: rawCustomer,
              item_description: rawItem,
              type: rawType,
              amount: amount,
              deduction: deduction,
              quantity: quantity,
            });
            fileInsertedCount++;
          } catch (err: any) {
            return { error: `File "${file.name}", Row ${i + 1} parsing error: ${err.message || err}` };
          }
        }
      }

      filesProcessed.push({
        name: file.name,
        insertedCount: fileInsertedCount,
        branchDetected: Array.from(branchesInFile).join(', ') || 'Bangsar',
      });
    }

    if (transactionsToInsert.length === 0) {
      return { success: true, insertedCount: 0, filesProcessed, unmappedEmployees: [] };
    }

    // 5. Upsert into public.transactions (onConflict 'reference_no') in chunks of 300 to avoid limits/timeouts
    const chunkSize = 300;
    for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
      const chunk = transactionsToInsert.slice(i, i + chunkSize);
      const { error: insertError } = await adminClient
        .from('transactions')
        .upsert(chunk, { onConflict: 'reference_no' });

      if (insertError) {
        return { error: `Failed to insert transactions chunk starting at index ${i}: ${insertError.message}` };
      }
    }

    // Convert map to array of objects
    const unmappedEmployees = Array.from(unmappedEmployeeMap.entries()).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return {
      success: true,
      insertedCount: transactionsToInsert.length,
      filesProcessed,
      unmappedEmployees,
    };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred during import.' };
  }
}

export async function clearTransactionsAction(): Promise<{ success?: boolean; error?: string }> {
  try {
    // 1. Authenticate user and verify admin role
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized: No active session.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { error: 'Unauthorized: Only admins can clear transactions.' };
    }

    // 2. Clear all transactions using the admin client
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (deleteError) {
      return { error: `Failed to clear transactions: ${deleteError.message}` };
    }

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred while clearing transactions.' };
  }
}

/**
 * Server Action: Updates or inserts the sales target for a specific year.
 * Only callable by authenticated admin users.
 */
export async function updateYearlyTargetAction(
  year: number,
  amount: number
): Promise<{ success?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Unauthorized: No active session.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { error: 'Unauthorized: Only admins can manage targets.' };
    }

    const { error } = await supabase
      .from('targets')
      .upsert({ year, target_amount: amount }, { onConflict: 'year' });

    if (error) {
      return { error: `Failed to update target: ${error.message}` };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred.' };
  }
}


