import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const instant = false;

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Sets session cookies via Supabase SSR client.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email dan password wajib diisi.' },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, merchant_id, is_active, merchants(status)')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile?.is_active || !['admin', 'client'].includes(profile?.role)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'Akun tidak memiliki akses dashboard. Staf POS harus masuk melalui halaman login POS.' },
      { status: 403 }
    );
  }

  if (profile.role === 'client' && profile.merchants?.status === 'suspended') {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'Akses merchant ditangguhkan. Hubungi Nived.' },
      { status: 403 }
    );
  }

  const redirectTo = profile.role === 'admin' ? '/admin' : '/dashboard';

  return NextResponse.json({
    success: true,
    role: profile.role,
    redirectTo,
  });
}
