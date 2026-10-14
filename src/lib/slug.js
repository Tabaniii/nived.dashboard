import { getBaseUrl } from './url';

export { getBaseUrl };

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
  if (explicitBaseUrl) {
    const normalized = explicitBaseUrl.replace(/\/$/, '');
    try {
      const parsed = new URL(normalized);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('App URL must use http or https.');
      }
      return normalized;
    } catch {
      return normalized;
    }
  }

  return getBaseUrl();
}

/**
 * @param {string} slug
 * @param {string} [baseUrl]
 */
export function cardPublicUrl(slug, baseUrl) {
  return `${getAppBaseUrl(baseUrl)}/r/${slug}`;
}
