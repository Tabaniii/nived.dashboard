import { describe, it, expect, beforeEach } from 'vitest';
import { submitReviewAction } from '@/app/actions/review';
import { resetMockStore, getMockStore } from '@/lib/db';

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
});
