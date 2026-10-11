import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const instant = false;

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ success: true });
}
