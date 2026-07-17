import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1. Load environment variables from .env
const envPath = path.resolve(process.cwd(), '.env');
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
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 2. Name normalization logic
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

async function audit() {
  console.log('--- STARTING MAPPING AUDIT ---');
  
  // Fetch profiles
  console.log('Fetching profiles...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, name, email, role, wess_names');

  if (profilesError || !profiles) {
    console.error('Failed to fetch profiles:', profilesError?.message);
    process.exit(1);
  }

  // Fetch transactions (paginated to load all rows)
  console.log('Fetching transactions...');
  const transactions: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: chunk, error: txError } = await supabase
      .from('transactions')
      .select('id, employee_name, profile_id, reference_no, branch, amount')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (txError) {
      console.error('Failed to fetch transactions:', txError.message);
      process.exit(1);
    }

    if (!chunk || chunk.length === 0) {
      hasMore = false;
    } else {
      transactions.push(...chunk);
      if (chunk.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }
  }

  console.log(`Loaded ${profiles.length} profiles and ${transactions.length} transactions.\n`);

  // Build profile maps
  const profileMap = new Map<string, typeof profiles[0]>();
  const idToProfile = new Map<string, typeof profiles[0]>();

  profiles.forEach((p) => {
    idToProfile.set(p.id, p);
    
    const primaryNorm = normalizeName(p.name);
    profileMap.set(primaryNorm, p);

    if (p.wess_names && Array.isArray(p.wess_names)) {
      p.wess_names.forEach((alias) => {
        const aliasNorm = normalizeName(alias);
        if (aliasNorm) {
          profileMap.set(aliasNorm, p);
        }
      });
    }
  });

  // Audit calculations
  let linkedCorrectly = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let unlinkedAndNoProfile = 0;

  const unlinkedMismatches: Array<{ txId: string; ref: string; empName: string; profileId: string; expectedProfileName: string }> = [];
  const linkedMismatches: Array<{ txId: string; ref: string; empName: string; linkedProfileName: string; expectedProfileName: string | null }> = [];
  const unmappedStats = new Map<string, { count: number; amount: number }>();

  transactions.forEach((tx) => {
    const rawName = tx.employee_name || '';
    let normalized = normalizeName(rawName);
    if (NAME_OVERRIDES[normalized]) {
      normalized = NAME_OVERRIDES[normalized];
    }

    const expectedProfile = profileMap.get(normalized) || null;
    const actualProfileId = tx.profile_id;

    if (actualProfileId) {
      const actualProfile = idToProfile.get(actualProfileId);
      if (!actualProfile) {
        // Linked to a profile ID that doesn't exist in profiles table
        linkedMismatches.push({
          txId: tx.id,
          ref: tx.reference_no,
          empName: rawName,
          linkedProfileName: `UNKNOWN (ID: ${actualProfileId})`,
          expectedProfileName: expectedProfile ? expectedProfile.name : null,
        });
        falsePositives++;
      } else {
        // Verify if it matches expected profile
        const isMatch = expectedProfile && expectedProfile.id === actualProfileId;
        
        // Double check if there's any other alias matching
        let matchesAlias = false;
        if (!isMatch) {
          const actualNormName = normalizeName(actualProfile.name);
          if (normalized === actualNormName) {
            matchesAlias = true;
          } else if (actualProfile.wess_names) {
           matchesAlias = (actualProfile.wess_names as string[]).some((alias: string) => normalizeName(alias) === normalized);
          }
        }

        if (isMatch || matchesAlias) {
          linkedCorrectly++;
        } else {
          linkedMismatches.push({
            txId: tx.id,
            ref: tx.reference_no,
            empName: rawName,
            linkedProfileName: actualProfile.name,
            expectedProfileName: expectedProfile ? expectedProfile.name : null,
          });
          falsePositives++;
        }
      }
    } else {
      // actualProfileId is null
      if (expectedProfile) {
        // Should have been linked!
        unlinkedMismatches.push({
          txId: tx.id,
          ref: tx.reference_no,
          empName: rawName,
          profileId: expectedProfile.id,
          expectedProfileName: expectedProfile.name,
        });
        falseNegatives++;
      } else {
        // Truly unmapped (no profile exists in system)
        unlinkedAndNoProfile++;
        const stats = unmappedStats.get(rawName) || { count: 0, amount: 0 };
        stats.count++;
        stats.amount += tx.amount || 0;
        unmappedStats.set(rawName, stats);
      }
    }
  });

  // Print results
  console.log('--- AUDIT RESULTS SUMMARY ---');
  console.log(`Total Transactions: ${transactions.length}`);
  console.log(`Correctly Linked:   ${linkedCorrectly}`);
  console.log(`False Positives:    ${falsePositives} (linked to wrong profile)`);
  console.log(`False Negatives:    ${falseNegatives} (should be linked but IS NULL)`);
  console.log(`Unlinked (No Acc):  ${unlinkedAndNoProfile} (rightly unlinked - no stylist profile exists)`);
  console.log('-----------------------------\n');

  if (falsePositives > 0) {
    console.warn(`[WARNING] Found ${falsePositives} false positives:`);
    linkedMismatches.slice(0, 10).forEach((m) => {
      console.warn(`  - Tx ${m.ref} (${m.empName}): linked to ${m.linkedProfileName}, expected ${m.expectedProfileName || 'None'}`);
    });
    if (linkedMismatches.length > 10) console.warn(`  ... and ${linkedMismatches.length - 10} more.`);
  } else {
    console.log('[OK] No false positive links found.');
  }

  if (falseNegatives > 0) {
    console.warn(`[WARNING] Found ${falseNegatives} false negatives (transactions that should be linked but are null):`);
    unlinkedMismatches.slice(0, 10).forEach((m) => {
      console.warn(`  - Tx ${m.ref} (${m.empName}): expected profile ${m.expectedProfileName}`);
    });
    if (unlinkedMismatches.length > 10) console.warn(`  ... and ${unlinkedMismatches.length - 10} more.`);
  } else {
    console.log('[OK] No false negative links found.');
  }

  // Sorted unmapped employee names
  console.log('\nTop Unmapped Employee Names by transaction count:');
  const sortedUnmapped = Array.from(unmappedStats.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count);

  sortedUnmapped.slice(0, 15).forEach((item) => {
    console.log(`  - ${item.name}: ${item.count} transactions (Total Sales: RM ${item.amount.toFixed(2)})`);
  });

  // Generate markdown report
  const reportPath = path.resolve(process.cwd(), 'scripts/audit-report.md');
  let mdContent = `# Data Mapping Audit Report\n\n`;
  mdContent += `Generated at: ${new Date().toISOString()}\n\n`;
  mdContent += `## Summary Metrics\n\n`;
  mdContent += `| Metric | Count | Description |\n`;
  mdContent += `| :--- | :--- | :--- |\n`;
  mdContent += `| **Total Transactions** | ${transactions.length} | Total transaction rows in database |\n`;
  mdContent += `| **Correctly Linked** | ${linkedCorrectly} | Successfully matched to active stylist profile |\n`;
  mdContent += `| **False Positives** | ${falsePositives} | Mismatched links (linked to wrong account) |\n`;
  mdContent += `| **False Negatives** | ${falseNegatives} | Missing links (should be linked but is null) |\n`;
  mdContent += `| **Unlinked (No Account)** | ${unlinkedAndNoProfile} | Transactions without a registered profile in database |\n\n`;

  if (falsePositives > 0) {
    mdContent += `## Mismatched Mappings (False Positives)\n\n`;
    linkedMismatches.forEach((m) => {
      mdContent += `- **Ref ${m.ref}**: Raw name \`${m.empName}\` is linked to profile \`${m.linkedProfileName}\` but expected \`${m.expectedProfileName || 'None'}\`.\n`;
    });
    mdContent += `\n`;
  }

  if (falseNegatives > 0) {
    mdContent += `## Missing Mappings (False Negatives)\n\n`;
    unlinkedMismatches.forEach((m) => {
      mdContent += `- **Ref ${m.ref}**: Raw name \`${m.empName}\` is unlinked but matches profile \`${m.expectedProfileName}\`.\n`;
    });
    mdContent += `\n`;
  }

  mdContent += `## Unmapped Employees (Profiles Not Created Yet)\n\n`;
  mdContent += `The following stylists/assistants are present in the CSV transactions but do not have an active profile account. Create accounts for them in Team Manager to link these transactions:\n\n`;
  mdContent += `| Employee Name | Transaction Count | Total Sales |\n`;
  mdContent += `| :--- | :--- | :--- |\n`;
  sortedUnmapped.forEach((item) => {
    mdContent += `| \`${item.name}\` | ${item.count} | RM ${item.amount.toFixed(2)} |\n`;
  });

  fs.writeFileSync(reportPath, mdContent, 'utf8');
  console.log(`\nWritten markdown report to: ${reportPath}`);
}

audit();
