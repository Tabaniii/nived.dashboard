import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { listTelemetry } from '@/app/(admin)/admin/queries';

export const instant = false;

export async function GET(request) {
  const session = await requireRole('admin');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') || 200), 1000);

  try {
    const data = await listTelemetry({ limit });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[api/admin/telemetry]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
