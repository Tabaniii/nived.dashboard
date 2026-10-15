import { describe, it, expect, beforeEach } from 'vitest';
import { getCardBySlug, resetMockStore, getMockStore } from '@/lib/db';
import { handleTapTelemetry } from '@/lib/logger';
import { resetDebounceCache } from '@/lib/debounce';

describe('Card Route Logic & Shield Mode vs Direct Mode', () => {
  beforeEach(() => {
    resetMockStore();
    resetDebounceCache();
  });

  it('retrieves active Shield Mode card (demo-card)', async () => {
    const card = await getCardBySlug('demo-card');
    expect(card).not.toBeNull();
    expect(card.slug).toBe('demo-card');
    expect(card.is_shield_active).toBe(true);
    expect(card.store_name).toBe('Kopi Senja Utama');
  });

  it('retrieves Direct Mode card (direct-card) with is_shield_active: false (TM-06)', async () => {
    const card = await getCardBySlug('direct-card');
    expect(card).not.toBeNull();
    expect(card.slug).toBe('direct-card');
    expect(card.is_shield_active).toBe(false);
    expect(card.google_review_url).toBe('https://maps.app.goo.gl/direct-review');
  });

  it('returns null for nonexistent slug (TM-07 fallback condition)', async () => {
    const card = await getCardBySlug('nonexistent-slug');
    expect(card).toBeNull();
  });

  it('handles telemetry asynchronously when card is tapped (TM-12)', async () => {
    const card = await getCardBySlug('demo-card');
    const result = handleTapTelemetry({
      cardId: card.id,
      clientIp: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });

    expect(result).toBe(true);

    // Wait a brief tick for async fire-and-forget execution
    await new Promise((resolve) => setTimeout(resolve, 50));

    const store = getMockStore();
    expect(store.tapLogs).toHaveLength(1);
    expect(store.tapLogs[0].card_id).toBe(card.id);
    expect(store.tapLogs[0].device_os).toBe('iOS');
  });

  it('suppresses duplicate telemetry within 5 seconds', async () => {
    const card = await getCardBySlug('demo-card');

    const first = handleTapTelemetry({
      cardId: card.id,
      clientIp: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    expect(first).toBe(true);

    const second = handleTapTelemetry({
      cardId: card.id,
      clientIp: '203.0.113.10',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    });
    expect(second).toBe(false); // Suppressed by debounce
  });

  it('resolves direct_redirect for Direct Mode cards and fallback for missing cards', async () => {
    const directCard = await getCardBySlug('direct-card');
    const { resolveCardAction } = await import('@/lib/resolve-card-action');
    const action = resolveCardAction(directCard);

    expect(action.type).toBe('direct_redirect');
    expect(action.status).toBe(307);
    expect(action.url).toBe(directCard.google_review_url);

    const missingCard = await getCardBySlug('nonexistent-slug');
    expect(resolveCardAction(missingCard)).toEqual({ type: 'fallback' });
  });

  it('records staff and table attribution on tap logs', async () => {
    const card = await getCardBySlug('demo-card');
    const result = handleTapTelemetry({
      cardId: card.id,
      clientIp: '203.0.113.77',
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      staffCode: 'andi',
      tableCode: '12',
    });

    expect(result).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getMockStore().tapLogs[0]).toMatchObject({ staff_code: 'andi', table_code: '12' });
  });

  it('records Desktop device category for desktop user agents', async () => {
    const card = await getCardBySlug('demo-card');
    const result = handleTapTelemetry({
      cardId: card.id,
      clientIp: '198.51.100.22',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      referrer: 'https://instagram.com/',
    });

    expect(result).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const store = getMockStore();
    expect(store.tapLogs).toHaveLength(1);
    expect(store.tapLogs[0].device_os).toBe('Desktop');
  });
});
