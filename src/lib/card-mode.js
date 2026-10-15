import { sanitizeReviewUrl } from '@/lib/validation';

export const CARD_MODES = Object.freeze(['review', 'promo', 'redirect']);

const HOUR_MS = 3_600_000;
const WIB_OFFSET_MS = 7 * HOUR_MS;
const DURATION_MS = { '3h': 3 * HOUR_MS, '24h': 24 * HOUR_MS, '7d': 7 * 24 * HOUR_MS };

/**
 * Turn a dashboard duration preset into the `mode_until` timestamp.
 *
 * @param {'none'|'today'|'3h'|'24h'|'7d'|'custom'|string} preset
 * @param {string} [customValue] date string, used when preset is 'custom'
 * @param {Date} [now]
 * @returns {string|null} ISO timestamp, or null for no end time / invalid input
 */
export function computeModeUntil(preset, customValue = '', now = new Date()) {
  if (preset === 'today') {
    const wib = new Date(now.getTime() + WIB_OFFSET_MS);
    return new Date(
      Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate(), 23, 59) - WIB_OFFSET_MS
    ).toISOString();
  }
  if (DURATION_MS[preset]) return new Date(now.getTime() + DURATION_MS[preset]).toISOString();
  if (preset === 'custom' && customValue) {
    const date = new Date(customValue);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {Object|null} card
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isModeExpired(card, now = new Date()) {
  if (!card?.mode_until) return false;
  const until = new Date(card.mode_until);
  if (Number.isNaN(until.getTime())) return false;
  return now.getTime() >= until.getTime();
}

/**
 * Which experience the NFC link should currently open. Incomplete or expired
 * promo/redirect configurations always fall back to the review flow.
 *
 * @param {Object|null} card
 * @param {Date} [now]
 * @returns {'review'|'promo'|'redirect'}
 */
export function resolveActiveCardMode(card, now = new Date()) {
  const mode = card?.card_mode;
  if (mode !== 'promo' && mode !== 'redirect') return 'review';
  if (isModeExpired(card, now)) return 'review';

  if (mode === 'redirect') {
    return sanitizeReviewUrl(card.promo_url || '') ? 'redirect' : 'review';
  }

  return hasText(card.promo_title) || hasText(card.promo_message) ? 'promo' : 'review';
}
