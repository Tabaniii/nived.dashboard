import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { signInToPortal } from '@/lib/auth/portal';

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
  const result = await signInToPortal(supabase, {
    email,
    password,
    requestedPath: body?.redirect,
  });

  if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ success: true, role: result.role, redirectTo: result.redirectTo });
}
