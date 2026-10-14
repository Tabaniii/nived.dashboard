import { describe, it, expect } from 'vitest';
import { resolveCardAction } from '@/lib/resolve-card-action';

describe('resolveCardAction', () => {
  it('returns fallback when card is missing', () => {
    expect(resolveCardAction(null)).toEqual({ type: 'fallback' });
  });

  it('keeps inactive-shield cards on the slug rating flow', () => {
    const card = {
      id: 'a23deb4d-4b7d-4bad-9bdd-2b0d7b3dcb6e',
      slug: 'direct-card',
      is_shield_active: false,
      google_review_url: 'https://maps.app.goo.gl/direct-review',
    };

    expect(resolveCardAction(card)).toEqual({ type: 'shield_ui', card });
  });

  it('returns shield_ui when shield is active', () => {
    const card = {
      id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
      slug: 'demo-card',
      is_shield_active: true,
      google_review_url: 'https://maps.app.goo.gl/demo-review',
    };

    expect(resolveCardAction(card)).toEqual({ type: 'shield_ui', card });
  });
});
