import { describe, it, expect } from 'vitest';
import { resolveDateRange } from '@/lib/date-range';
import { parseCardModeInput, parseAlertSettingsInput } from '@/lib/card-settings';
import { resolveSocialFormat, prepareQuote, formatReviewMonth } from '@/lib/social-card';
import { buildWeeklySummaryMessage } from '@/lib/insights/message';

const NOW = new Date('2026-10-15T07:00:00.000Z'); // 14:00 WIB

describe('resolveDateRange', () => {
  it('starts "this month" at midnight WIB on the 1st', () => {
    const range = resolveDateRange('month', NOW);
    expect(range.key).toBe('month');
    expect(range.start.toISOString()).toBe('2026-09-30T17:00:00.000Z');
    expect(range.end.toISOString()).toBe(NOW.toISOString());
  });

  it('covers the whole previous WIB month for last_month', () => {
    const range = resolveDateRange('last_month', NOW);
    expect(range.start.toISOString()).toBe('2026-08-31T17:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-09-30T17:00:00.000Z');
  });

  it('supports a rolling 30 day window and defaults unknown keys to this month', () => {
    expect(resolveDateRange('30d', NOW).start.toISOString()).toBe('2026-09-15T07:00:00.000Z');
    expect(resolveDateRange('bogus', NOW).key).toBe('month');
  });

  it('uses the WIB calendar month right after local midnight', () => {
    const justAfterMidnight = new Date('2026-10-31T18:00:00.000Z'); // 1 Nov 01:00 WIB
    expect(resolveDateRange('month', justAfterMidnight).start.toISOString()).toBe(
      '2026-10-31T17:00:00.000Z'
    );
  });
});

describe('parseCardModeInput', () => {
  it('switches back to review and clears the expiry', () => {
    expect(parseCardModeInput({ card_mode: 'review', mode_until: '2026-10-20T00:00:00Z' }, NOW)).toEqual({
      ok: true,
      values: { card_mode: 'review', mode_until: null },
    });
  });

  it('requires a title for promo mode and validates optional links', () => {
    expect(parseCardModeInput({ card_mode: 'promo', promo_title: '  ' }, NOW)).toMatchObject({ ok: false });
    expect(
      parseCardModeInput({ card_mode: 'promo', promo_title: 'Diskon', promo_url: 'javascript:alert(1)' }, NOW)
    ).toMatchObject({ ok: false });

    expect(
      parseCardModeInput(
        {
          card_mode: 'promo',
          promo_title: ' Diskon 20% ',
          promo_message: 'Khusus hari ini',
          promo_cta_label: 'Lihat Menu',
          promo_url: 'https://instagram.com/kopisenja',
          promo_image_url: '',
          mode_until: '2026-10-16T16:59:00.000Z',
        },
        NOW
      )
    ).toEqual({
      ok: true,
      values: {
        card_mode: 'promo',
        promo_title: 'Diskon 20%',
        promo_message: 'Khusus hari ini',
        promo_cta_label: 'Lihat Menu',
        promo_url: 'https://instagram.com/kopisenja',
        promo_image_url: null,
        mode_until: '2026-10-16T16:59:00.000Z',
      },
    });
  });

  it('requires a valid destination for redirect mode', () => {
    expect(parseCardModeInput({ card_mode: 'redirect', promo_url: '' }, NOW)).toMatchObject({ ok: false });
    expect(
      parseCardModeInput({ card_mode: 'redirect', promo_url: 'https://wa.me/c/6281234567890' }, NOW)
    ).toEqual({
      ok: true,
      values: { card_mode: 'redirect', promo_url: 'https://wa.me/c/6281234567890', mode_until: null },
    });
  });

  it('rejects unknown modes and expiry times in the past', () => {
    expect(parseCardModeInput({ card_mode: 'menu' }, NOW)).toMatchObject({ ok: false });
    expect(
      parseCardModeInput(
        { card_mode: 'promo', promo_title: 'Diskon', mode_until: '2026-10-15T06:00:00.000Z' },
        NOW
      )
    ).toMatchObject({ ok: false });
  });
});

describe('parseAlertSettingsInput', () => {
  it('normalizes the alert number and accepts Telegram chat ids', () => {
    expect(
      parseAlertSettingsInput({
        alerts_enabled: 'on',
        alert_whatsapp: '0812-3456-7890',
        alert_telegram_chat_id: ' -1001234567890 ',
      })
    ).toEqual({
      ok: true,
      values: {
        alerts_enabled: true,
        alert_whatsapp: '6281234567890',
        alert_telegram_chat_id: '-1001234567890',
      },
    });
  });

  it('treats empty fields as "use defaults" and unchecked as disabled', () => {
    expect(parseAlertSettingsInput({ alert_whatsapp: '', alert_telegram_chat_id: '' })).toEqual({
      ok: true,
      values: { alerts_enabled: false, alert_whatsapp: null, alert_telegram_chat_id: null },
    });
  });

  it('rejects malformed numbers and chat ids', () => {
    expect(parseAlertSettingsInput({ alert_whatsapp: '0812' })).toMatchObject({ ok: false });
    expect(parseAlertSettingsInput({ alert_telegram_chat_id: 'grup kopi' })).toMatchObject({ ok: false });
  });
});

describe('social card helpers', () => {
  it('resolves the output format', () => {
    expect(resolveSocialFormat('story')).toBe('story');
    expect(resolveSocialFormat('POST')).toBe('post');
    expect(resolveSocialFormat('banner')).toBe('post');
  });

  it('cleans quotes and whitespace and sizes short quotes large', () => {
    expect(prepareQuote('  "Kopinya   enak\nbanget!"  ', 'post')).toEqual({
      text: 'Kopinya enak banget!',
      fontSize: 64,
    });
    expect(prepareQuote('Kopinya enak banget!', 'story').fontSize).toBe(76);
  });

  it('drops emoji the image renderer cannot draw offline', () => {
    expect(prepareQuote('Kopinya enak 😍🔥 pelayanannya ramah 👍🏽', 'post').text).toBe(
      'Kopinya enak pelayanannya ramah'
    );
  });

  it('truncates long reviews at a word boundary', () => {
    const long = Array.from({ length: 120 }, (_, i) => `kata${i}`).join(' ');
    const quote = prepareQuote(long, 'post');
    expect(quote.text.length).toBeLessThanOrEqual(220);
    expect(quote.text.endsWith('…')).toBe(true);
    expect(quote.fontSize).toBe(38);
  });

  it('formats the review month in Indonesian', () => {
    expect(formatReviewMonth('2026-10-15T07:00:00.000Z')).toBe('Oktober 2026');
  });
});

describe('buildWeeklySummaryMessage', () => {
  const summary = {
    summary: 'Minggu ini ada 4 catatan soal AC.',
    themes: [{ label: 'AC / suhu ruangan', count: 4, detail: 'meja 12' }],
    actions: ['Servis AC lantai dua', 'Tambah staf saat makan siang'],
    feedback_count: 12,
    complaint_count: 7,
    avg_rating: 3.4,
  };

  it('formats a WhatsApp-friendly weekly digest', () => {
    const message = buildWeeklySummaryMessage({
      businessName: 'Kopi Senja',
      summary,
      dashboardUrl: 'https://nived.studio/dashboard',
    });

    expect(message).toContain('Kopi Senja');
    expect(message).toContain('12 masukan');
    expect(message).toContain('7 keluhan');
    expect(message).toContain('Minggu ini ada 4 catatan soal AC.');
    expect(message).toContain('• AC / suhu ruangan (4) — meja 12');
    expect(message).toContain('1. Servis AC lantai dua');
    expect(message).toContain('https://nived.studio/dashboard');
  });

  it('omits empty sections', () => {
    const message = buildWeeklySummaryMessage({
      businessName: 'Kopi Senja',
      summary: { ...summary, themes: [], actions: [] },
    });
    expect(message).not.toContain('Tema utama');
    expect(message).not.toContain('Saran');
  });
});
