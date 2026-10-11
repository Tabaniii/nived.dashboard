'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Email atau password salah.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, merchant_id, merchants(status)')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { error: 'Profil tidak ditemukan. Hubungi Nived.' };
  }

  if (profile.role === 'client') {
    const status = profile.merchants?.status;
    if (status === 'suspended') {
      await supabase.auth.signOut();
      return { error: 'Akses merchant ditangguhkan. Hubungi Nived.' };
    }
    redirect('/dashboard');
  }

  redirect('/admin');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
