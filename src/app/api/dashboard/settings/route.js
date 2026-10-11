import { NextResponse } from 'next/server';
import { updateCardSettingsAction } from '@/app/(dashboard)/dashboard/actions';
import { getClientContext, getClientCards } from '@/app/(dashboard)/dashboard/queries';

export const instant = false;

export async function GET() {
  const ctx = await getClientContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cards = await getClientCards(ctx.profile.merchant_id);
    return NextResponse.json({ cards });
  } catch (error) {
    console.error('[api/dashboard/settings GET]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

/**
 * Body JSON: { card_id, google_review_url, whatsapp_number?, store_name? }
 */
export async function PATCH(request) {
  const ctx = await getClientContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const formData = new FormData();
  formData.set('card_id', String(body?.card_id || ''));
  formData.set('google_review_url', String(body?.google_review_url || ''));
  if (body?.whatsapp_number != null) {
    formData.set('whatsapp_number', String(body.whatsapp_number));
  }
  if (body?.store_name != null) {
    formData.set('store_name', String(body.store_name));
  }

  const result = await updateCardSettingsAction(formData);
  if (result?.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
