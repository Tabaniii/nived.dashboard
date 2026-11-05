'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isValidUUID, sanitizeReviewUrl } from '@/lib/validation';
import { getGoogleReviewLink } from '@/lib/customer-feedback';
import { normalizePhoneNumber } from '@/lib/whatsapp';
import { parseAlertSettingsInput } from '@/lib/card-settings';
import { isMissingSchemaError } from '@/lib/db-errors';
import { createAlertThrottle, resolveWeeklySummaryTargets } from '@/lib/alerts';
import { sendNotification } from '@/lib/notify';
import { getBaseUrl } from '@/lib/url';
import { buildWeeklySummaryMessage } from '@/lib/insights/message';
import { generateAndStoreSummary } from '@/lib/insights/store';
import { DASHBOARD_STORE_COOKIE, getClientContext } from './queries';

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

async function getMutationContext(storeId) {
  const ctx = await getClientContext();
  return ctx?.merchant && ctx.merchant.id === storeId ? ctx : null;
}

export async function selectDashboardStoreAction(_previousState, formData) {
  const ctx = await getClientContext();
  if (ctx?.profile.dashboard_role !== 'superadmin') return { error: 'Akses ditolak.' };

  const storeId = formData instanceof FormData ? formData.get('store_id') : null;
  if (!isValidUUID(storeId)) return { error: 'Pilih toko yang valid.' };

  const supabase = await createClient();
  const { data, error } = await supabase.from('merchants')
    .select('id')
    .eq('id', storeId.trim())
    .maybeSingle();
  if (error || !data) return { error: 'Toko tidak ditemukan.' };

  (await cookies()).set(DASHBOARD_STORE_COOKIE, data.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  revalidatePath('/dashboard', 'layout');
  return { success: true };
}

/**
 * @param {FormData} formData
 * @param {string} storeId
 */
export async function updateCardSettingsAction(formData, storeId) {
  const ctx = await getMutationContext(storeId);
  if (!ctx) {
    return { error: 'Unauthorized' };
  }

  const cardId = String(formData.get('card_id') || '').trim();
  const rawGoogleReviewUrl = String(formData.get('google_review_url') || '').trim();
  const whatsappNumber = normalizePhoneNumber(String(formData.get('whatsapp_number') || ''));
  const storeName = String(formData.get('store_name') || '').trim();
  const rawLogoUrl = String(formData.get('logo_url') || '').trim();
  const logoUrl = rawLogoUrl ? sanitizeReviewUrl(rawLogoUrl) : null;

  if (!isValidUUID(cardId)) {
    return { error: 'Kartu wajib dipilih.' };
  }

  const googleReviewUrl = getGoogleReviewLink(rawGoogleReviewUrl);
  if (formData.has('google_review_url') && !googleReviewUrl) {
    return { error: 'Google Review URL harus berupa URL yang valid (contoh: https://g.page/r/.../review).' };
  }
  if (rawLogoUrl && (!logoUrl || !logoUrl.startsWith('https://'))) {
    return { error: 'URL logo harus memakai HTTPS.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cards')
    .update({
      ...(formData.has('google_review_url') ? { google_review_url: googleReviewUrl } : {}),
      ...(formData.has('whatsapp_number') ? { whatsapp_number: whatsappNumber || null } : {}),
      ...(formData.has('logo_url') ? { logo_url: logoUrl } : {}),
      ...(storeName ? { store_name: storeName } : {}),
    })
    .eq('id', cardId)
    .eq('merchant_id', ctx.merchant.id)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }
  if (!data) return { error: 'Kartu tidak ditemukan.' };

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/review-link');
  return { success: true };
}

export async function updateStoreReviewLinkAction(formData, storeId) {
  const ctx = await getMutationContext(storeId);
  if (!ctx) return { error: 'Unauthorized' };

  const reviewUrl = getGoogleReviewLink(formData.get('google_review_url'));
  if (!reviewUrl) return { error: 'Gunakan link ulasan Google Business Profile, seperti https://g.page/r/.../review.' };

  const supabase = await createClient();
  const { data, error } = await supabase.from('cards')
    .update({ google_review_url: reviewUrl })
    .eq('merchant_id', ctx.merchant.id)
    .is('deleted_at', null)
    .select('id');
  if (error) return { error: error.message };
  if (!data?.length) return { error: 'Belum ada kartu NFC untuk toko ini.' };

  revalidatePath('/dashboard/review-link');
  revalidatePath('/dashboard/settings');
  revalidatePath('/r/[slug]', 'page');
  return { success: true };
}

/**
 * @param {FormData} formData
 */
export async function updateAlertSettingsAction(formData, storeId) {
  const ctx = await getMutationContext(storeId);
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
    .eq('merchant_id', ctx.merchant.id)
    .is('deleted_at', null)
    .select('id');

  if (error) return { error: isMissingSchemaError(error) ? MIGRATION_HINT : error.message };
  if (!data?.length) return { error: 'Kartu tidak ditemukan.' };

  revalidatePath('/dashboard/settings');
  return { success: true };
}

/**
 * Send a sample weekly briefing to the card's configured channels.
 * @param {string} cardId
 */
export async function sendTestAlertAction(cardId, storeId) {
  const ctx = await getMutationContext(storeId);
  if (!ctx) return { error: 'Unauthorized' };

  const supabase = await createClient();
  const { data: card, error } = await supabase
    .from('cards')
    .select('id, is_active, alerts_enabled, alert_whatsapp, alert_telegram_chat_id')
    .eq('id', String(cardId || ''))
    .eq('merchant_id', ctx.merchant.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !card?.is_active) return { error: 'Kartu aktif tidak ditemukan.' };

  const targets = resolveWeeklySummaryTargets(card);
  if (!targets.whatsapp && !targets.telegramChatId) {
    return {
      error:
        card.alerts_enabled !== true
          ? 'Pengiriman ringkasan untuk kartu ini sedang dimatikan.'
          : 'Isi nomor WhatsApp atau Chat ID Telegram dulu, lalu simpan.',
    };
  }

  if (!testAlertThrottle.allow(card.id, ctx.user.id)) {
    return { error: 'Tunggu 20 detik sebelum mengirim tes lagi.' };
  }

  const message = `[TES] ${buildWeeklySummaryMessage({
    businessName: ctx.merchant.business_name,
    summary: {
      feedback_count: 4,
      summary: 'Beberapa pelanggan menunggu lebih lama saat makan siang. Kopi susu mendapat pujian. Minggu depan, tambahkan satu staf di jam makan siang.',
    },
    dashboardUrl: `${getBaseUrl()}/dashboard/reviews-feedback`,
  })}`;

  const results = await sendNotification({
    whatsapp: targets.whatsapp,
    telegramChatId: targets.telegramChatId,
    message,
  });

  return {
    success: results.delivered,
    error: results.delivered ? undefined : 'Pesan tes belum terkirim. Cek detail setiap kanal di bawah.',
    results: {
      whatsapp: channelResult(results.whatsapp),
      telegram: channelResult(results.telegram),
    },
  };
}

/**
 * Regenerate the weekly AI summary on demand.
 */
export async function refreshWeeklySummaryAction(storeId) {
  const ctx = await getMutationContext(storeId);
  if (!ctx) return { error: 'Unauthorized' };

  if (!summaryRefreshThrottle.allow(ctx.merchant.id, 'refresh')) {
    return { error: 'Ringkasan baru saja diperbarui. Coba lagi dalam 1 menit.' };
  }

  try {
    const report = await generateAndStoreSummary(ctx.merchant.id, {
      includeSuspended: ctx.profile.dashboard_role === 'superadmin',
    });
    if (!report) return { error: 'Unauthorized' };

    revalidatePath('/dashboard/reviews-feedback');
    return { success: true, summary: report.summary, source: report.source };
  } catch (err) {
    console.error('[dashboard] Weekly summary refresh failed:', err?.code || err?.name);
    return { error: isMissingSchemaError(err)
      ? 'Jalankan migrasi Reputation & Feedback Hub untuk membuat ringkasan mingguan.'
      : 'Gagal membuat ringkasan. Coba lagi nanti.' };
  }
}

export async function updateFeedbackResolutionAction(id, resolved, storeId) {
  const ctx = await getMutationContext(storeId);
  if (!ctx || !isValidUUID(id) || typeof resolved !== 'boolean') {
    return { success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from('customer_feedback')
    .update({ resolved_status: resolved })
    .eq('id', id.trim())
    .eq('store_id', ctx.merchant.id)
    .select('id')
    .maybeSingle();

  if (error || !data) return { success: false };
  revalidatePath('/dashboard/reviews-feedback');
  return { success: true };
}
