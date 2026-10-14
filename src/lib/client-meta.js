/**
 * Extract client IP and User-Agent from a Headers-like object
 * (Next.js `headers()` or Fetch API Request.headers).
 *
 * @param {Headers} headerList
 * @returns {{ clientIp: string, userAgent: string }}
 */
export function getClientMeta(headerList) {
  const userAgent = headerList.get('user-agent') || '';
  const referrer = headerList.get('referer') || headerList.get('referrer') || '';
  const forwarded = headerList.get('x-forwarded-for');
  const clientIp =
    (forwarded ? forwarded.split(',')[0]?.trim() : '') ||
    headerList.get('x-real-ip') ||
    '';

  return { clientIp, userAgent, referrer };
}
