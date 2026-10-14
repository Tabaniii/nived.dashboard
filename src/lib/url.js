/**
 * Centralized Base URL & NFC Link Resolver
 *
 * Guarantees all NFC slugs and QR codes use the custom domain (nived.studio)
 * or the configured NEXT_PUBLIC_APP_URL, preventing unexpected fallback to .vercel.app.
 */

/**
 * Resolves the application base URL from environment variables or defaults to https://nived.studio.
 *
 * @returns {string}
 */
export const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  return 'https://nived.studio';
};

/**
 * Builds the canonical public URL for an NFC card slug.
 *
 * @param {string} slug
 * @param {string} [baseUrl]
 * @returns {string}
 */
export const getCardPublicUrl = (slug, baseUrl) => {
  const base = baseUrl ? baseUrl.replace(/\/$/, '') : getBaseUrl();
  return `${base}/r/${slug}`;
};
