import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/telemetry/star/route';
import { resetMockStore, getMockStore } from '@/lib/db';

describe('API: POST /api/telemetry/star', () => {
  const validCardId = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'; // demo-card

  beforeEach(() => {
    resetMockStore();
  });

  it('records star selection telemetry (1-5 stars) successfully', async () => {
    const payload = {
      card_id: validCardId,
      selected_stars: 5,
    };

    const req = new Request('http://localhost:3000/api/telemetry/star', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        'X-Forwarded-For': '192.168.1.100',
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);

    const store = getMockStore();
    expect(store.tapLogs).toHaveLength(1);
    expect(store.tapLogs[0].card_id).toBe(validCardId);
    expect(store.tapLogs[0].selected_stars).toBe(5);
    expect(store.tapLogs[0].device_os).toBe('iOS');
  });

  it('keeps staff and table attribution when star telemetry creates a tap log', async () => {
    const req = new Request('http://localhost:3000/api/telemetry/star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '192.168.1.101' },
      body: JSON.stringify({
        card_id: validCardId,
        selected_stars: 4,
        staff_code: 'Andi',
        table_code: '12',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(getMockStore().tapLogs[0]).toMatchObject({
      selected_stars: 4,
      staff_code: 'andi',
      table_code: '12',
    });
  });

  it('rejects selected_stars out of 1-5 range with 400 Bad Request', async () => {
    const payload = {
      card_id: validCardId,
      selected_stars: 6,
    };

    const req = new Request('http://localhost:3000/api/telemetry/star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe('Validation error');
  });

  it('rejects invalid card_id with 400 Bad Request', async () => {
    const payload = {
      card_id: 'not-a-uuid',
      selected_stars: 4,
    };

    const req = new Request('http://localhost:3000/api/telemetry/star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 if card_id does not exist', async () => {
    const payload = {
      card_id: '99999999-9999-9999-9999-999999999999',
      selected_stars: 4,
    };

    const req = new Request('http://localhost:3000/api/telemetry/star', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
