'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type ActionState = {
  error?: string;
};

/**
 * Authenticates a user via email/password and redirects based on role.
 *
 * @param prevState - Previous action state (for useActionState compatibility).
 * @param formData  - FormData containing: email, password.
 * @returns ActionState with an `error` message on failure, or redirects on success.
 */
export async function loginAction(prevState: ActionState | null, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Check for common error messages and make them user friendly
    let errorMessage = error.message;
    if (error.message === 'Invalid login credentials') {
      errorMessage = 'Incorrect email or password. Please try again.';
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
