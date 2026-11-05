import { getCardById } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { FEEDBACK_CATEGORIES, resolveTableNumber } from '@/lib/customer-feedback';
import { isValidUUID, sanitizeText } from '@/lib/validation';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const { card_id, category, feedback_text, customer_contact, table_number } = body || {};
  const feedbackText = sanitizeText(feedback_text);
  const contact = sanitizeText(customer_contact, 30);
  if (!isValidUUID(card_id) || !feedbackText) {
    return Response.json({ error: 'Kartu dan isi masukan wajib diisi.' }, { status: 400 });
  }
  if (!FEEDBACK_CATEGORIES.includes(category)) {
    return Response.json({ error: 'Kategori masukan tidak valid.' }, { status: 400 });
  }
  if (contact && (!/^\+?[\d ().-]+$/.test(contact) || contact.replace(/\D/g, '').length < 6)) {
    return Response.json({ error: 'Nomor telepon atau WhatsApp tidak valid.' }, { status: 400 });
  }

  try {
    const card = await getCardById(card_id.trim());
    if (!card?.merchant_id || card.is_active === false || card.deleted_at) {
      return Response.json({ error: 'Toko untuk kartu ini tidak tersedia.' }, { status: 404 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from('customer_feedback').insert({
      store_id: card.merchant_id,
      table_number: resolveTableNumber(card.slug, table_number),
      category,
      feedback_text: feedbackText,
      customer_contact: contact || null,
    });
    if (error) throw error;
    return Response.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[api/feedback] Insert failed:', error?.code);
    return Response.json({ error: 'Masukan belum terkirim. Silakan coba lagi.' }, { status: 500 });
  }
}
