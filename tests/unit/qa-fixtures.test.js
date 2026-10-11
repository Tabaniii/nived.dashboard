import { describe, expect, it } from 'vitest';
import {
  CARD_FIXTURES,
  CARD_FIXTURE_IDS,
  UNKNOWN_CARD_SLUG,
} from '../fixtures/cards';
import {
  INVALID_FEEDBACK_RATINGS,
  VALID_FEEDBACK_PAYLOAD,
  VALID_TELEMETRY_PAYLOAD,
  XSS_PAYLOADS,
} from '../fixtures/payloads';

describe('QA fixture contract', () => {
  it('keeps fixture IDs unique and UUID-shaped', () => {
    expect(new Set(CARD_FIXTURE_IDS).size).toBe(CARD_FIXTURE_IDS.length);

    for (const id of CARD_FIXTURE_IDS) {
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    }
  });

  it('covers the required mode and optional-contact fixtures', () => {
    expect(CARD_FIXTURES.demo.is_shield_active).toBe(true);
    expect(CARD_FIXTURES.direct.is_shield_active).toBe(false);
    expect(CARD_FIXTURES.noWhatsApp.whatsapp_number).toBeNull();
    expect(CARD_FIXTURES.longName.store_name.length).toBeGreaterThan(40);
    expect(CARD_FIXTURES.specialUrl.google_review_url).toContain('?');
    expect(UNKNOWN_CARD_SLUG).not.toBe(CARD_FIXTURES.demo.slug);
  });

  it('keeps valid API payloads aligned with their endpoint contracts', () => {
    expect(VALID_FEEDBACK_PAYLOAD.rating).toBeGreaterThanOrEqual(1);
    expect(VALID_FEEDBACK_PAYLOAD.rating).toBeLessThanOrEqual(3);
    expect(VALID_TELEMETRY_PAYLOAD.selected_stars).toBeGreaterThanOrEqual(1);
    expect(VALID_TELEMETRY_PAYLOAD.selected_stars).toBeLessThanOrEqual(5);
  });

  it('keeps boundary and XSS payloads available to security suites', () => {
    expect(INVALID_FEEDBACK_RATINGS).toContain(5);
    expect(INVALID_FEEDBACK_RATINGS).toContain('2');
    expect(XSS_PAYLOADS).toHaveLength(4);
    expect(XSS_PAYLOADS.some((payload) => payload.includes('<script>'))).toBe(
      true
    );
  });
});
