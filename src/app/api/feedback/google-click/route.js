import { getCardById } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { getSavedGoogleReviewDestination, resolveTableNumber } from '@/lib/customer-feedback';
import { isValidUUID } from '@/lib/validation';

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!isValidUUID(body?.card_id)) return new Response(null, { status: 400 });

  try {
    const card = await getCardById(body.card_id.trim());
    if (!card?.merchant_id || card.is_active === false || card.deleted_at || !getSavedGoogleReviewDestination(card)) {
      return new Response(null, { status: 404 });
    }
    const supabase = await createClient();
    const { error } = await supabase.from('review_click_events').insert({
      store_id: card.merchant_id,
      table_number: resolveTableNumber(card.slug, body.table_number),
    });
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[google-click] Insert failed:', error?.code);
    return new Response(null, { status: 500 });
  }
}
