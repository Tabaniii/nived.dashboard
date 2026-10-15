export const SOCIAL_FORMATS = Object.freeze({
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1080 },
});

const QUOTE_LIMITS = { story: 320, post: 220 };

// Satori fetches emoji glyphs from a CDN at render time; dropping them keeps rendering offline-safe.
const EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}\u{FE0F}\u{200D}\u{20E3}]/gu;

const FONT_STEPS = {
  story: [
    [80, 76],
    [160, 62],
    [240, 52],
    [Infinity, 46],
  ],
  post: [
    [60, 64],
    [120, 52],
    [180, 44],
    [Infinity, 38],
  ],
};

const monthFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  month: 'long',
  year: 'numeric',
});

/**
 * @param {unknown} value
 * @returns {'story'|'post'}
 */
export function resolveSocialFormat(value) {
  return typeof value === 'string' && value.trim().toLowerCase() === 'story' ? 'story' : 'post';
}

/**
 * Normalize a review for the social card and pick a font size that fits.
 *
 * @param {string} text
 * @param {'story'|'post'} [format]
 * @returns {{ text: string, fontSize: number }}
 */
export function prepareQuote(text, format = 'post') {
  const kind = resolveSocialFormat(format);
  const limit = QUOTE_LIMITS[kind];

  let quote = (typeof text === 'string' ? text : '')
    .replace(EMOJI_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["“”']+|["“”']+$/g, '')
    .trim();

  if (quote.length > limit) {
    const slice = quote.slice(0, limit - 1);
    const lastSpace = slice.lastIndexOf(' ');
    const cut = lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice;
    quote = `${cut.replace(/[\s.,;:!?-]+$/, '')}…`;
  }

  const [, fontSize] = FONT_STEPS[kind].find(([maxLength]) => quote.length <= maxLength);
  return { text: quote, fontSize };
}

/**
 * @param {string|Date} value
 * @returns {string} e.g. "Oktober 2026"
 */
export function formatReviewMonth(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : monthFormatter.format(date);
}
