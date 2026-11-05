import { NextResponse } from 'next/server';
import { getSessionProfile } from '@/lib/auth/session';
import { getPortalAccess } from '@/lib/auth/portal';
import { createClient } from '@/lib/supabase/server';

export const instant = false;

export async function GET() {
  const session = await getSessionProfile({ includeOutlet: true });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const access = await getPortalAccess(supabase, session.profile);
  if (!access.dashboard && !access.admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    user: { id: session.user.id, email: session.user.email },
    profile: session.profile,
    merchant: access.merchant ?? null,
  });
}
