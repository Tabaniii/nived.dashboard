'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/session';
import { buildCardSlug, cardPublicUrl } from '@/lib/slug';
import { generateTempPassword } from '@/lib/password';
import { sanitizeReviewUrl } from '@/lib/validation';
import { normalizePhoneNumber } from '@/lib/whatsapp';

async function assertAdmin() {
  const session = await requireRole('admin');
  if (!session) {
    return { error: 'Unauthorized' };
  }
  return { session };
}

/**
 * Create merchant + client auth user with temporary password.
 * @param {FormData} formData
 */
export async function provisionMerchantAction(formData) {
  const auth = await assertAdmin();
  if (auth.error) return auth;
  const admin = createAdminClient();

  const businessName = String(formData.get('business_name') || '').trim();
  const ownerName = String(formData.get('owner_name') || '').trim();
  const contact = normalizePhoneNumber(String(formData.get('contact') || '')) || null;
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const status = String(formData.get('status') || 'trial');
  const customPassword = String(formData.get('password') || '').trim();

  if (!businessName || !ownerName || !email) {
    return { error: 'Nama toko, pemilik, dan email wajib diisi.' };
  }

  const password = customPassword || generateTempPassword();

  const { data: merchant, error: merchantError } = await admin
    .from('merchants')
    .insert({
      business_name: businessName,
      owner_name: ownerName,
      contact,
      status: ['trial', 'active', 'suspended'].includes(status) ? status : 'trial',
    })
    .select()
    .single();

  if (merchantError) {
    return { error: merchantError.message };
  }

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: ownerName },
    app_metadata: { role: 'client', merchant_id: merchant.id },
  });

  if (userError) {
    await admin.from('merchants').delete().eq('id', merchant.id);
    return { error: userError.message };
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: userData.user.id,
    email,
    role: 'client',
    full_name: ownerName,
    merchant_id: merchant.id,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/merchants');

  return {
    success: true,
    merchant,
    credentials: { email, password },
  };
}

/**
 * @param {FormData} formData
 * @param {string} [baseUrl]
 */
export async function provisionCardAction(formData, baseUrl) {
  const auth = await assertAdmin();
  if (auth.error) return auth;
  const admin = createAdminClient();

  const merchantId = String(formData.get('merchant_id') || '').trim();
  const storeName = String(formData.get('store_name') || '').trim();
  const rawGoogleReviewUrl = String(formData.get('google_review_url') || '').trim();
  const whatsappNumber = normalizePhoneNumber(String(formData.get('whatsapp_number') || ''));
  const isShieldActive = formData.get('is_shield_active') !== 'false';

  if (!merchantId || !storeName || !rawGoogleReviewUrl) {
    return { error: 'Merchant, nama toko, dan Google Review URL wajib.' };
  }

  const googleReviewUrl = sanitizeReviewUrl(rawGoogleReviewUrl);
  if (!googleReviewUrl) {
    return { error: 'Google Review URL harus berupa URL yang valid (contoh: https://g.page/r/.../review).' };
  }

  const { count } = await admin
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId);

  let seq = (count || 0) + 1;
  let slug = buildCardSlug(storeName, seq);
  let attempts = 0;

  while (attempts < 20) {
    const { data: existing } = await admin
      .from('cards')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    seq += 1;
    slug = buildCardSlug(storeName, seq);
    attempts += 1;
  }

  const { data: card, error } = await admin
    .from('cards')
    .insert({
      merchant_id: merchantId,
      slug,
      store_name: storeName,
      google_review_url: googleReviewUrl,
      whatsapp_number: whatsappNumber || null,
      is_shield_active: isShieldActive,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/cards');

  return {
    success: true,
    card,
    publicUrl: cardPublicUrl(card.slug),
  };
}

/**
 * @param {string} cardId
 * @param {boolean} isShieldActive
 */
export async function toggleShieldAction(cardId, isShieldActive) {
  const auth = await assertAdmin();
  if (auth.error) return auth;
  const admin = createAdminClient();

  const { error } = await admin
    .from('cards')
    .update({ is_shield_active: isShieldActive })
    .eq('id', cardId);

  if (error) return { error: error.message };

  revalidatePath('/admin/cards');
  return { success: true };
}

/**
 * @param {string} merchantId
 * @param {'trial'|'active'|'suspended'} status
 */
export async function updateMerchantStatusAction(merchantId, status) {
  const auth = await assertAdmin();
  if (auth.error) return auth;
  const admin = createAdminClient();

  if (!['trial', 'active', 'suspended'].includes(status)) {
    return { error: 'Status tidak valid.' };
  }

  const { error } = await admin
    .from('merchants')
    .update({ status })
    .eq('id', merchantId);

  if (error) return { error: error.message };

  revalidatePath('/admin/merchants');
  return { success: true };
}

/**
 * Soft-delete a card.
 * @param {string} cardId
 */
export async function softDeleteCardAction(cardId) {
  const auth = await assertAdmin();
  if (auth.error) return auth;
  const admin = createAdminClient();

  const { error } = await admin
    .from('cards')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', cardId);

  if (error) return { error: error.message };

  revalidatePath('/admin/cards');
  return { success: true };
}
