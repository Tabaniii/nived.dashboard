/**
 * @param {string} input
 * @returns {string}
 */
export function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * @param {string} storeName
 * @param {number} [seq=1]
 */
export function buildCardSlug(storeName, seq = 1) {
  const base = slugify(storeName) || 'card';
  const suffix = String(seq).padStart(2, '0');
  return `${base}-${suffix}`;
}

export function getAppBaseUrl() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';
  return base.replace(/\/$/, '');
}

/**
 * @param {string} slug
 */
export function cardPublicUrl(slug) {
  return `${getAppBaseUrl()}/r/${slug}`;
}
