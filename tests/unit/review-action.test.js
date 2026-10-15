import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { submitReviewAction } from '@/app/actions/review';
import { resetMockStore, getMockStore } from '@/lib/db';
import { resetAlertThrottle } from '@/lib/alerts';

describe('Server Action: submitReviewAction', () => {
  const validCardId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'; // demo-card

  beforeEach(() => {
    resetMockStore();
  });

  it('saves private feedback for 1 to 3 star ratings without Google Maps link', async () => {
    const result = await submitReviewAction({
      card_id: validCardId,
      rating: 2,
      feedback_text: 'The food was cold upon arrival.',
    });

    expect(result.success).toBe(true);
    expect(result.next_action).toBe('private_confirmation');
    expect(result.google_review_url).toBeUndefined();
    expect(result.feedback_text).toBe('The food was cold upon arrival.');

    const store = getMockStore();
    expect(store.feedbacks).toHaveLength(1);
    expect(store.feedbacks[0].card_id).toBe(validCardId);
    expect(store.feedbacks[0].rating).toBe(2);
    expect(store.feedbacks[0].feedback_text).toBe('The food was cold upon arrival.');
  });

  it('saves review and provides Google Maps destination for 4 to 5 star ratings', async () => {
    const result = await submitReviewAction({
      card_id: validCardId,
      rating: 5,
      feedback_text: 'Amazing coffee and exceptional service!',
    });

    expect(result.success).toBe(true);
    expect(result.next_action).toBe('google_review');
    expect(result.google_review_url).toBe('https://maps.app.goo.gl/demo-review');
    expect(result.feedback_text).toBe('Amazing coffee and exceptional service!');

    const store = getMockStore();
    expect(store.feedbacks).toHaveLength(1);
    expect(store.feedbacks[0].card_id).toBe(validCardId);
    expect(store.feedbacks[0].rating).toBe(5);
  });

  it('handles optional empty review text gracefully', async () => {
    const result = await submitReviewAction({
      card_id: validCardId,
      rating: 4,
      feedback_text: '',
    });

    expect(result.success).toBe(true);
    expect(result.next_action).toBe('google_review');
    expect(result.google_review_url).toBe('https://maps.app.goo.gl/demo-review');
  });

  it('rejects invalid or missing card_id', async () => {
    const result = await submitReviewAction({
      card_id: 'invalid-id',
      rating: 5,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Valid card_id (UUID) is required');
  });

  it('rejects invalid rating values outside 1-5', async () => {
    const result = await submitReviewAction({
      card_id: validCardId,
      rating: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Rating must be an integer between 1 and 5');
  });

  it('returns error when card is not found', async () => {
    const result = await submitReviewAction({
      card_id: '11111111-2222-3333-4444-555555555555',
      rating: 3,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('referenced card does not exist');
  });

  it('stores sanitized staff and table attribution with the feedback', async () => {
    const result = await submitReviewAction({
      card_id: validCardId,
      rating: 2,
      feedback_text: 'AC panas',
      staff_code: 'Andi',
      table_code: 'a12',
    });

    expect(result.success).toBe(true);
    const [saved] = getMockStore().feedbacks;
    expect(saved.staff_code).toBe('andi');
    expect(saved.table_code).toBe('A12');
  });

  it('ignores attribution that sanitizes to nothing', async () => {
    await submitReviewAction({
      card_id: validCardId,
      rating: 5,
      staff_code: '<>',
      table_code: '',
    });

    const [saved] = getMockStore().feedbacks;
    expect(saved.staff_code ?? null).toBeNull();
    expect(saved.table_code ?? null).toBeNull();
  });
});

describe('Server Action: low-rating alerts', () => {
  const validCardId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

  beforeEach(() => {
    resetMockStore();
    resetAlertThrottle();
    vi.stubEnv('FONNTE_TOKEN', 'test-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends a WhatsApp alert through Fonnte for 1-3 star feedback', async () => {
    const calls = [];
    vi.stubGlobal('fetch', async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ status: true }), { status: 200 });
    });

    const result = await submitReviewAction({
      card_id: validCardId,
      rating: 1,
      feedback_text: 'Meja kotor',
      table_code: '7',
    });
    expect(result.success).toBe(true);

    await vi.waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].url).toBe('https://api.fonnte.com/send');
    expect(calls[0].init.body.get('target')).toBe('6281234567890');
    expect(calls[0].init.body.get('message')).toContain('Meja kotor');
    expect(calls[0].init.body.get('message')).toContain('Meja 7');
    await vi.waitFor(() => expect(getMockStore().feedbacks[0].alert_sent_at).toBeTruthy());
  });

  it('does not alert for 4-5 star ratings', async () => {
    const fetchSpy = vi.fn(async () => new Response('{"status":true}'));
    vi.stubGlobal('fetch', fetchSpy);

    await submitReviewAction({ card_id: validCardId, rating: 5, feedback_text: 'Mantap' });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
