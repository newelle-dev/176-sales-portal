'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type ActionState = {
  error?: string;
};

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
    redirect('/stylist');
  }
}
