/**
 * Pure server-side decision for GET /r/[slug].
 * Keeps Direct Mode / Shield Mode / Fallback branching out of UI components.
 *
 * @param {Object|null} card
 * @returns {{ type: 'fallback' } | { type: 'direct_redirect', url: string, status: 307 } | { type: 'shield_ui', card: Object }}
 */
export function resolveCardAction(card) {
  if (!card) {
    return { type: 'fallback' };
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
