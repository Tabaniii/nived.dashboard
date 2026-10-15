import { describe, it, expect } from 'vitest';
import {
  isLowRating,
  resolveAlertTargets,
  sanitizeTelegramChatId,
  buildLowRatingAlertMessage,
  createAlertThrottle,
  dispatchLowRatingAlert,
  collectDigestTargets,
} from '@/lib/alerts';

describe('isLowRating', () => {
  it('treats 1 to 3 stars as low ratings', () => {
    expect([1, 2, 3].every(isLowRating)).toBe(true);
    expect(isLowRating(4)).toBe(false);
    expect(isLowRating(5)).toBe(false);
    expect(isLowRating(0)).toBe(false);
  });
});

describe('sanitizeTelegramChatId', () => {
  it('accepts numeric chat ids and @channel usernames', () => {
    expect(sanitizeTelegramChatId(' 123456789 ')).toBe('123456789');
    expect(sanitizeTelegramChatId('-1001234567890')).toBe('-1001234567890');
    expect(sanitizeTelegramChatId('@kopisenja_alerts')).toBe('@kopisenja_alerts');
  });

  it('rejects anything else', () => {
    expect(sanitizeTelegramChatId('abc')).toBeNull();
    expect(sanitizeTelegramChatId('12')).toBeNull();
    expect(sanitizeTelegramChatId('')).toBeNull();
  });
});

describe('resolveAlertTargets', () => {
  it('prefers the dedicated alert number and normalizes 08 to 628', () => {
    expect(
      resolveAlertTargets({
        alerts_enabled: true,
        alert_whatsapp: '0812 3456 7890',
        whatsapp_number: '6289876543210',
        alert_telegram_chat_id: '123456789',
      })
    ).toEqual({ whatsapp: '6281234567890', telegramChatId: '123456789' });
  });

  it('falls back to the store WhatsApp number and stays enabled before migration', () => {
    expect(resolveAlertTargets({ whatsapp_number: '6289876543210' })).toEqual({
      whatsapp: '6289876543210',
      telegramChatId: null,
    });
  });

  it('returns no targets when alerts are disabled or the number is unusable', () => {
    expect(
      resolveAlertTargets({ alerts_enabled: false, whatsapp_number: '6289876543210' })
    ).toEqual({ whatsapp: null, telegramChatId: null });
    expect(resolveAlertTargets({ whatsapp_number: '0812' })).toEqual({
      whatsapp: null,
      telegramChatId: null,
    });
  });
});

describe('buildLowRatingAlertMessage', () => {
  it('includes store, rating, WIB time, table, staff, complaint and customer contact', () => {
    const message = buildLowRatingAlertMessage({
      storeName: 'Kopi Senja Utama',
      rating: 2,
      feedbackText: 'AC lantai 2 panas banget',
      tableCode: '12',
      staffCode: 'andi',
      customerWhatsapp: '6281234567890',
      createdAt: '2026-10-15T07:05:00.000Z',
      dashboardUrl: 'https://nived.studio/dashboard',
    });

    expect(message).toContain('Kopi Senja Utama');
    expect(message).toContain('2/5');
    expect(message).toMatch(/14[.:]05/);
    expect(message).toContain('WIB');
    expect(message).toContain('Meja 12');
    expect(message).toContain('andi');
    expect(message).toContain('AC lantai 2 panas banget');
    expect(message).toContain('wa.me/6281234567890');
    expect(message).toContain('https://nived.studio/dashboard');
  });

  it('omits optional lines and notes when no text was written', () => {
    const message = buildLowRatingAlertMessage({
      storeName: 'Kopi Senja Utama',
      rating: 1,
      createdAt: '2026-10-15T07:05:00.000Z',
    });

    expect(message).not.toContain('Meja');
    expect(message).not.toContain('Staf');
    expect(message).not.toContain('wa.me');
    expect(message).toContain('tanpa catatan tertulis');
  });

  it('truncates very long complaints', () => {
    const message = buildLowRatingAlertMessage({
      storeName: 'Kopi',
      rating: 1,
      feedbackText: 'x'.repeat(2000),
      createdAt: '2026-10-15T07:05:00.000Z',
    });
    expect(message.length).toBeLessThan(900);
    expect(message).toContain('…');
  });
});

describe('createAlertThrottle', () => {
  it('allows one alert per source per window', () => {
    const throttle = createAlertThrottle({ perSourceWindowMs: 60_000 });
    expect(throttle.allow('card-1', 'ip-a', 0)).toBe(true);
    expect(throttle.allow('card-1', 'ip-a', 30_000)).toBe(false);
    expect(throttle.allow('card-1', 'ip-b', 30_000)).toBe(true);
    expect(throttle.allow('card-1', 'ip-a', 61_000)).toBe(true);
  });

  it('caps the number of alerts per card in a window', () => {
    const throttle = createAlertThrottle({ perCardLimit: 2, perCardWindowMs: 3_600_000 });
    expect(throttle.allow('card-1', 'ip-a', 0)).toBe(true);
    expect(throttle.allow('card-1', 'ip-b', 1)).toBe(true);
    expect(throttle.allow('card-1', 'ip-c', 2)).toBe(false);
    expect(throttle.allow('card-2', 'ip-c', 2)).toBe(true);
  });
});

describe('dispatchLowRatingAlert', () => {
  const card = {
    id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    store_name: 'Kopi Senja Utama',
    whatsapp_number: '6281234567890',
    alert_telegram_chat_id: '123456789',
  };
  const feedback = {
    id: 42,
    rating: 2,
    feedback_text: 'Pesanan lama banget',
    created_at: '2026-10-15T07:05:00.000Z',
  };

  function makeDeps(sendResult = { delivered: true }) {
    const sent = [];
    const marked = [];
    return {
      sent,
      marked,
      deps: {
        send: async (payload) => {
          sent.push(payload);
          return sendResult;
        },
        markSent: async (id) => {
          marked.push(id);
        },
        throttle: createAlertThrottle(),
      },
    };
  }

  it('skips ratings above 3 without sending', async () => {
    const { sent, deps } = makeDeps();
    const result = await dispatchLowRatingAlert({ card, feedback: { ...feedback, rating: 5 }, ...deps });
    expect(result).toEqual({ status: 'skipped', reason: 'not_low_rating' });
    expect(sent).toHaveLength(0);
  });

  it('skips when the card has no alert target', async () => {
    const { deps } = makeDeps();
    const result = await dispatchLowRatingAlert({
      card: { ...card, whatsapp_number: null, alert_telegram_chat_id: null },
      feedback,
      ...deps,
    });
    expect(result).toEqual({ status: 'skipped', reason: 'no_target' });
  });

  it('sends to WhatsApp and Telegram, then marks the feedback as alerted', async () => {
    const { sent, marked, deps } = makeDeps();
    const result = await dispatchLowRatingAlert({ card, feedback, sourceKey: 'ip-a', ...deps });

    expect(result.status).toBe('sent');
    expect(sent).toHaveLength(1);
    expect(sent[0].whatsapp).toBe('6281234567890');
    expect(sent[0].telegramChatId).toBe('123456789');
    expect(sent[0].message).toContain('Pesanan lama banget');
    expect(marked).toEqual([42]);
  });

  it('does not mark the feedback when every channel failed', async () => {
    const { marked, deps } = makeDeps({ delivered: false });
    const result = await dispatchLowRatingAlert({ card, feedback, sourceKey: 'ip-a', ...deps });
    expect(result.status).toBe('failed');
    expect(marked).toHaveLength(0);
  });

  it('throttles repeated alerts from the same source', async () => {
    const { sent, deps } = makeDeps();
    await dispatchLowRatingAlert({ card, feedback, sourceKey: 'ip-a', ...deps });
    const second = await dispatchLowRatingAlert({ card, feedback, sourceKey: 'ip-a', ...deps });
    expect(second).toEqual({ status: 'skipped', reason: 'throttled' });
    expect(sent).toHaveLength(1);
  });
});

describe('collectDigestTargets', () => {
  it('dedupes WhatsApp numbers and Telegram chats across cards with alerts enabled', () => {
    const cards = [
      { whatsapp_number: '081234567890', alert_whatsapp: null, alert_telegram_chat_id: '123456789' },
      { whatsapp_number: '6281234567890', alert_telegram_chat_id: '123456789' },
      { whatsapp_number: '081111111111', alerts_enabled: false, alert_telegram_chat_id: '-1009999999999' },
      { alert_whatsapp: '6289876543210' },
      {},
    ];

    expect(collectDigestTargets(cards)).toEqual({
      whatsapp: ['6281234567890', '6289876543210'],
      telegram: ['123456789'],
    });
  });

  it('returns empty lists when nothing is configured', () => {
    expect(collectDigestTargets([])).toEqual({ whatsapp: [], telegram: [] });
  });
});
