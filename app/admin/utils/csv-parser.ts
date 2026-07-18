import Papa from 'papaparse';
import { ITEM_DICTIONARY } from '@/lib/item-dictionary';
import type { Database } from '@/types/database.types';

type InsertTx = Database['public']['Tables']['transactions']['Insert'];

export interface CsvParseResult {
  insertedCount: number;
  branchesDetected: Set<string>;
  transactions: InsertTx[];
}

// Normalize names for fuzzy/clean matching between CSV and DB
export function normalizeName(name: string): string {
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

// Safe date parser for "DD-MM-YYYY hh:mm A", "DD/MM/YYYY hh:mm A", and similar formats
export function parseTransactionDate(dateStr: string): string {
  const trimmed = dateStr.trim();

  // Match "DD-MM-YYYY hh:mm A" or "DD/MM/YYYY hh:mm A" (e.g. 07-06-2026 01:47 PM)
  const match1 = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})\s+(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (match1) {
    const [, day, month, year, hoursStr, minutesStr, ampm] = match1;
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
    const [, day, month, year, hours, minutes] = match2;
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
export function getBranchFromRef(refNo: string): string {
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
 * Parses a single WessConnect CSV text file and populates the parsed transaction list.
 * Safely aggregates unmapped employee warnings and unique reference counts across multiple files.
 */
export function parseWessConnectCsv(
  csvText: string,
  fileName: string,
  profileMap: Map<string, string>,
  refCounts: Map<string, number>,
  unmappedEmployeeMap: Map<string, number>
): CsvParseResult {
  // Parse CSV with PapaParse
  const parseResult = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0) {
    throw new Error(`Failed to parse CSV file "${fileName}": ${parseResult.errors[0].message}`);
  }

  const rows = parseResult.data;
  if (rows.length === 0) {
    return { insertedCount: 0, branchesDetected: new Set<string>(), transactions: [] };
  }

  // Detect if this is an "Employee Service Detail" CSV format by checking the first 10 rows
  let isServiceDetailFile = false;
  for (const row of rows.slice(0, 10)) {
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
  const branchesDetected = new Set<string>();
  const transactions: InsertTx[] = [];

  if (isServiceDetailFile) {
    // Default column indices for Employee Service Detail (excluding unused fields)
    let dateIdx = 0;
    let refIdx = 1;
    let empIdx = 2;
    let custIdx = 3;
    let itemCodeIdx = 4;
    let itemNameIdx = 5;
    let qtyIdx = 10;
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

        const foundQty = lowerRow.indexOf('qty');
        if (foundQty !== -1) qtyIdx = foundQty;

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

      const normalizedEmp = normalizeName(rawEmployeeName);
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
        branchesDetected.add(branch);

        // Generate unique prefixed reference number to prevent duplicate keys with standard reports
        const baseRef = `ESD_${rawRef}`;
        const count = refCounts.get(baseRef) || 0;
        refCounts.set(baseRef, count + 1);
        const dbRef = `${baseRef}_${count + 1}`;

        transactions.push({
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`File "${fileName}", Row ${i + 1} parsing error: ${msg}`);
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
          throw new Error(`Failed to parse CSV file "${fileName}": Required column 'Nett' not found.`);
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

      const normalizedEmp = normalizeName(rawEmployeeName);
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
        branchesDetected.add(branch);

        // Generate unique reference number per item in ticket to prevent duplicates in bulk uploads
        let dbRef = rawRef;
        if (rawRef) {
          const count = refCounts.get(rawRef) || 0;
          refCounts.set(rawRef, count + 1);
          dbRef = `${rawRef}_${count + 1}`;
        }

        transactions.push({
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`File "${fileName}", Row ${i + 1} parsing error: ${msg}`);
      }
    }
  }

  return {
    insertedCount: fileInsertedCount,
    branchesDetected,
    transactions,
  };
}
