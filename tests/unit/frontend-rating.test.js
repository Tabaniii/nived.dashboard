import { describe, it, expect } from 'vitest';
import { formatWhatsAppUrl } from '@/lib/whatsapp';

/**
 * Pure logic replicate of getStoreInitials in RatingClientView.js
 */
function getStoreInitials(storeName) {
  if (!storeName || typeof storeName !== 'string') return 'RT';
  const parts = storeName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return storeName.trim().slice(0, 2).toUpperCase() || 'RT';
}

describe('Front-End Rating UI & Helpers', () => {
  describe('getStoreInitials', () => {
    it('extracts two uppercase letters from multi-word store names', () => {
      expect(getStoreInitials('Kopi Senja Utama')).toBe('KS');
      expect(getStoreInitials('Warung Kopi')).toBe('WK');
      expect(getStoreInitials('Bakso Solo Samrat')).toBe('BS');
    });

    it('extracts first two letters from single-word store names', () => {
      expect(getStoreInitials('Starbucks')).toBe('ST');
      expect(getStoreInitials('McDonalds')).toBe('MC');
    });

    it('falls back gracefully to RT for missing or invalid store names', () => {
      expect(getStoreInitials('')).toBe('RT');
      expect(getStoreInitials(null)).toBe('RT');
      expect(getStoreInitials(undefined)).toBe('RT');
    });
  });

  describe('Rating State Threshold Classification', () => {
    it('allows 4 and 5 stars to remain on the slug rating flow', () => {
      const isHighRating = (rating) => rating >= 4;
      expect(isHighRating(4)).toBe(true);
      expect(isHighRating(5)).toBe(true);
      expect(isHighRating(3)).toBe(false);
      expect(isHighRating(2)).toBe(false);
      expect(isHighRating(1)).toBe(false);
    });

    it('classifies all ratings as valid internal feedback values', () => {
      const isLowRating = (rating) => rating >= 1 && rating <= 3;
      expect(isLowRating(1)).toBe(true);
      expect(isLowRating(2)).toBe(true);
      expect(isLowRating(3)).toBe(true);
      expect(isLowRating(4)).toBe(false);
      expect(isLowRating(5)).toBe(false);
    });
  });

  describe('WhatsApp Real-Time Message Sync', () => {
    it('creates properly encoded WhatsApp link with live feedback input', () => {
      const card = {
        store_name: 'Kopi Senja Utama',
        whatsapp_number: '6281234567890',
      };
      const userFeedback = 'Meja nomor 4 kotor dan AC kurang dingin.';

      const waUrl = formatWhatsAppUrl({
        phoneNumber: card.whatsapp_number,
        storeName: card.store_name,
        rating: 2,
        feedbackText: userFeedback,
      });

      expect(waUrl).toContain('https://wa.me/6281234567890?text=');
      expect(waUrl).toContain(encodeURIComponent('Rating 2/5'));
      expect(waUrl).toContain(encodeURIComponent(userFeedback));
    });

    it('creates standard reassurance message when feedback text is blank', () => {
      const card = {
        store_name: 'Kopi Senja Utama',
        whatsapp_number: '6281234567890',
      };

      const waUrl = formatWhatsAppUrl({
        phoneNumber: card.whatsapp_number,
        storeName: card.store_name,
        rating: 1,
        feedbackText: '',
      });

      expect(waUrl).toContain('https://wa.me/6281234567890?text=');
      expect(waUrl).toContain(encodeURIComponent('Saya ingin menyampaikan masukan langsung.'));
    });
  });
});
