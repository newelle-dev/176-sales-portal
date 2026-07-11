import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

// 1. Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.trim().match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2. Name normalization logic (matching actions.ts)
function normalizeName(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(/\((assist|assistant)\)/gi, 'assist');
  normalized = normalized.replace(/\basst\b\.?/gi, 'assist');
  normalized = normalized.replace(/\s*\(.*?\)\s*/g, ' ');
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

// 3. Date parser (matching actions.ts)
function parseTransactionDate(dateStr: string): string {
  const trimmed = dateStr.trim();
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

// 4. Branch resolution helper
function getBranchFromRef(refNo: string): string {
  const trimmed = refNo.trim();
  if (/:/.test(trimmed)) {
    const parts = trimmed.split(':');
    for (const part of parts) {
      const match = part.trim().match(/-(\d+)$/);
      if (match) {
        const suffix = match[1];
        if (suffix === '2') return 'SS2';
        if (suffix === '3') return 'KLGCC';
      }
    }
  }
  const match = trimmed.match(/-(\d+)$/);
  if (match) {
    const suffix = match[1];
    if (suffix === '2') return 'SS2';
    if (suffix === '3') return 'KLGCC';
  }
  return 'Bangsar';
}

async function run() {
  console.log('Fetching active profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, wess_names');

  if (profilesError) {
    console.error('Failed to fetch profiles:', profilesError.message);
    process.exit(1);
  }

  const profileMap = new Map<string, string>();
  profiles?.forEach((p) => {
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

  const files = [
    { path: 'public/Employee Received Detail.csv' },
    { path: 'public/Employee Received Detail (1).csv' },
    { path: 'public/Employee Received Detail (2).csv' }
  ];

  let totalParsed = 0;
  let totalImported = 0;
  const transactionsToInsert: any[] = [];
  const refCounts = new Map<string, number>();

  for (const fileInfo of files) {
    const absolutePath = path.resolve(process.cwd(), fileInfo.path);
    if (!fs.existsSync(absolutePath)) {
      console.warn(`File not found: ${fileInfo.path}, skipping...`);
      continue;
    }

    console.log(`Parsing file: ${fileInfo.path}...`);
    const csvContent = fs.readFileSync(absolutePath, 'utf8');
    const parseResult = Papa.parse<string[]>(csvContent, { skipEmptyLines: true });
    const rows = parseResult.data;

    let dateIdx = 1;
    let refIdx = 2;
    let empIdx = 3;
    let custIdx = 4;
    let itemIdx = 5;
    let typeIdx = 6;
    let totalIdx = 8;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Auto-detect header row
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

      // Check if transaction row
      const isTransactionRow = /^\d+$/.test(row[0]?.trim());
      if (!isTransactionRow) continue;

      const rawType = row[typeIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      if (!['S', 'G', 'C', 'P'].includes(rawType)) continue;

      const rawEmployeeName = row[empIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      if (!rawEmployeeName) continue;

      let normalizedEmp = normalizeName(rawEmployeeName);
      if (NAME_OVERRIDES[normalizedEmp]) {
        normalizedEmp = NAME_OVERRIDES[normalizedEmp];
      }

      const profileId = profileMap.get(normalizedEmp) || null;

      const rawDate = row[dateIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      const rawRef = row[refIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      const rawCustomer = row[custIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      const rawItem = row[itemIdx]?.trim().replace(/^["']|["']$/g, '') || '';
      const rawTotal = row[totalIdx]?.trim().replace(/^["']|["']$/g, '') || '0';

      try {
        const transactionDate = parseTransactionDate(rawDate);
        const amount = parseFloat(rawTotal.replace(/,/g, '')) || 0;
        const branch = getBranchFromRef(rawRef);

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
        });
        totalParsed++;
      } catch (err: any) {
        console.error(`Error in file ${fileInfo.path} row ${i + 1}:`, err.message || err);
      }
    }
  }

  console.log(`Parsed ${totalParsed} transactions from CSV files.`);

  // 6. Bulk upsert in chunks of 200 rows
  const chunkSize = 200;
  for (let i = 0; i < transactionsToInsert.length; i += chunkSize) {
    const chunk = transactionsToInsert.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('transactions')
      .upsert(chunk, { onConflict: 'reference_no' });

    if (error) {
      console.error(`Failed to insert chunk starting at index ${i}:`, error.message);
    } else {
      totalImported += chunk.length;
      console.log(`Successfully upserted transactions ${i + 1} to ${Math.min(i + chunkSize, transactionsToInsert.length)}...`);
    }
  }

  console.log(`Import completed. Total successfully imported/updated: ${totalImported} / ${totalParsed}`);
}

run();
