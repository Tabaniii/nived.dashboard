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

export function getAppBaseUrl(explicitBaseUrl) {
  const base =
    explicitBaseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (typeof window !== 'undefined' ? window.location.origin : null);

  if (!base) {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000';
    }

    throw new Error(
      'Missing NEXT_PUBLIC_APP_URL. Set it to the staging or production origin before provisioning cards.'
    );
  }

  const normalized = base.replace(/\/$/, '');
  const parsed = new URL(normalized);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('App URL must use http or https.');
  }

  return normalized;
}

/**
 * @param {string} slug
 * @param {string} [baseUrl]
 */
export function cardPublicUrl(slug, baseUrl) {
  return `${getAppBaseUrl(baseUrl)}/r/${slug}`;
}
