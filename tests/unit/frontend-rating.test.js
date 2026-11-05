import { describe, expect, it } from 'vitest';
import {
  getGoogleReviewLink,
  getSavedGoogleReviewDestination,
  resolveTableNumber,
} from '@/lib/customer-feedback';
import { getStoreInitials } from '@/lib/store-initials';

describe('Table tap helpers', () => {
  it('generates store initials for the missing-logo fallback', () => {
    expect(getStoreInitials('Kopi Senja Utama')).toBe('KS');
    expect(getStoreInitials('Starbucks')).toBe('ST');
    expect(getStoreInitials('')).toBe('RT');
  });

  it('prefers the table identified by a dedicated slug', () => {
    expect(resolveTableNumber('kopi-senja-meja-12', '03')).toBe('12');
    expect(resolveTableNumber('table-a12-b')).toBe('A12-B');
  });

  it('supports explicit table attribution and numeric suffixes on shared NFC cards', () => {
    expect(resolveTableNumber('kopi-senja-01', 'vip 2')).toBe('VIP-2');
    expect(resolveTableNumber('kopi-senja-01')).toBe('01');
    expect(resolveTableNumber('old-card')).toBeNull();
  });
});

describe('Google review destinations', () => {
  it('normalizes Google review intents and accepts direct Google review share links', () => {
    expect(getGoogleReviewLink('https://search.google.com/local/writereview?placeid=ChIJabc&source=nfc'))
      .toBe('https://search.google.com/local/writereview?placeid=ChIJabc');
    expect(getGoogleReviewLink('https://g.page/r/Example/review')).toBe('https://g.page/r/Example/review');
  });

  it('preserves Google Maps short links on existing cards', () => {
    const legacyUrl = 'https://maps.app.goo.gl/AbCd';
    expect(getSavedGoogleReviewDestination({ target_url: legacyUrl })).toBe(legacyUrl);
    expect(getGoogleReviewLink(legacyUrl)).toBeNull();
  });

  it.each([
    'https://example.com/?placeid=ChIJabc',
    'https://maps.app.goo.gl.example.com/AbCd',
    'https://search.google.com/local/writereview',
    'http://g.page/r/Example/review',
    'https://goo.gl/AbCd',
  ])('rejects unsupported destinations (%s)', (url) => {
    expect(getSavedGoogleReviewDestination({ google_review_url: url })).toBeNull();
  });
});
