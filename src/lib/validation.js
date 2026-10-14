/**
 * UUID v4 format regex.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate whether a string is a valid UUID format.
 *
 * @param {string} str
 * @returns {boolean}
 */
export function isValidUUID(str) {
  if (typeof str !== 'string') return false;
  return UUID_REGEX.test(str.trim());
}

/**
 * Validate rating range.
 *
 * @param {number|string} rating
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function isValidRating(rating, min = 1, max = 5) {
  if (typeof rating !== 'number' && typeof rating !== 'string') return false;
  if (typeof rating === 'string' && !rating.trim()) return false;
  const num = Number(rating);
  return Number.isInteger(num) && num >= min && num <= max;
}

/**
 * Sanitize user-provided text:
 * - Truncates to max allowed characters (default 2000)
 * - Removes non-printable / control characters except newline and tab
 * - Trims excess whitespace
 *
 * @param {string} [text='']
 * @param {number} [maxLength=2000]
 * @returns {string}
 */
export function sanitizeText(text = '', maxLength = 2000) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove ASCII control characters
    .trim()
    .slice(0, maxLength);
}
