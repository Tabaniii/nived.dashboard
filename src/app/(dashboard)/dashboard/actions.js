'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sanitizeReviewUrl } from '@/lib/validation';
import { normalizePhoneNumber } from '@/lib/whatsapp';
import { getClientContext } from './queries';

/**
 * @param {FormData} formData
 */
export async function updateCardSettingsAction(formData) {
  const ctx = await getClientContext();
  if (!ctx) {
    return { error: 'Unauthorized' };
  }

  const cardId = String(formData.get('card_id') || '').trim();
  const rawGoogleReviewUrl = String(formData.get('google_review_url') || '').trim();
  const whatsappNumber = normalizePhoneNumber(String(formData.get('whatsapp_number') || ''));
  const storeName = String(formData.get('store_name') || '').trim();

  if (!cardId || !rawGoogleReviewUrl) {
    return { error: 'Card dan Google Review URL wajib.' };
  }

  const googleReviewUrl = sanitizeReviewUrl(rawGoogleReviewUrl);
  if (!googleReviewUrl) {
    return { error: 'Google Review URL harus berupa URL yang valid (contoh: https://g.page/r/.../review).' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('cards')
    .update({
      google_review_url: googleReviewUrl,
      whatsapp_number: whatsappNumber || null,
      ...(storeName ? { store_name: storeName } : {}),
    })
    .eq('id', cardId)
    .eq('merchant_id', ctx.profile.merchant_id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}
