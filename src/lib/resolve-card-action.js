import { resolveActiveCardMode } from '@/lib/card-mode';

/** Every active card renders the same public review and private feedback choices. */
export function resolveCardAction(card, { now = new Date() } = {}) {
  if (!card || card.deleted_at || card.is_active === false) return { type: 'fallback' };
  return { type: 'choice', mode: resolveActiveCardMode(card, now) };
}
