import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/reports/weekly-sentiment/route';
import { generateAndStoreSummary } from '@/lib/insights/store';

vi.mock('@/lib/insights/store', () => ({ generateAndStoreSummary: vi.fn() }));

const secret = 'test-cron-token';
const storeId = 'b11deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

function request(authorization, body = { store_id: storeId }) {
  return new Request('http://localhost/api/reports/weekly-sentiment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authorization && { authorization }) },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('POST /api/reports/weekly-sentiment', () => {
  it.each([undefined, 'Bearer invalid-token', 'test-cron-token'])(
    'rejects unauthorized requests before generating a summary (%s)',
    async (authorization) => {
      vi.stubEnv('CRON_SECRET', secret);

      expect((await POST(request(authorization))).status).toBe(401);
      expect(generateAndStoreSummary).not.toHaveBeenCalled();
    }
  );

  it('fails closed without a configured secret', async () => {
    vi.stubEnv('CRON_SECRET', '');

    expect((await POST(request('Bearer undefined'))).status).toBe(401);
    expect(generateAndStoreSummary).not.toHaveBeenCalled();
  });

  it('requires a valid store ID before generating a summary', async () => {
    vi.stubEnv('CRON_SECRET', secret);

    expect((await POST(request(`Bearer ${secret}`, { store_id: 'missing' }))).status).toBe(400);
    expect(generateAndStoreSummary).not.toHaveBeenCalled();
  });

  it('returns only the requested store report', async () => {
    vi.stubEnv('CRON_SECRET', secret);
    const report = { summary: 'Ringkasan mingguan.', source: 'ai', feedback_count: 1 };
    generateAndStoreSummary.mockResolvedValue({ ...report, merchant_id: storeId });

    const response = await POST(request(`Bearer ${secret}`));

    expect(generateAndStoreSummary).toHaveBeenCalledExactlyOnceWith(storeId);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(report);
  });
});
