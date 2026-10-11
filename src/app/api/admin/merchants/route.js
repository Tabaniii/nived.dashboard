import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { listMerchants } from '@/app/(admin)/admin/queries';
import { provisionMerchantAction } from '@/app/(admin)/admin/actions';

export const instant = false;

export async function GET() {
  const session = await requireRole('admin');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const merchants = await listMerchants();
    return NextResponse.json({ merchants });
  } catch (error) {
    console.error('[api/admin/merchants GET]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * Body JSON:
 * { business_name, owner_name, contact?, email, password?, status? }
 */
export async function POST(request) {
  const session = await requireRole('admin');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const formData = new FormData();
  for (const key of [
    'business_name',
    'owner_name',
    'contact',
    'email',
    'password',
    'status',
  ]) {
    if (body?.[key] != null) formData.set(key, String(body[key]));
  }

  const result = await provisionMerchantAction(formData);
  if (result?.error) {
    const status = result.error === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
