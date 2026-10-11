import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { getAdminOverview } from '@/app/(admin)/admin/queries';

export const instant = false;

export async function GET() {
  const session = await requireRole('admin');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const overview = await getAdminOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error('[api/admin/overview]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
