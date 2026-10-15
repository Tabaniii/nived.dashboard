import { parseDeviceOS } from './device';
import { shouldLogTap, hashIp } from './debounce';
import { createTapLog } from './db';

/**
 * Perform asynchronous, non-blocking tap logging.
 *
 * @param {Object} params
 * @param {string} params.card_id
 * @param {string} params.device_os
 * @param {string} params.user_agent
 * @param {string} [params.ip_hash]
 * @param {number} [params.selected_stars]
 * @param {string|null} [params.staff_code]
 * @param {string|null} [params.table_code]
 * @returns {Promise<Object|null>}
 */
export async function logTapAsync({
  card_id,
  device_os,
  user_agent,
  ip_hash,
  selected_stars = null,
  staff_code = null,
  table_code = null,
}) {
  return createTapLog({
    card_id,
    device_os,
    user_agent,
    ip_hash,
    selected_stars,
    staff_code,
    table_code,
  }).catch((err) => {
    console.error('[logger] Failed to asynchronously record tap log:', err);
    return null;
  });
}

/**
 * Build a debounced tap-log promise (or null if suppressed).
 * Prefer scheduling the returned promise with Next.js `after()` so the write
 * can finish after the response is sent without delaying TTFB.
 *
 * @param {Object} params
 * @param {string} params.cardId
 * @param {string} [params.clientIp='']
 * @param {string} [params.userAgent='']
 * @param {string} [params.referrer='']
 * @param {number} [params.selectedStars]
 * @param {string|null} [params.staffCode]
 * @param {string|null} [params.tableCode]
 * @returns {Promise<Object|null>|null}
 */
export function queueTapTelemetry({
  cardId,
  clientIp = '',
  userAgent = '',
  referrer = '',
  selectedStars = null,
  staffCode = null,
  tableCode = null,
}) {
  if (!shouldLogTap(cardId, clientIp, userAgent, { referrer })) {
    return null; // Suppressed by < 5-second anti-spam debounce
  }

  const os = parseDeviceOS(userAgent, { includeDesktop: true });
  const ipHash = hashIp(clientIp);

  return logTapAsync({
    card_id: cardId,
    device_os: os,
    user_agent: userAgent,
    ip_hash: ipHash,
    selected_stars: selectedStars,
    staff_code: staffCode,
    table_code: tableCode,
  });
}

/**
 * Handle incoming physical tap telemetry with anti-spam debouncing.
 * Non-blocking fire-and-forget: does not block the caller or delay response rendering.
 *
 * @param {Object} params
 * @param {string} params.cardId
 * @param {string} [params.clientIp='']
 * @param {string} [params.userAgent='']
 * @param {string} [params.referrer='']
 * @param {number} [params.selectedStars]
 * @param {string|null} [params.staffCode]
 * @param {string|null} [params.tableCode]
 * @returns {boolean} true if tap was accepted and queued for logging, false if debounced
 */
export function handleTapTelemetry({
  cardId,
  clientIp = '',
  userAgent = '',
  referrer = '',
  selectedStars = null,
  staffCode = null,
  tableCode = null,
}) {
  const pending = queueTapTelemetry({
    cardId,
    clientIp,
    userAgent,
    referrer,
    selectedStars,
    staffCode,
    tableCode,
  });

  if (!pending) {
    return false;
  }

  pending.catch((err) => {
    console.error('[logger] Error in fire-and-forget telemetry:', err);
  });

  return true;
}
