const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Load environment variables manually
const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
  console.error('.env file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function deduplicateDatabase() {
  console.log('Fetching all transaction records from database...');

  let allTransactions = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, employee_name, transaction_date, branch, customer_name, item_description, amount, deduction, reference_no, created_at')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Failed to fetch transactions:', error.message);
      process.exit(1);
    }

    if (data && data.length > 0) {
      allTransactions.push(...data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`Total transactions fetched: ${allTransactions.length}`);

  if (allTransactions.length === 0) {
    console.log('No transactions found in database.');
    return;
  }

  // Group transactions by signature
  const groups = new Map();
  for (const tx of allTransactions) {
    const signature = `${tx.transaction_date}_${tx.branch}_${tx.employee_name}_${tx.customer_name}_${tx.item_description}_${Number(tx.amount || 0)}_${Number(tx.deduction || 0)}`;
    const list = groups.get(signature) || [];
    list.push(tx);
    groups.set(signature, list);
  }

  console.log(`Total unique transaction signatures: ${groups.size}`);

  const idsToDelete = [];
  let duplicateGroupCount = 0;

  for (const [signature, list] of groups.entries()) {
    if (list.length > 1) {
      duplicateGroupCount++;
      // Sort: prioritize standard reference numbers over ESD_ prefixed ones, then older created_at
      list.sort((a, b) => {
        const aIsEsd = a.reference_no && a.reference_no.startsWith('ESD_') ? 1 : 0;
        const bIsEsd = b.reference_no && b.reference_no.startsWith('ESD_') ? 1 : 0;
        if (aIsEsd !== bIsEsd) return aIsEsd - bIsEsd;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      // Keep list[0], delete list[1..N]
      for (let i = 1; i < list.length; i++) {
        idsToDelete.push(list[i].id);
      }
    }
  }

  console.log(`Found ${duplicateGroupCount} groups with duplicate entries.`);
  console.log(`Total duplicate rows to delete: ${idsToDelete.length}`);

  if (idsToDelete.length > 0) {
    const chunkSize = 500;
    let deletedCount = 0;

    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .in('id', chunk);

      if (deleteError) {
        console.error(`Error deleting chunk starting at index ${i}:`, deleteError.message);
      } else {
        deletedCount += chunk.length;
        console.log(`Deleted chunk of ${chunk.length} duplicate records (${deletedCount}/${idsToDelete.length})`);
      }
    }

    console.log(`\nSuccessfully removed ${deletedCount} duplicate records from the database.`);
  } else {
    console.log('\nNo duplicate records found to remove.');
  }

  // Standardize remaining ESD_ reference numbers in parallel batches
  console.log('\nChecking for any remaining ESD_ prefixed reference numbers to standardize...');
  const { data: esdRows } = await supabase
    .from('transactions')
    .select('id, reference_no')
    .like('reference_no', 'ESD_%');

  if (esdRows && esdRows.length > 0) {
    console.log(`Standardizing ${esdRows.length} ESD_ prefixed reference numbers...`);
    const batchSize = 50;
    let updatedCount = 0;
    for (let i = 0; i < esdRows.length; i += batchSize) {
      const chunk = esdRows.slice(i, i + batchSize);
      await Promise.all(
        chunk.map(async (row) => {
          const newRef = row.reference_no.replace(/^ESD_/, '');
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ reference_no: newRef })
            .eq('id', row.id);
          if (!updateError) updatedCount++;
        })
      );
    }
    console.log(`Updated ${updatedCount} reference numbers.`);
  } else {
    console.log('No ESD_ prefixed reference numbers remaining.');
  }

  console.log('\nDatabase cleanup complete!');
}

deduplicateDatabase();
