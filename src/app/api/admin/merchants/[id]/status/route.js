import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { updateMerchantStatusAction } from '@/app/(admin)/admin/actions';

export const instant = false;

export async function PATCH(request, { params }) {
  const session = await requireRole('admin');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const result = await updateMerchantStatusAction(id, body?.status);
  if (result?.error) {
    const status = result.error === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ success: true });
}
