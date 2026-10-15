import { resolveActiveCardMode } from '@/lib/card-mode';
import { sanitizeReviewUrl } from '@/lib/validation';

/**
 * Pure server-side decision for GET /r/[slug].
 * Smart modes (promo page / redirect) take precedence while active.
 * Direct Mode redirects immediately (307) to Google Review URL.
 * Shield Mode renders the rating component. Missing/inactive cards fall back.
 *
 * @param {Object|null} card
 * @param {{ now?: Date, forceReview?: boolean }} [options]
 * @returns {{ type: 'fallback' }
 *   | { type: 'mode_redirect', url: string, status: 307 }
 *   | { type: 'promo', card: Object }
 *   | { type: 'direct_redirect', url: string, status: 307 }
 *   | { type: 'shield_ui', card: Object }}
 */
export function resolveCardAction(card, { now = new Date(), forceReview = false } = {}) {
  if (!card || card.deleted_at) {
    return { type: 'fallback' };
  }

  if (!forceReview) {
    const mode = resolveActiveCardMode(card, now);
    if (mode === 'redirect') {
      return {
        type: 'mode_redirect',
        url: sanitizeReviewUrl(card.promo_url),
        status: 307,
      };
    }
    if (mode === 'promo') {
      return { type: 'promo', card };
    }
  }

  if (!card.is_shield_active) {
    return {
      type: 'direct_redirect',
      url: card.google_review_url,
      status: 307,
    };
  }

  return { type: 'shield_ui', card };
}
