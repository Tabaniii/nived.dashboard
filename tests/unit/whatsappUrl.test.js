import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, formatWhatsAppUrl } from '@/lib/whatsapp';

describe('WhatsApp URL Utility', () => {
  it('normalizes phone number by stripping spaces, symbols, and formatting', () => {
    expect(normalizePhoneNumber('+62 812-3456-7890')).toBe('6281234567890');
    expect(normalizePhoneNumber('(021) 555-1234')).toBe('62215551234');
    expect(normalizePhoneNumber('081234567890')).toBe('6281234567890');
    expect(normalizePhoneNumber('08 5559 536429')).toBe('6285559536429');
    expect(normalizePhoneNumber('6281234567890')).toBe('6281234567890');
    expect(normalizePhoneNumber('')).toBe('');
    expect(normalizePhoneNumber(null)).toBe('');
  });

  it('generates properly encoded WhatsApp chat URL with feedback text', () => {
    const url = formatWhatsAppUrl({
      phoneNumber: '+62 812 3456 7890',
      storeName: 'Kopi Senja',
      rating: 2,
      feedbackText: 'Pelayanannya agak lama hari ini.',
    });

    expect(url).toBe(
      'https://wa.me/6281234567890?text=' +
        encodeURIComponent('Halo Tim Kopi Senja, saya baru saja berkunjung (Rating 2/5). Masukan saya: Pelayanannya agak lama hari ini.')
    );
  });

  it('falls back to default reassurance text when feedback text is empty', () => {
    const url = formatWhatsAppUrl({
      phoneNumber: '6281234567890',
      storeName: 'Kopi Senja',
      rating: 1,
      feedbackText: '',
    });

    expect(url).toBe(
      'https://wa.me/6281234567890?text=' +
        encodeURIComponent('Halo Tim Kopi Senja, saya baru saja berkunjung (Rating 1/5). Masukan saya: Saya ingin menyampaikan masukan langsung.')
    );
  });

  it('returns null if phone number is empty or absent', () => {
    expect(
      formatWhatsAppUrl({
        phoneNumber: null,
        storeName: 'Kopi Senja',
        rating: 3,
      })
    ).toBeNull();
  });
});
