'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type ActionState = {
  error?: string;
};

/**
 * Authenticates a user via username/password and redirects based on role.
 *
 * @param prevState - Previous action state (for useActionState compatibility).
 * @param formData  - FormData containing: username, password.
 * @returns ActionState with an `error` message on failure, or redirects on success.
 */
export async function loginAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const usernameRaw = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!usernameRaw || !password) {
    return { error: 'Username and password are required.' };
  }

  const username = usernameRaw.trim().toLowerCase();

  // Look up the email associated with the username using adminClient (bypasses RLS)
  const adminClient = createAdminClient();
  const { data: profile, error: lookupError } = await adminClient
    .from('profiles')
    .select('email')
    .eq('username', username)
    .single();

  if (lookupError || !profile) {
    return { error: 'Incorrect username or password. Please try again.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (error) {
    // Check for common error messages and make them user friendly
    let errorMessage = error.message;
    if (error.message === 'Invalid login credentials') {
      errorMessage = 'Incorrect username or password. Please try again.';
    }
    return { error: errorMessage };
  }

  const role = data.user?.app_metadata?.role;

  if (role === 'admin') {
    redirect('/admin');
  } else {
    redirect('/dashboard');
  }
}

/** Signs out the current user and redirects to the login page. */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Re-authenticates the user with their current password and updates it to the new password.
 * Logs the user out on success to force re-login.
 */
export async function changePasswordAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All fields are required.' };
  }

  if (newPassword.length < 8) {
    return { error: 'New password must be at least 8 characters long.' };
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { error: 'Not authenticated.' };
  }

  // Re-authenticate user to verify current password
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (verifyError) {
    return { error: 'Incorrect current password. Please try again.' };
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return { error: updateError.message };
  }

  // Log out and redirect
  await supabase.auth.signOut();
  redirect('/login');
}

