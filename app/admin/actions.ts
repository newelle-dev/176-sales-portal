'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';

export type UploadState = {
  success?: boolean;
  insertedCount?: number;
  error?: string;
  missingEmployees?: string[];
};

// Normalize names for fuzzy/clean matching between CSV and DB
function normalizeName(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim();

  // Normalize assist abbreviations
  normalized = normalized.replace(/\((assist|assistant)\)/gi, 'assist');
  normalized = normalized.replace(/\basst\b\.?/gi, 'assist');

  // Strip other text in parentheses (e.g., role titles like (Manicurist))
  normalized = normalized.replace(/\s*\(.*?\)\s*/g, ' ');

  // Collapse multiple spaces and trim
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

const NAME_OVERRIDES: Record<string, string> = {
  'sven tan': 'sven',
};

// Safe date parser for "DD-MM-YYYY hh:mm A" and similar formats
function parseTransactionDate(dateStr: string): string {
  const trimmed = dateStr.trim();

  // Match "DD-MM-YYYY hh:mm A" (e.g. 07-06-2026 01:47 PM)
  const match1 = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (match1) {
    let [_, day, month, year, hoursStr, minutesStr, ampm] = match1;
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (ampm.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${year}-${month}-${day}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  }

  // Match "DD-MM-YYYY HH:mm" (24h)
  const match2 = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/);
  if (match2) {
    const [_, day, month, year, hours, minutes] = match2;
    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  throw new Error(`Invalid date format: ${dateStr}`);
}

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

    // 2. Read file from FormData
    const file = formData.get('file') as File;
    if (!file) {
      return { error: 'No file provided.' };
    }

    const csvText = await file.text();

    // 3. Parse CSV with PapaParse
    const parseResult = Papa.parse<string[]>(csvText, {
      skipEmptyLines: true,
    });

    if (parseResult.errors.length > 0) {
      return { error: `Failed to parse CSV: ${parseResult.errors[0].message}` };
    }

    const rows = parseResult.data;
    if (rows.length === 0) {
      return { error: 'The uploaded file is empty.' };
    }

    // 4. Fetch all user profiles for name matching
    const adminClient = createAdminClient();
    const { data: dbProfiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, name');

    if (profilesError || !dbProfiles) {
      return { error: `Failed to fetch profiles: ${profilesError?.message || 'Unknown error'}` };
    }

    // Build a map of normalized names to profile IDs
    const profileMap = new Map<string, string>();
    dbProfiles.forEach((p) => {
      const normalized = normalizeName(p.name);
      profileMap.set(normalized, p.id);
    });

    // Default indices which we will auto-detect from header rows
    let dateIdx = 1;
    let refIdx = 2;
    let empIdx = 3;
    let custIdx = 4;
    let itemIdx = 5;
    let typeIdx = 6;
    let totalIdx = 8;

    const transactionsToInsert: any[] = [];
    const missingEmployeesSet = new Set<string>();

    // 5. Parse row-by-row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Detect header row and update indices dynamically
      if (row.includes('Reference No.') && row.includes('Employee')) {
        const cleanRow = row.map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
        dateIdx = cleanRow.indexOf('Date');
        refIdx = cleanRow.indexOf('Reference No.');
        empIdx = cleanRow.indexOf('Employee');
        custIdx = cleanRow.indexOf('Customer');
        itemIdx = cleanRow.indexOf('Item');
        typeIdx = cleanRow.indexOf('Type');
        totalIdx = cleanRow.indexOf('Total');
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

      const profileId = profileMap.get(normalizedEmp);
      if (!profileId) {
        missingEmployeesSet.add(rawEmployeeName);
        continue;
      }

      // Parse other fields
      const rawDate = row[dateIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      const rawRef = row[refIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      const rawCustomer = row[custIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      const rawItem = row[itemIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      const rawTotal = row[totalIdx]?.trim().replace(/^["']|["']$/g, '') || '0';

      try {
        const transactionDate = parseTransactionDate(rawDate);
        const amount = parseFloat(rawTotal.replace(/,/g, '')) || 0;

        transactionsToInsert.push({
          profile_id: profileId,
          transaction_date: transactionDate,
          reference_no: rawRef,
          customer_name: rawCustomer,
          item_description: rawItem,
          type: rawType,
          amount: amount,
        });
      } catch (err: any) {
        return { error: `Row ${i + 1} parsing error: ${err.message || err}` };
      }
    }

    // 6. Report any missing employees before writing to the database
    if (missingEmployeesSet.size > 0) {
      return {
        missingEmployees: Array.from(missingEmployeesSet),
        error: 'The CSV contains employees that do not exist in the database.',
      };
    }

    if (transactionsToInsert.length === 0) {
      return { success: true, insertedCount: 0 };
    }

    // 7. Upsert into public.transactions (onConflict 'reference_no')
    const { error: insertError } = await adminClient
      .from('transactions')
      .upsert(transactionsToInsert, { onConflict: 'reference_no' });

    if (insertError) {
      return { error: `Failed to insert transactions: ${insertError.message}` };
    }

    revalidatePath('/admin');
    return { success: true, insertedCount: transactionsToInsert.length };
  } catch (error: any) {
    return { error: error.message || 'An unexpected error occurred during import.' };
  }
}
