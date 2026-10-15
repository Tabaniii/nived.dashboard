import { CARD_MODES } from '@/lib/card-mode';
import { sanitizeReviewUrl } from '@/lib/validation';
import { normalizePhoneNumber } from '@/lib/whatsapp';
import { sanitizeTelegramChatId } from '@/lib/alerts';

const MAX_MODE_DAYS = 366;
const DAY_MS = 86_400_000;

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function rawString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseModeUntil(value, now) {
  if (!rawString(value)) return { value: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { error: 'Waktu berakhir tidak valid.' };
  if (date.getTime() <= now.getTime()) return { error: 'Waktu berakhir harus di masa depan.' };
  if (date.getTime() - now.getTime() > MAX_MODE_DAYS * DAY_MS) {
    return { error: 'Waktu berakhir maksimal 1 tahun dari sekarang.' };
  }
  return { value: date.toISOString() };
}

/**
 * Validate the Smart Mode form. Switching to review keeps the saved promo
 * content so the owner can re-enable it later.
 *
 * @param {Record<string, unknown>} input
 * @param {Date} [now]
 * @returns {{ ok: true, values: Object } | { ok: false, error: string }}
 */
export function parseCardModeInput(input = {}, now = new Date()) {
  const mode = rawString(input.card_mode);
  if (!CARD_MODES.includes(mode)) return { ok: false, error: 'Mode kartu tidak valid.' };
  if (mode === 'review') return { ok: true, values: { card_mode: 'review', mode_until: null } };

  const until = parseModeUntil(input.mode_until, now);
  if (until.error) return { ok: false, error: until.error };

  const rawUrl = rawString(input.promo_url);
  const promoUrl = rawUrl ? sanitizeReviewUrl(rawUrl) : null;

  if (mode === 'redirect') {
    if (!promoUrl) return { ok: false, error: 'Link tujuan wajib berupa URL http(s) yang valid.' };
    return { ok: true, values: { card_mode: 'redirect', promo_url: promoUrl, mode_until: until.value } };
  }

  const title = cleanText(input.promo_title, 120);
  if (!title) return { ok: false, error: 'Judul promo wajib diisi.' };
  if (rawUrl && !promoUrl) return { ok: false, error: 'Link tombol promo harus URL http(s) yang valid.' };

  const rawImage = rawString(input.promo_image_url);
  const imageUrl = rawImage ? sanitizeReviewUrl(rawImage) : null;
  if (rawImage && !imageUrl) return { ok: false, error: 'URL gambar promo tidak valid.' };

  return {
    ok: true,
    values: {
      card_mode: 'promo',
      promo_title: title,
      promo_message: cleanText(input.promo_message, 1000),
      promo_cta_label: cleanText(input.promo_cta_label, 60),
      promo_url: promoUrl,
      promo_image_url: imageUrl,
      mode_until: until.value,
    },
  };
}

/**
 * Validate the low-rating alert form. Empty fields mean "use the defaults"
 * (store WhatsApp number, no Telegram).
 *
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, values: Object } | { ok: false, error: string }}
 */
export function parseAlertSettingsInput(input = {}) {
  const enabled = input.alerts_enabled;
  const alertsEnabled = enabled === true || enabled === 'on' || enabled === 'true';

  const rawWhatsapp = rawString(input.alert_whatsapp);
  let alertWhatsapp = null;
  if (rawWhatsapp) {
    alertWhatsapp = normalizePhoneNumber(rawWhatsapp);
    if (alertWhatsapp.length < 10 || alertWhatsapp.length > 15) {
      return { ok: false, error: 'Nomor WhatsApp alert tidak valid (contoh: 081234567890).' };
    }
  }

  const rawChatId = rawString(input.alert_telegram_chat_id);
  let chatId = null;
  if (rawChatId) {
    chatId = sanitizeTelegramChatId(rawChatId);
    if (!chatId) {
      return {
        ok: false,
        error: 'Chat ID Telegram tidak valid. Gunakan angka (mis. 123456789 atau -100…) atau @namachannel.',
      };
    }
  }

  return {
    ok: true,
    values: {
      alerts_enabled: alertsEnabled,
      alert_whatsapp: alertWhatsapp,
      alert_telegram_chat_id: chatId,
    },
  };
}
