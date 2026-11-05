'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signInToPortal } from '@/lib/auth/portal';

/**
 * @param {FormData} formData
 */
export async function loginAction(formData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  const supabase = await createClient();
  const result = await signInToPortal(supabase, {
    email,
    password,
    requestedPath: formData.get('redirect'),
  });

  if (result.error) return { error: result.error };
  redirect(result.redirectTo);
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
