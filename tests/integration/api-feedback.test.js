import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/feedback/route';
import { resetMockStore, getMockStore } from '@/lib/db';

describe('API: POST /api/feedback', () => {
  const validCardId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'; // demo-card

  beforeEach(() => {
    resetMockStore();
  });

  it('records feedback successfully for 1-5 star ratings', async () => {
    const payload = {
      card_id: validCardId,
      rating: 2,
      feedback_text: 'Pelayanan agak lama saat jam makan siang',
    };

    const req = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Feedback submitted successfully');

    const store = getMockStore();
    expect(store.feedbacks).toHaveLength(1);
    expect(store.feedbacks[0].card_id).toBe(validCardId);
    expect(store.feedbacks[0].rating).toBe(2);
    expect(store.feedbacks[0].feedback_text).toBe(payload.feedback_text);
  });

  it('allows optional feedback_text to be empty (TM-09)', async () => {
    const payload = {
      card_id: validCardId,
      rating: 1,
      feedback_text: '',
    };

    const req = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const store = getMockStore();
    expect(store.feedbacks).toHaveLength(1);
    expect(store.feedbacks[0].rating).toBe(1);
  });

  it('accepts a 5-star rating submitted from the slug page', async () => {
    const payload = {
      card_id: validCardId,
      rating: 5,
      feedback_text: 'Great place',
    };

    const req = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);

    const store = getMockStore();
    expect(store.feedbacks).toHaveLength(1);
    expect(store.feedbacks[0].rating).toBe(5);
  });

  it('rejects invalid or missing card_id with 400 Bad Request', async () => {
    const payload = {
      card_id: 'invalid-uuid-format',
      rating: 2,
    };

    const req = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 if card does not exist in database', async () => {
    const nonExistentCardId = '11111111-2222-3333-4444-555555555555';
    const payload = {
      card_id: nonExistentCardId,
      rating: 2,
    };

    const req = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('handles invalid JSON payload gracefully', async () => {
    const req = new Request('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json{',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
