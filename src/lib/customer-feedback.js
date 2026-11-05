import { sanitizeTableCode } from './attribution';
import { sanitizeReviewUrl } from './validation';

export const FEEDBACK_CATEGORIES = [
  'Rasa Makanan / Minuman',
  'Kecepatan Pelayanan',
  'Kebersihan',
  'Suasana / Fasilitas',
  'Lainnya',
];

export function resolveTableNumber(slug, tableCode) {
  const slugTable = /(?:^|-)(?:meja|table)-?([a-z]*\d[a-z0-9]*(?:-[a-z][a-z0-9]*)?)$/i.exec(slug)?.[1];
  const sequence = /(?:^|-)(\d+)$/.exec(slug)?.[1];
  // A dedicated table slug identifies the stand, while shared links can supply ?meja=.
  return sanitizeTableCode(slugTable) || sanitizeTableCode(tableCode) || sanitizeTableCode(sequence);
}

export function getGoogleReviewLink(value) {
  const sanitized = sanitizeReviewUrl(value);
  if (!sanitized) return null;
  const url = new URL(sanitized);
  if (url.protocol !== 'https:' || url.port) return null;

  if (url.hostname === 'search.google.com' && url.pathname === '/local/writereview') {
    const placeId = url.searchParams.get('placeid');
    if (!placeId || !/^[\w-]+$/.test(placeId)) return null;
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }

  // Existing merchants can keep Google's Business Profile review short links.
  if (url.hostname === 'g.page' && /^\/(?:r\/)?[\w-]+\/review\/?$/.test(url.pathname)) {
    return `https://g.page${url.pathname}`;
  }
  return null;
}

function resolveSavedGoogleReviewUrl(value) {
  const directLink = getGoogleReviewLink(value);
  if (directLink) return directLink;

  // Previously provisioned cards can still open saved Google Maps short links.
  const sanitized = sanitizeReviewUrl(value);
  if (!sanitized) return null;
  const url = new URL(sanitized);
  if (url.protocol !== 'https:' || url.port) return null;
  if (url.hostname === 'maps.app.goo.gl' && /^\/[\w-]+\/?$/.test(url.pathname)) return sanitized;
  if (url.hostname === 'goo.gl' && /^\/maps\/[\w-]+\/?$/.test(url.pathname)) return sanitized;
  return null;
}

export function getSavedGoogleReviewDestination(card) {
  return resolveSavedGoogleReviewUrl(card.google_review_url) || resolveSavedGoogleReviewUrl(card.target_url);
}
