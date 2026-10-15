import { describe, it, expect } from 'vitest';
import { computeModeUntil, resolveActiveCardMode } from '@/lib/card-mode';
import { resolveCardAction } from '@/lib/resolve-card-action';

const NOW = new Date('2026-10-15T07:00:00.000Z');

const baseCard = Object.freeze({
  id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  slug: 'demo-card',
  is_shield_active: true,
  google_review_url: 'https://maps.app.goo.gl/demo-review',
});

describe('resolveActiveCardMode', () => {
  it('defaults to review when card_mode is missing or unknown', () => {
    expect(resolveActiveCardMode(baseCard, NOW)).toBe('review');
    expect(resolveActiveCardMode({ ...baseCard, card_mode: 'menu' }, NOW)).toBe('review');
  });

  it('returns promo while the promo has content and has not expired', () => {
    const card = {
      ...baseCard,
      card_mode: 'promo',
      promo_title: 'Diskon 20% Kopi Susu',
      mode_until: '2026-10-16T00:00:00.000Z',
    };
    expect(resolveActiveCardMode(card, NOW)).toBe('promo');
  });

  it('falls back to review once mode_until has passed', () => {
    const card = {
      ...baseCard,
      card_mode: 'promo',
      promo_title: 'Diskon 20% Kopi Susu',
      mode_until: '2026-10-15T06:59:59.000Z',
    };
    expect(resolveActiveCardMode(card, NOW)).toBe('review');
  });

  it('falls back to review when promo mode has no title or message', () => {
    expect(resolveActiveCardMode({ ...baseCard, card_mode: 'promo' }, NOW)).toBe('review');
  });

  it('requires a valid http(s) promo_url for redirect mode', () => {
    expect(
      resolveActiveCardMode(
        { ...baseCard, card_mode: 'redirect', promo_url: 'https://instagram.com/kopisenja' },
        NOW
      )
    ).toBe('redirect');
    expect(
      resolveActiveCardMode(
        { ...baseCard, card_mode: 'redirect', promo_url: 'javascript:alert(1)' },
        NOW
      )
    ).toBe('review');
  });
});

describe('resolveCardAction with smart modes', () => {
  it('renders the promo page when promo mode is active', () => {
    const card = { ...baseCard, card_mode: 'promo', promo_title: 'Menu Baru!' };
    expect(resolveCardAction(card, { now: NOW })).toEqual({ type: 'promo', card });
  });

  it('shows the rating UI for promo cards when the customer asks to review', () => {
    const card = { ...baseCard, card_mode: 'promo', promo_title: 'Menu Baru!' };
    expect(resolveCardAction(card, { now: NOW, forceReview: true })).toEqual({
      type: 'shield_ui',
      card,
    });
  });

  it('redirects with 307 to the promo URL in redirect mode, even for direct-mode cards', () => {
    const card = {
      ...baseCard,
      is_shield_active: false,
      card_mode: 'redirect',
      promo_url: 'https://wa.me/c/6281234567890',
    };
    expect(resolveCardAction(card, { now: NOW })).toEqual({
      type: 'mode_redirect',
      url: 'https://wa.me/c/6281234567890',
      status: 307,
    });
  });

  it('keeps the review behaviour for expired modes', () => {
    const card = {
      ...baseCard,
      is_shield_active: false,
      card_mode: 'redirect',
      promo_url: 'https://instagram.com/kopisenja',
      mode_until: '2026-10-01T00:00:00.000Z',
    };
    expect(resolveCardAction(card, { now: NOW })).toEqual({
      type: 'direct_redirect',
      url: 'https://maps.app.goo.gl/demo-review',
      status: 307,
    });
  });
});

describe('computeModeUntil', () => {
  it('has no end time for "none" and unknown presets', () => {
    expect(computeModeUntil('none', '', NOW)).toBeNull();
    expect(computeModeUntil('forever', '', NOW)).toBeNull();
  });

  it('ends "today" at 23:59 Jakarta time', () => {
    expect(computeModeUntil('today', '', NOW)).toBe('2026-10-15T16:59:00.000Z');
    expect(computeModeUntil('today', '', new Date('2026-10-15T18:00:00.000Z'))).toBe(
      '2026-10-16T16:59:00.000Z'
    );
  });

  it('adds fixed durations', () => {
    expect(computeModeUntil('3h', '', NOW)).toBe('2026-10-15T10:00:00.000Z');
    expect(computeModeUntil('24h', '', NOW)).toBe('2026-10-16T07:00:00.000Z');
    expect(computeModeUntil('7d', '', NOW)).toBe('2026-10-22T07:00:00.000Z');
  });

  it('parses a custom date and rejects empty or invalid input', () => {
    expect(computeModeUntil('custom', '2026-10-20T10:00:00.000Z', NOW)).toBe('2026-10-20T10:00:00.000Z');
    expect(computeModeUntil('custom', '', NOW)).toBeNull();
    expect(computeModeUntil('custom', 'besok', NOW)).toBeNull();
  });
});
