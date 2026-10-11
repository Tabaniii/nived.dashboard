import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export const instant = false;

export async function GET() {
  const session = await getSessionProfile();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  let merchant = null;
  if (session.profile.merchant_id) {
    const { data } = await supabase
      .from('merchants')
      .select('id, business_name, status')
      .eq('id', session.profile.merchant_id)
      .maybeSingle();
    merchant = data;
  }

  return NextResponse.json({
    user: { id: session.user.id, email: session.user.email },
    profile: session.profile,
    merchant,
  });
}
