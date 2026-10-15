export const STAFF_CODE_MAX = 40;
export const TABLE_CODE_MAX = 20;

const STAFF_PARAM_KEYS = ['staff', 's'];
const TABLE_PARAM_KEYS = ['meja', 'table', 't'];

function stripDiacritics(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function toCode(value, { allowed, maxLength, transform }) {
  if (typeof value !== 'string') return null;
  const code = transform(stripDiacritics(value))
    .replace(allowed, '')
    .trim()
    .replace(/[\s-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, maxLength)
    .replace(/[-_]+$/g, '');
  return code || null;
}

/**
 * Normalize a staff identifier from a card URL (?staff=Andi → "andi").
 * @param {unknown} value
 * @returns {string|null}
 */
export function sanitizeStaffCode(value) {
  return toCode(value, {
    allowed: /[^a-z0-9_\s-]/g,
    maxLength: STAFF_CODE_MAX,
    transform: (v) => v.toLowerCase(),
  });
}

/**
 * Normalize a table identifier from a card URL (?meja=a12 → "A12").
 * @param {unknown} value
 * @returns {string|null}
 */
export function sanitizeTableCode(value) {
  return toCode(value, {
    allowed: /[^A-Z0-9\s-]/g,
    maxLength: TABLE_CODE_MAX,
    transform: (v) => v.toUpperCase(),
  });
}

function readParam(params, keys) {
  if (!params) return undefined;
  for (const key of keys) {
    let value = typeof params.get === 'function' ? params.get(key) : params[key];
    if (Array.isArray(value)) value = value[0];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
}

/**
 * Read staff/table attribution from URLSearchParams or a Next.js searchParams object.
 * @param {URLSearchParams|Record<string, string|string[]|undefined>|undefined} params
 * @returns {{ staffCode: string|null, tableCode: string|null }}
 */
export function parseAttribution(params) {
  return {
    staffCode: sanitizeStaffCode(readParam(params, STAFF_PARAM_KEYS)),
    tableCode: sanitizeTableCode(readParam(params, TABLE_PARAM_KEYS)),
  };
}

/**
 * Append sanitized ?staff= / ?meja= params to a public card URL.
 * @param {string} baseUrl
 * @param {{ staff?: string, table?: string }} [attribution]
 * @returns {string}
 */
export function buildAttributedUrl(baseUrl, { staff, table } = {}) {
  const staffCode = sanitizeStaffCode(staff);
  const tableCode = sanitizeTableCode(table);
  if (!staffCode && !tableCode) return baseUrl;

  const query = new URLSearchParams();
  if (staffCode) query.set('staff', staffCode);
  if (tableCode) query.set('meja', tableCode);
  return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${query.toString()}`;
}
