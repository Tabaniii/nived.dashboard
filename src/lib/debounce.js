import crypto from 'crypto';

/**
 * In-memory sliding cache for physical tap rate-limiting.
 * Maps composite key -> lastTapTimestamp (ms).
 * @type {Map<string, number>}
 */
const tapDebounceMap = new Map();

/**
 * Window threshold in milliseconds.
 * Repeated taps within 5 seconds (< 5000ms) are suppressed.
 */
export const DEBOUNCE_WINDOW_MS = 5000;

/**
 * Generate a SHA-256 hash of the client IP for anonymization.
 *
 * @param {string} [clientIp='']
 * @returns {string} 64-character hex string
 */
export function hashIp(clientIp = '') {
  if (!clientIp) return '';
  return crypto.createHash('sha256').update(String(clientIp).trim()).digest('hex');
}

/**
 * Determine whether a physical tap should be logged or dropped as duplicate spam.
 * Drops requests with matching (cardId + clientIp + userAgent) within < 5000ms.
 *
 * @param {string} cardId
 * @param {string} clientIp
 * @param {string} userAgent
 * @param {number|{ customNow?: number, referrer?: string }} [customNowOrOptions] Optional timestamp override or options
 * @returns {boolean} true if tap should be logged, false if debounced
 */
export function shouldLogTap(cardId, clientIp, userAgent, customNowOrOptions) {
  if (!cardId) return false;

  let customNow;
  let referrer = '';
  if (typeof customNowOrOptions === 'number') {
    customNow = customNowOrOptions;
  } else if (customNowOrOptions && typeof customNowOrOptions === 'object') {
    customNow = customNowOrOptions.customNow;
    referrer = customNowOrOptions.referrer || '';
  }

  const ip = clientIp || 'unknown-ip';
  const ua = userAgent || 'unknown-ua';
  const refKey = referrer ? `:${referrer}` : '';
  const key = `${cardId}:${ip}:${ua}${refKey}`;
  const now = typeof customNow === 'number' ? customNow : Date.now();

  const lastTap = tapDebounceMap.get(key);

  if (lastTap !== undefined && now - lastTap < DEBOUNCE_WINDOW_MS) {
    return false; // Debounced / ignore duplicate
  }

  tapDebounceMap.set(key, now);

  // Periodic pruning of stale entries older than 2x debounce window to prevent memory leaks
  if (tapDebounceMap.size > 1000) {
    for (const [k, timestamp] of tapDebounceMap.entries()) {
      if (now - timestamp > DEBOUNCE_WINDOW_MS * 2) {
        tapDebounceMap.delete(k);
      }
    }
  }

  return true;
}

/**
 * Clear the debounce cache (primarily used in automated tests).
 */
export function resetDebounceCache() {
  tapDebounceMap.clear();
}
