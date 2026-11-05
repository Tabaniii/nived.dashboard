import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as submitFeedback } from '@/app/api/feedback/route';
import { POST as logReviewClick } from '@/app/api/feedback/google-click/route';
import { getCardById } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';

vi.mock('@/lib/db', () => ({ getCardById: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const cardId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const storeId = 'b11deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const card = {
  merchant_id: storeId,
  slug: 'kopi-senja-meja-12',
  is_active: true,
  google_review_url: 'https://search.google.com/local/writereview?placeid=ChIJ12345',
};
const feedback = {
  card_id: cardId,
  category: 'Kecepatan Pelayanan',
  feedback_text: 'Pelayanan agak lama saat makan siang.',
};
const from = vi.fn();
const insert = vi.fn();

function request(body, endpoint = '') {
  return new Request(`http://localhost/api/feedback${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  getCardById.mockResolvedValue(card);
  createClient.mockResolvedValue({ from });
  from.mockReturnValue({ insert });
  insert.mockResolvedValue({ error: null });
});

describe('POST /api/feedback', () => {
  it('attributes the feedback to the saved table and store without a rating', async () => {
    const response = await submitFeedback(request({
      ...feedback,
      table_number: '99',
      store_id: 'untrusted-store',
      sentiment_tag: 'positive',
      resolved_status: true,
      customer_contact: '  +62 812 3456 7890  ',
    }));

    expect(response.status).toBe(201);
    expect(getCardById).toHaveBeenCalledWith(cardId);
    expect(from).toHaveBeenCalledWith('customer_feedback');
    expect(insert).toHaveBeenCalledWith({
      store_id: storeId,
      table_number: '12',
      category: 'Kecepatan Pelayanan',
      feedback_text: feedback.feedback_text,
      customer_contact: '+62 812 3456 7890',
    });
  });

  it('accepts anonymous feedback and sanitizes table attribution on shared cards', async () => {
    getCardById.mockResolvedValue({ ...card, slug: 'kopi-senja-01' });

    const response = await submitFeedback(request({ ...feedback, table_number: 'vip 2' }));

    expect(response.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      table_number: 'VIP-2',
      customer_contact: null,
    }));
  });

  it.each([
    { card_id: 'invalid-uuid' },
    { feedback_text: '   ' },
    { category: undefined },
    { category: 'Bukan kategori' },
    { customer_contact: '......' },
  ])('rejects invalid input before attempting an insert (%o)', async (fields) => {
    const response = await submitFeedback(request({ ...feedback, ...fields }));

    expect(response.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it.each([null, { ...card, is_active: false }, { ...card, merchant_id: null }])(
    'rejects unavailable cards (%o)',
    async (unavailableCard) => {
      getCardById.mockResolvedValue(unavailableCard);
      const response = await submitFeedback(request(feedback));

      expect(response.status).toBe(404);
      expect(insert).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed JSON', async () => {
    const response = await submitFeedback(new Request('http://localhost/api/feedback', {
      method: 'POST',
      body: '{',
    }));

    expect(response.status).toBe(400);
  });
});

describe('POST /api/feedback/google-click', () => {
  it('records the store and the recognized table independently of private feedback', async () => {
    const response = await logReviewClick(request({ card_id: cardId }, '/google-click'));

    expect(response.status).toBe(204);
    expect(from).toHaveBeenCalledWith('review_click_events');
    expect(insert).toHaveBeenCalledWith({ store_id: storeId, table_number: '12' });
  });

  it('rejects events for a card without a Google Maps destination', async () => {
    getCardById.mockResolvedValue({ ...card, google_review_url: 'https://example.com' });
    const response = await logReviewClick(request({ card_id: cardId }, '/google-click'));

    expect(response.status).toBe(404);
    expect(insert).not.toHaveBeenCalled();
  });
});
