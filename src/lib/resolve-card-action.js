/**
 * Pure server-side decision for GET /r/[slug].
 * Keeps missing-card handling out of UI components. Every active card renders
 * the slug rating UI so customers can submit 1-5 stars without leaving it.
 *
 * @param {Object|null} card
 * @returns {{ type: 'fallback' } | { type: 'shield_ui', card: Object }}
 */
export function resolveCardAction(card) {
  if (!card) {
    return { type: 'fallback' };
  }

  return { type: 'shield_ui', card };
}
