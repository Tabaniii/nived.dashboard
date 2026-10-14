import { describe, it, expect } from 'vitest';
import { buildCardSlug, cardPublicUrl, slugify } from '@/lib/slug';

describe('slug helpers', () => {
  it('slugifies store names', () => {
    expect(slugify('Kopi Senja Utama')).toBe('kopi-senja-utama');
  });

  it('builds card slug with sequence', () => {
    expect(buildCardSlug('Kopi Senja', 1)).toBe('kopi-senja-01');
    expect(buildCardSlug('Kopi Senja', 12)).toBe('kopi-senja-12');
  });

  it('builds public card URLs from the configured staging origin', () => {
    expect(cardPublicUrl('kopi-senja-01', 'https://staging.nived.id/')).toBe(
      'https://staging.nived.id/r/kopi-senja-01'
    );
  });

  it('resolves base URL defaulting to https://nived.studio or configured APP_URL', () => {
    const original = process.env.NEXT_PUBLIC_APP_URL;
    try {
      delete process.env.NEXT_PUBLIC_APP_URL;
      expect(cardPublicUrl('kopi-senja-01')).toBe('https://nived.studio/r/kopi-senja-01');

      process.env.NEXT_PUBLIC_APP_URL = 'https://dashboard.nived.studio/';
      expect(cardPublicUrl('kopi-senja-01')).toBe('https://dashboard.nived.studio/r/kopi-senja-01');
    } finally {
      if (original) {
        process.env.NEXT_PUBLIC_APP_URL = original;
      } else {
        delete process.env.NEXT_PUBLIC_APP_URL;
      }
    }
  });
});
