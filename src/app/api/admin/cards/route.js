import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { listCards } from '@/app/(admin)/admin/queries';
import { provisionCardAction } from '@/app/(admin)/admin/actions';

export const instant = false;

export async function GET() {
  const session = await requireRole('admin');
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cards = await listCards();
    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[api/admin/cards GET]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * Body JSON:
 * { merchant_id, store_name, google_review_url, whatsapp_number?, is_shield_active? }
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
  formData.set('merchant_id', String(body?.merchant_id || ''));
  formData.set('store_name', String(body?.store_name || ''));
  formData.set('google_review_url', String(body?.google_review_url || ''));
  if (body?.whatsapp_number != null) {
    formData.set('whatsapp_number', String(body.whatsapp_number));
  }
  formData.set(
    'is_shield_active',
    body?.is_shield_active === false || body?.is_shield_active === 'false'
      ? 'false'
      : 'true'
  );

  const result = await provisionCardAction(formData, new URL(request.url).origin);
  if (result?.error) {
    const status = result.error === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
