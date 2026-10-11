import { describe, it, expect } from 'vitest';
import { buildCardSlug, slugify } from '@/lib/slug';

describe('slug helpers', () => {
  it('slugifies store names', () => {
    expect(slugify('Kopi Senja Utama')).toBe('kopi-senja-utama');
  });

  it('builds card slug with sequence', () => {
    expect(buildCardSlug('Kopi Senja', 1)).toBe('kopi-senja-01');
    expect(buildCardSlug('Kopi Senja', 12)).toBe('kopi-senja-12');
  });
});
