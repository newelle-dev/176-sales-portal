'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionState = {
  success?: boolean;
  error?: string;
};

/**
 * Creates a new stylist account in Supabase Auth and links optional
 * WessConnect CSV name aliases to their profile.
 *
 * @param prevState - Previous action state (for useActionState compatibility).
 * @param formData  - FormData containing: name, email, password, wess_names (comma-separated).
 * @returns ActionState with `success: true` or an `error` message.
 */
export async function createStylistAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: No active session.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage team members.' };
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const wessNamesRaw = formData.get('wess_names') as string;
  const department = (formData.get('department') as string) || null;
  const role = (formData.get('role') as string) || 'stylist';

  if (!name || !email || !password) {
    return { error: 'All fields are required.' };
  }

  if (department && !['HAIR', 'NAILS', 'ARTISTRY_LASH'].includes(department)) {
    return { error: 'Invalid department selected.' };
  }

  if (!['admin', 'stylist'].includes(role)) {
    return { error: 'Invalid role selected.' };
  }

  const wessNamesArray = wessNamesRaw
    ? wessNamesRaw.split(',').map((n) => n.trim().toLowerCase()).filter((n) => n.length > 0)
    : [];

  try {
    const adminClient = createAdminClient();

    // Create the user in auth.users
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role, department },
      email_confirm: true,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      const { error: dbUpdateError } = await adminClient
        .from('profiles')
        .update({ 
          wess_names: wessNamesArray,
          department,
          role
        })
        .eq('id', data.user.id);
      
      if (dbUpdateError) {
        return { error: `Account created, but failed to save CSV matches: ${dbUpdateError.message}` };
      }
    }

    revalidatePath('/admin/team');
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred.' };
  }
}

/**
 * Updates an existing stylist's profile, email, password, role, department,
 * and/or WessConnect CSV name aliases.
 */
export async function updateStylistAction(
  prevState: ActionState | null,
  payload: { id: string; formData: FormData }
): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: No active session.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage team members.' };
  }

  const { id, formData } = payload;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string; // Optional
  const wessNamesRaw = formData.get('wess_names') as string;
  const department = (formData.get('department') as string) || null;
  const role = (formData.get('role') as string) || 'stylist';

  if (!name || !email) {
    return { error: 'Name and email are required.' };
  }

  if (department && !['HAIR', 'NAILS', 'ARTISTRY_LASH'].includes(department)) {
    return { error: 'Invalid department selected.' };
  }

  if (!['admin', 'stylist'].includes(role)) {
    return { error: 'Invalid role selected.' };
  }

  const wessNamesArray = wessNamesRaw
    ? wessNamesRaw.split(',').map((n) => n.trim().toLowerCase()).filter((n) => n.length > 0)
    : [];

  try {
    const adminClient = createAdminClient();

    // Update email, password, and user_metadata in auth
    const updateData: { email?: string; password?: string; user_metadata?: { name: string; role: string; department: string | null } } = {};
    if (password && password.trim() !== '') {
      updateData.password = password.trim();
    }

    // Check current email in profiles
    const { data: profile, error: fetchError } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError) {
      return { error: fetchError.message };
    }

    if (profile.email !== email) {
      updateData.email = email;
    }

    // Always keep Auth metadata synced
    updateData.user_metadata = { name, role, department };

    const { error: authError } = await adminClient.auth.admin.updateUserById(id, updateData);
    if (authError) {
      return { error: authError.message };
    }

    // If email was updated in auth, update profiles as well
    if (updateData.email) {
      const { error: dbEmailError } = await adminClient
        .from('profiles')
        .update({ email })
        .eq('id', id);
      if (dbEmailError) {
        return { error: dbEmailError.message };
      }
    }

    // Update name, role, department and wess_names in profiles
    const { error: nameError } = await adminClient
      .from('profiles')
      .update({ name, role, department, wess_names: wessNamesArray })
      .eq('id', id);

    if (nameError) {
      return { error: nameError.message };
    }

    revalidatePath('/admin/team');
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred.' };
  }
}

/**
 * Permanently deletes a stylist from Supabase Auth. The cascade-on-delete
 * constraint will also remove their `profiles` row. Transactions linked
 * via `profile_id` will have that column set to NULL (ON DELETE SET NULL).
 *
 * @param id - The UUID of the stylist to delete.
 * @returns ActionState with `success: true` or an `error` message.
 */
export async function deleteStylistAction(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: No active session.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage team members.' };
  }

  if (!id) {
    return { error: 'Stylist ID is required.' };
  }

  try {
    const adminClient = createAdminClient();

    // Delete the user from auth.users (will cascade delete the profile)
    const { error } = await adminClient.auth.admin.deleteUser(id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/team');
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : 'An unexpected error occurred.' };
  }
}
