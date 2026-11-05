import { describe, it, expect } from 'vitest';
import { resolveCardAction } from '@/lib/resolve-card-action';

describe('resolveCardAction', () => {
  it.each([
    null,
    { slug: 'old-card', deleted_at: '2026-10-01T00:00:00.000Z' },
    { slug: 'inactive-card', is_active: false },
  ])('returns the fallback for an unavailable card', (card) => {
    expect(resolveCardAction(card)).toEqual({ type: 'fallback' });
  });

  it.each([true, false])('shows the same choices with legacy shield value %s', (legacyShield) => {
    const card = {
      slug: 'example-card',
      is_shield_active: legacyShield,
      google_review_url: 'https://search.google.com/local/writereview?placeid=example',
    };

    expect(resolveCardAction(card)).toEqual({ type: 'choice', mode: 'review' });
  });
});
