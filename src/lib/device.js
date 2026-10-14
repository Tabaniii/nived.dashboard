/**
 * Parse raw user-agent header into categorized device:
 * 'iOS', 'Android', 'Desktop', or 'Other'.
 *
 * @param {string} [userAgent='']
 * @returns {'iOS' | 'Android' | 'Desktop' | 'Other'}
 */
export function parseDeviceCategory(userAgent = '') {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'Other';
  }
  const ua = userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'iOS';
  }
  if (/android/.test(ua)) {
    return 'Android';
  }
  if (/windows nt|macintosh|mac os x|cros|x11|linux/.test(ua) && !/mobile|tablet/.test(ua)) {
    return 'Desktop';
  }
  return 'Other';
}

/**
 * Parse raw user-agent header into normalized device OS category:
 * 'iOS', 'Android', or 'Other' (or 'Desktop' when includeDesktop option is enabled).
 *
 * @param {string} [userAgent='']
 * @param {{ includeDesktop?: boolean }} [options]
 * @returns {'iOS' | 'Android' | 'Desktop' | 'Other'}
 */
export function parseDeviceOS(userAgent = '', options = {}) {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'Other';
  }
  const category = parseDeviceCategory(userAgent);
  if (options && options.includeDesktop) {
    return category;
  }
  return category === 'Desktop' ? 'Other' : category;
}
