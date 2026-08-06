'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Database } from '@/types/database.types';
import { normalizeName, parseWessConnectCsv } from './utils/csv-parser';

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

    // 2. Read files from FormData safely filtering by File instances
    const rawFiles = formData.getAll('files');
    const files = rawFiles.filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return { error: 'No valid files provided.' };
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

    // 4. Parse file-by-file delegating parser rules to utils/csv-parser.ts
    for (const file of files) {
      let csvText = await file.text();
      // Remove UTF-8 BOM if present
      if (csvText.startsWith('\ufeff')) {
        csvText = csvText.slice(1);
      }

      // Scope refCounts per file so ticket sequence indices (_1, _2) remain deterministic
      const refCounts = new Map<string, number>();

      const parseResult = parseWessConnectCsv(
        csvText,
        file.name,
        profileMap,
        refCounts,
        unmappedEmployeeMap
      );

      transactionsToInsert.push(...parseResult.transactions);

      filesProcessed.push({
        name: file.name,
        insertedCount: parseResult.insertedCount,
        branchDetected: Array.from(parseResult.branchesDetected).join(', ') || 'Bangsar',
      });
    }

    if (transactionsToInsert.length === 0) {
      return { success: true, insertedCount: 0, filesProcessed, unmappedEmployees: [] };
    }

    // 5. Deduplicate in-memory by reference_no before upserting into public.transactions
    const txMap = new Map<string, Database['public']['Tables']['transactions']['Insert']>();
    for (const tx of transactionsToInsert) {
      const existing = txMap.get(tx.reference_no);
      if (!existing) {
        txMap.set(tx.reference_no, tx);
      } else {
        // If current tx has deduction or amount while existing has 0, keep the one with values
        const txDed = tx.deduction ?? 0;
        const txAmt = tx.amount ?? 0;
        const exDed = existing.deduction ?? 0;
        const exAmt = existing.amount ?? 0;
        if ((txDed > 0 && exDed === 0) || (txAmt > 0 && exAmt === 0)) {
          txMap.set(tx.reference_no, tx);
        }
      }
    }
    const finalTransactions = Array.from(txMap.values());

    // 6. Upsert into public.transactions (onConflict 'reference_no') in chunks of 300 to avoid limits/timeouts
    const chunkSize = 300;
    for (let i = 0; i < finalTransactions.length; i += chunkSize) {
      const chunk = finalTransactions.slice(i, i + chunkSize);
      const { error: insertError } = await adminClient
        .from('transactions')
        .upsert(chunk, { onConflict: 'reference_no' });

      if (insertError) {
        return { error: `Failed to insert transactions chunk starting at index ${i}: ${insertError.message}` };
      }
    }

    // 7. Perform DB cleanup to purge any duplicate records
    await deduplicateDatabaseTransactionsAction();

    // Convert map to array of objects
    const unmappedEmployees = Array.from(unmappedEmployeeMap.entries()).map(([name, count]) => ({
      name,
      count,
    })).sort((a, b) => b.count - a.count);

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return {
      success: true,
      insertedCount: finalTransactions.length,
      filesProcessed,
      unmappedEmployees,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message || 'An unexpected error occurred during import.' };
  }
}

/**
 * Server Action: Audits and removes duplicate transaction records in the database.
 * Duplicates are defined as transactions sharing the exact same employee_name,
 * transaction_date, branch, customer_name, item_description, amount, and deduction.
 */
export async function deduplicateDatabaseTransactionsAction(): Promise<{
  success?: boolean;
  removedCount?: number;
  error?: string;
}> {
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
      return { error: 'Unauthorized: Only admins can deduplicate transactions.' };
    }

    const adminClient = createAdminClient();

    // Fetch all transactions
    const { data: transactions, error: fetchError } = await adminClient
      .from('transactions')
      .select('id, employee_name, transaction_date, branch, customer_name, item_description, amount, deduction, reference_no, created_at');

    if (fetchError || !transactions) {
      return { error: `Failed to fetch transactions for deduplication: ${fetchError?.message}` };
    }

    // Group transactions by signature
    const groups = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      const signature = `${tx.transaction_date}_${tx.branch}_${tx.employee_name}_${tx.customer_name}_${tx.item_description}_${tx.amount}_${tx.deduction}`;
      const list = groups.get(signature) || [];
      list.push(tx);
      groups.set(signature, list);
    }

    const idsToDelete: string[] = [];
    for (const [, list] of groups.entries()) {
      if (list.length > 1) {
        // Sort to prioritize keeping records with standard reference numbers over ESD_ prefixed ones
        list.sort((a, b) => {
          const aIsEsd = a.reference_no.startsWith('ESD_') ? 1 : 0;
          const bIsEsd = b.reference_no.startsWith('ESD_') ? 1 : 0;
          if (aIsEsd !== bIsEsd) return aIsEsd - bIsEsd; // non-ESD first
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); // older first
        });

        // Keep list[0], mark rest for deletion
        for (let i = 1; i < list.length; i++) {
          idsToDelete.push(list[i].id);
        }
      }
    }

    if (idsToDelete.length === 0) {
      return { success: true, removedCount: 0 };
    }

    // Delete in chunks of 500
    const chunkSize = 500;
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
      const chunk = idsToDelete.slice(i, i + chunkSize);
      const { error: deleteError } = await adminClient
        .from('transactions')
        .delete()
        .in('id', chunk);

      if (deleteError) {
        return { error: `Failed to delete duplicate batch starting at index ${i}: ${deleteError.message}` };
      }
    }

    revalidatePath('/admin');
    revalidatePath('/dashboard');
    return { success: true, removedCount: idsToDelete.length };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message || 'An unexpected error occurred during deduplication.' };
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message || 'An unexpected error occurred while clearing transactions.' };
  }
}

/**
 * Server Action: Updates or inserts the sales targets for a specific year and its departments.
 * Only callable by authenticated admin users.
 */
export async function updateYearlyTargetAction(
  year: number,
  targets: {
    TOTAL: number;
    HAIR: number;
    NAILS: number;
    ARTISTRY_LASH: number;
  }
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

    const rows = [
      { year, department: 'TOTAL', target_amount: targets.TOTAL },
      { year, department: 'HAIR', target_amount: targets.HAIR },
      { year, department: 'NAILS', target_amount: targets.NAILS },
      { year, department: 'ARTISTRY_LASH', target_amount: targets.ARTISTRY_LASH },
    ];

    const { error } = await supabase
      .from('targets')
      .upsert(rows, { onConflict: 'year,department' });

    if (error) {
      return { error: `Failed to update target: ${error.message}` };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message || 'An unexpected error occurred.' };
  }
}
