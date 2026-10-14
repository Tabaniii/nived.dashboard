import { describe, it, expect } from 'vitest';
import { isValidUUID, isValidRating, sanitizeText, sanitizeReviewUrl, isValidReviewUrl } from '@/lib/validation';

describe('Validation Utilities', () => {
  describe('isValidUUID', () => {
    it('accepts valid RFC4122 UUID strings', () => {
      expect(isValidUUID('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d')).toBe(true);
      expect(isValidUUID('a23deb4d-4b7d-4bad-9bdd-2b0d7b3dcb6e')).toBe(true);
    });

    it('rejects invalid UUID strings', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('12345')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
      expect(isValidUUID('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6z')).toBe(false);
    });
  });

  describe('isValidRating', () => {
    it('validates 1-3 ratings for internal feedback', () => {
      expect(isValidRating(1, 1, 3)).toBe(true);
      expect(isValidRating(2, 1, 3)).toBe(true);
      expect(isValidRating(3, 1, 3)).toBe(true);
      expect(isValidRating(4, 1, 3)).toBe(false);
      expect(isValidRating(5, 1, 3)).toBe(false);
      expect(isValidRating(0, 1, 3)).toBe(false);
      expect(isValidRating(-1, 1, 3)).toBe(false);
      expect(isValidRating('2.5', 1, 3)).toBe(false);
    });

    it('validates 1-5 ratings for star telemetry', () => {
      expect(isValidRating(1, 1, 5)).toBe(true);
      expect(isValidRating(5, 1, 5)).toBe(true);
      expect(isValidRating(6, 1, 5)).toBe(false);
      expect(isValidRating(0, 1, 5)).toBe(false);
    });
  });

  describe('sanitizeText', () => {
    it('trims whitespace and strips dangerous control characters', () => {
      const raw = '  Hello World\x00\x08  ';
      expect(sanitizeText(raw)).toBe('Hello World');
    });

    it('enforces maximum character limit', () => {
      const longText = 'a'.repeat(3000);
      expect(sanitizeText(longText, 2000).length).toBe(2000);
    });

    it('handles non-string values gracefully', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
    });
  });

  describe('sanitizeReviewUrl & isValidReviewUrl', () => {
    it('accepts and sanitizes Google Business Profile direct review URLs', () => {
      const gPage = 'https://g.page/r/Cd12345/review';
      expect(isValidReviewUrl(gPage)).toBe(true);
      expect(sanitizeReviewUrl(gPage)).toBe(gPage);

      const writeReview = 'https://search.google.com/local/writereview?placeid=ChIJ1234567890';
      expect(isValidReviewUrl(writeReview)).toBe(true);
      expect(sanitizeReviewUrl(writeReview)).toBe(writeReview);

      const mapsApp = 'https://maps.app.goo.gl/abcdef';
      expect(isValidReviewUrl(mapsApp)).toBe(true);
      expect(sanitizeReviewUrl(mapsApp)).toBe(mapsApp);
    });

    it('preserves query parameters and hashes', () => {
      const urlWithQuery = 'https://search.google.com/local/writereview?placeid=ChIJ123&utm_source=nfc#top';
      expect(sanitizeReviewUrl(urlWithQuery)).toBe(urlWithQuery);
    });

    it('strips credentials embedded in URL', () => {
      const urlWithCreds = 'https://user:secret@g.page/r/Cd12345/review';
      expect(sanitizeReviewUrl(urlWithCreds)).toBe('https://g.page/r/Cd12345/review');
    });

    it('rejects invalid schemes and non-URLs', () => {
      expect(isValidReviewUrl('javascript:alert(1)')).toBe(false);
      expect(sanitizeReviewUrl('javascript:alert(1)')).toBeNull();
      expect(isValidReviewUrl('not-a-url')).toBe(false);
      expect(isValidReviewUrl('')).toBe(false);
      expect(isValidReviewUrl(null)).toBe(false);
      expect(isValidReviewUrl(undefined)).toBe(false);
    });
  });
});
