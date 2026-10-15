import { normalizePhoneNumber } from '@/lib/whatsapp';
import { sendNotification } from '@/lib/notify';
import { markFeedbackAlertSent } from '@/lib/db';
import { getBaseUrl } from '@/lib/url';
import { runAfterResponse } from '@/lib/after-response';

export const LOW_RATING_MAX = 3;
const ALERT_TEXT_MAX = 500;

const alertTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * @param {number} rating
 * @returns {boolean}
 */
export function isLowRating(rating) {
  return Number.isInteger(rating) && rating >= 1 && rating <= LOW_RATING_MAX;
}

/**
 * Accepts numeric chat ids (users, groups: -100…) or public @channel usernames.
 * @param {unknown} value
 * @returns {string|null}
 */
export function sanitizeTelegramChatId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (/^-?\d{5,20}$/.test(trimmed)) return trimmed;
  if (/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(trimmed)) return trimmed;
  return null;
}

function sanitizeAlertPhone(value) {
  const digits = normalizePhoneNumber(typeof value === 'string' ? value : '');
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/**
 * Alerts default to enabled so cards created before the migration still notify.
 * @param {Object|null} card
 * @returns {{ whatsapp: string|null, telegramChatId: string|null }}
 */
export function resolveAlertTargets(card) {
  if (!card || card.alerts_enabled === false) {
    return { whatsapp: null, telegramChatId: null };
  }
  return {
    whatsapp: sanitizeAlertPhone(card.alert_whatsapp) || sanitizeAlertPhone(card.whatsapp_number),
    telegramChatId: sanitizeTelegramChatId(card.alert_telegram_chat_id),
  };
}

/**
 * Unique alert recipients across a merchant's cards, used for the weekly digest.
 * @param {Object[]} cards
 * @returns {{ whatsapp: string[], telegram: string[] }}
 */
export function collectDigestTargets(cards = []) {
  const whatsapp = new Set();
  const telegram = new Set();
  for (const card of cards) {
    const targets = resolveAlertTargets(card);
    if (targets.whatsapp) whatsapp.add(targets.whatsapp);
    if (targets.telegramChatId) telegram.add(targets.telegramChatId);
  }
  return { whatsapp: [...whatsapp], telegram: [...telegram] };
}

function formatAlertTime(createdAt) {
  const date = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${alertTimeFormatter.format(date)} WIB`;
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Plain-text body shared by WhatsApp and Telegram.
 */
export function buildLowRatingAlertMessage({
  storeName,
  rating,
  feedbackText,
  tableCode,
  staffCode,
  customerWhatsapp,
  createdAt,
  dashboardUrl,
}) {
  const stars = Math.min(5, Math.max(0, Math.round(Number(rating) || 0)));
  const lines = [
    `⚠️ Rating ${stars}/5 masuk — ${storeName || 'Toko'}`,
    `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)} · ${formatAlertTime(createdAt)}`,
  ];

  const location = [tableCode ? `Meja ${tableCode}` : null, staffCode ? `Staf: ${staffCode}` : null]
    .filter(Boolean)
    .join(' · ');
  if (location) lines.push(`📍 ${location}`);

  const text = typeof feedbackText === 'string' ? feedbackText.trim() : '';
  lines.push('', text ? `💬 "${truncate(text, ALERT_TEXT_MAX)}"` : '💬 (tanpa catatan tertulis)');

  const customer = sanitizeAlertPhone(customerWhatsapp);
  if (customer) lines.push(`📱 Pelanggan: wa.me/${customer}`);

  lines.push('', 'Segera hampiri atau hubungi pelanggan sebelum mereka pulang.');
  if (dashboardUrl) lines.push(`Dashboard: ${dashboardUrl}`);

  return lines.join('\n');
}

/**
 * Best-effort in-memory spam guard (per serverless instance).
 */
export function createAlertThrottle({
  perSourceWindowMs = 60_000,
  perCardLimit = 20,
  perCardWindowMs = 3_600_000,
} = {}) {
  const lastBySource = new Map();
  const historyByCard = new Map();

  return {
    allow(cardId, sourceKey = '', now = Date.now()) {
      const sourceId = `${cardId}:${sourceKey || 'unknown'}`;
      const last = lastBySource.get(sourceId);
      if (last !== undefined && now - last < perSourceWindowMs) return false;

      const recent = (historyByCard.get(cardId) || []).filter((t) => now - t < perCardWindowMs);
      if (recent.length >= perCardLimit) {
        historyByCard.set(cardId, recent);
        return false;
      }

      recent.push(now);
      historyByCard.set(cardId, recent);
      lastBySource.set(sourceId, now);

      if (lastBySource.size > 5000) {
        for (const [key, timestamp] of lastBySource) {
          if (now - timestamp >= perSourceWindowMs) lastBySource.delete(key);
        }
      }
      return true;
    },
    reset() {
      lastBySource.clear();
      historyByCard.clear();
    },
  };
}

const defaultThrottle = createAlertThrottle();

/**
 * Clear the shared alert throttle (primarily used in automated tests).
 */
export function resetAlertThrottle() {
  defaultThrottle.reset();
}

/**
 * Notify the owner about a 1–3★ feedback via WhatsApp (Fonnte) and/or Telegram.
 *
 * @returns {Promise<{ status: 'skipped', reason: string } | { status: 'sent'|'failed', results: Object }>}
 */
export async function dispatchLowRatingAlert({
  card,
  feedback,
  sourceKey = '',
  send = sendNotification,
  markSent = markFeedbackAlertSent,
  throttle = defaultThrottle,
  dashboardUrl = `${getBaseUrl()}/dashboard`,
}) {
  if (!card || !feedback || !isLowRating(Number(feedback.rating))) {
    return { status: 'skipped', reason: 'not_low_rating' };
  }

  const targets = resolveAlertTargets(card);
  if (!targets.whatsapp && !targets.telegramChatId) {
    return { status: 'skipped', reason: 'no_target' };
  }

  if (!throttle.allow(card.id, sourceKey)) {
    return { status: 'skipped', reason: 'throttled' };
  }

  const message = buildLowRatingAlertMessage({
    storeName: card.store_name,
    rating: Number(feedback.rating),
    feedbackText: feedback.feedback_text,
    tableCode: feedback.table_code,
    staffCode: feedback.staff_code,
    customerWhatsapp: feedback.customer_whatsapp,
    createdAt: feedback.created_at,
    dashboardUrl,
  });

  const results = await send({
    whatsapp: targets.whatsapp,
    telegramChatId: targets.telegramChatId,
    message,
  });

  if (!results?.delivered) {
    return { status: 'failed', results };
  }

  try {
    await markSent(feedback.id);
  } catch (err) {
    console.warn('[alerts] Could not mark feedback as alerted:', err);
  }
  return { status: 'sent', results };
}

/**
 * Queue a low-rating alert after the response is sent so customers never wait
 * on WhatsApp/Telegram delivery.
 *
 * @param {{ card: Object, feedback: Object, sourceKey?: string }} params
 * @returns {boolean} true when an alert was queued
 */
export function scheduleLowRatingAlert({ card, feedback, sourceKey = '' }) {
  if (!card || !feedback || !isLowRating(Number(feedback.rating))) return false;

  runAfterResponse(async () => {
    const result = await dispatchLowRatingAlert({ card, feedback, sourceKey });
    if (result.status !== 'failed') return;

    const errors = ['whatsapp', 'telegram']
      .map((channel) => [channel, result.results?.[channel]])
      .filter(([, channelResult]) => channelResult && !channelResult.ok && !channelResult.skipped)
      .map(([channel, channelResult]) => `${channel}: ${channelResult.error}`);
    if (errors.length) {
      console.warn('[alerts] Low-rating alert not delivered:', errors.join('; '));
    }
  });
  return true;
}
