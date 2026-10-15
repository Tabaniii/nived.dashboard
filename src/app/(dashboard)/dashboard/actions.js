'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sanitizeReviewUrl } from '@/lib/validation';
import { normalizePhoneNumber } from '@/lib/whatsapp';
import { parseCardModeInput, parseAlertSettingsInput } from '@/lib/card-settings';
import { isMissingSchemaError } from '@/lib/db-errors';
import { buildLowRatingAlertMessage, createAlertThrottle, resolveAlertTargets } from '@/lib/alerts';
import { sendNotification } from '@/lib/notify';
import { getBaseUrl } from '@/lib/url';
import { generateAndStoreSummary } from '@/lib/insights/store';
import { getClientContext } from './queries';

const MIGRATION_HINT =
  'Fitur ini butuh update database: jalankan supabase/migrations/20261015000000_growth_features.sql di Supabase SQL Editor.';

const testAlertThrottle = createAlertThrottle({ perSourceWindowMs: 20_000 });
const summaryRefreshThrottle = createAlertThrottle({
  perSourceWindowMs: 60_000,
  perCardLimit: 30,
  perCardWindowMs: 86_400_000,
});

function pickFields(formData, keys) {
  return Object.fromEntries(keys.map((key) => [key, formData.get(key) ?? undefined]));
}

function channelResult(result) {
  return { ok: Boolean(result?.ok), skipped: Boolean(result?.skipped), error: result?.error || null };
}

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

/**
 * Smart Mode Switcher: review / promo / redirect on the same NFC link.
 * @param {FormData} formData
 */
export async function updateCardModeAction(formData) {
  const ctx = await getClientContext();
  if (!ctx) return { error: 'Unauthorized' };

  const cardId = String(formData.get('card_id') || '').trim();
  if (!cardId) return { error: 'Kartu wajib dipilih.' };

  const parsed = parseCardModeInput(
    pickFields(formData, [
      'card_mode',
      'promo_title',
      'promo_message',
      'promo_image_url',
      'promo_cta_label',
      'promo_url',
      'mode_until',
    ])
  );
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cards')
    .update(parsed.values)
    .eq('id', cardId)
    .eq('merchant_id', ctx.profile.merchant_id)
    .select('id');

  if (error) return { error: isMissingSchemaError(error) ? MIGRATION_HINT : error.message };
  if (!data?.length) return { error: 'Kartu tidak ditemukan.' };

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/mode');
  return { success: true };
}

/**
 * @param {FormData} formData
 */
export async function updateAlertSettingsAction(formData) {
  const ctx = await getClientContext();
  if (!ctx) return { error: 'Unauthorized' };

  const cardId = String(formData.get('card_id') || '').trim();
  if (!cardId) return { error: 'Kartu wajib dipilih.' };

  const parsed = parseAlertSettingsInput(
    pickFields(formData, ['alerts_enabled', 'alert_whatsapp', 'alert_telegram_chat_id'])
  );
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cards')
    .update(parsed.values)
    .eq('id', cardId)
    .eq('merchant_id', ctx.profile.merchant_id)
    .select('id');

  if (error) return { error: isMissingSchemaError(error) ? MIGRATION_HINT : error.message };
  if (!data?.length) return { error: 'Kartu tidak ditemukan.' };

  revalidatePath('/dashboard/settings');
  return { success: true };
}

/**
 * Send a sample low-rating alert to the card's configured channels.
 * @param {string} cardId
 */
export async function sendTestAlertAction(cardId) {
  const ctx = await getClientContext();
  if (!ctx) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: card, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', String(cardId || ''))
    .eq('merchant_id', ctx.profile.merchant_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !card) return { error: 'Kartu tidak ditemukan.' };

  const targets = resolveAlertTargets(card);
  if (!targets.whatsapp && !targets.telegramChatId) {
    return {
      error:
        card.alerts_enabled === false
          ? 'Alert sedang dimatikan untuk kartu ini.'
          : 'Isi nomor WhatsApp atau Chat ID Telegram dulu, lalu simpan.',
    };
  }

  if (!testAlertThrottle.allow(card.id, ctx.user.id)) {
    return { error: 'Tunggu 20 detik sebelum mengirim tes lagi.' };
  }

  const message = `[TES] ${buildLowRatingAlertMessage({
    storeName: card.store_name,
    rating: 2,
    feedbackText: 'Ini pesan tes dari dashboard Nived. Kalau pesan ini masuk, alert rating 1–3★ sudah aktif.',
    tableCode: '12',
    staffCode: 'tes',
    createdAt: new Date().toISOString(),
    dashboardUrl: `${getBaseUrl()}/dashboard`,
  })}`;

  const results = await sendNotification({
    whatsapp: targets.whatsapp,
    telegramChatId: targets.telegramChatId,
    message,
  });

  return {
    success: results.delivered,
    error: results.delivered ? undefined : 'Alert belum terkirim. Cek detail tiap channel di bawah.',
    results: {
      whatsapp: channelResult(results.whatsapp),
      telegram: channelResult(results.telegram),
    },
  };
}

/**
 * Regenerate the weekly AI summary on demand.
 */
export async function refreshWeeklySummaryAction() {
  const ctx = await getClientContext();
  if (!ctx) return { error: 'Unauthorized' };

  if (!summaryRefreshThrottle.allow(ctx.profile.merchant_id, 'refresh')) {
    return { error: 'Ringkasan baru saja diperbarui. Coba lagi dalam 1 menit.' };
  }

  try {
    await generateAndStoreSummary(ctx.profile.merchant_id);
  } catch (err) {
    console.error('[dashboard] Weekly summary refresh failed:', err);
    return { error: isMissingSchemaError(err) ? MIGRATION_HINT : 'Gagal membuat ringkasan. Coba lagi nanti.' };
  }

  revalidatePath('/dashboard');
  return { success: true };
}
