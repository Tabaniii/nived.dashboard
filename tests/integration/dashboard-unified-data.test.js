import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { getClientDashboardData } from '@/app/(dashboard)/dashboard/queries';

vi.mock('next/server', () => ({ connection: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ getSessionProfile: vi.fn() }));

const storeId = '11111111-1111-1111-1111-111111111111';
const today = '2026-10-31T17:00:00.000Z'; // 1 November, midnight WIB.
let rows;
let calls;
let failedTable;

function query(table) {
  const filters = [];
  let bounds;
  let limit;
  let options;
  const builder = {
    select: vi.fn((_columns, config) => { options = config; return builder; }),
    eq: vi.fn((key, value) => { filters.push(row => row[key] === value); return builder; }),
    in: vi.fn((key, values) => { filters.push(row => values.includes(row[key])); return builder; }),
    is: vi.fn((key, value) => { filters.push(row => (row[key] ?? null) === value); return builder; }),
    not: vi.fn((key, _operator, value) => { filters.push(row => (row[key] ?? null) !== value); return builder; }),
    gte: vi.fn((key, value) => { filters.push(row => row[key] >= value); return builder; }),
    lte: vi.fn((key, value) => { filters.push(row => row[key] <= value); return builder; }),
    order: vi.fn(() => builder),
    range: vi.fn((from, to) => { bounds = [from, to]; return builder; }),
    limit: vi.fn(value => { limit = value; return builder; }),
    then(resolve) {
      if (table === failedTable) return Promise.resolve({ data: null, error: { code: '42501' } }).then(resolve);
      const matching = (rows[table] || []).filter(row => filters.every(filter => filter(row)));
      let data = bounds ? matching.slice(bounds[0], bounds[1] + 1) : matching;
      if (limit) data = data.slice(0, limit);
      return Promise.resolve({ data: options?.head ? null : data, count: matching.length, error: null }).then(resolve);
    },
  };
  calls.push({ table, builder });
  return builder;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-31T18:00:00.000Z')); // 1 November 01:00 WIB.
  rows = {};
  calls = [];
  failedTable = null;
  createClient.mockResolvedValue({ from: query });
});
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

describe('unified merchant overview', () => {
  it('reads real POS payments and table orders even when the store has no NFC cards', async () => {
    rows.payments = [
      { id: 'p1', merchant_id: storeId, amount: '48000', status: 'success', paid_at: today },
      { id: 'p2', merchant_id: storeId, amount: '22000', status: 'success', paid_at: '2026-10-31T17:59:00.000Z' },
      { id: 'p3', merchant_id: storeId, amount: '90000', status: 'refunded', paid_at: today },
      { id: 'p4', merchant_id: storeId, amount: '90000', status: 'success', paid_at: '2026-10-31T16:59:59.000Z' },
      { id: 'p5', merchant_id: 'another-store', amount: '90000', status: 'success', paid_at: today },
    ];
    rows.orders = [
      { id: 'o1', merchant_id: storeId, status: 'open', table_id: 'table1' },
      { id: 'o2', merchant_id: storeId, status: 'ready', table_id: 'table2' },
      { id: 'o3', merchant_id: storeId, status: 'completed', table_id: 'table3' },
      { id: 'o4', merchant_id: storeId, status: 'open', table_id: null },
    ];
    rows.customer_feedback = [{ id: 'f1', store_id: storeId, category: 'Kebersihan', resolved_status: false }];

    const data = await getClientDashboardData(storeId);

    expect(data.kpi).toEqual({ salesToday: 70000, activeTableOrders: 2, reviewClicks: 0, privateFeedbacks: 1 });
    expect(data.cards).toEqual([]);
    expect(data.feedbacks).toEqual(rows.customer_feedback);
    expect(calls.map(call => call.table)).not.toContain('internal_feedbacks');
  });

  it('buckets Google review clicks by the WIB day/hour and rolling seven-day window', async () => {
    rows.review_click_events = [
      { id: 'r1', store_id: storeId, created_at: today },
      { id: 'r2', store_id: storeId, created_at: '2026-10-31T17:59:00.000Z' },
      { id: 'r3', store_id: storeId, created_at: '2026-10-31T16:59:59.000Z' },
      { id: 'r4', store_id: storeId, created_at: '2026-10-24T17:59:59.000Z' },
      { id: 'future', store_id: storeId, created_at: '2026-10-31T19:00:00.000Z' },
    ];
    const data = await getClientDashboardData(storeId, false);

    expect(data.kpi.reviewClicks).toBe(3);
    expect(data.daily.at(-1)).toEqual({ date: '2026-11-01', count: 2 });
    expect(data.daily.at(-2)).toEqual({ date: '2026-10-31', count: 1 });
    expect(data.peakHours[0]).toEqual({ hour: '00:00', count: 3 });
    expect(data.peakHours[23]).toEqual({ hour: '23:00', count: 1 });
    expect(data.weekly.at(-1)).toEqual({ week: '10-26–11-01', count: 3 });
    expect(data.feedbacks).toEqual([]);
    expect(calls.find(call => call.table === 'customer_feedback').builder.select)
      .toHaveBeenCalledWith(expect.any(String), { count: 'exact', head: true });
  });

  it('pages POS receipts rather than silently losing revenue at the API row limit', async () => {
    rows.payments = Array.from({ length: 1001 }, (_, id) => ({
      id, merchant_id: storeId, amount: '24000', status: 'success', paid_at: today,
    }));
    const data = await getClientDashboardData(storeId);

    expect(data.kpi.salesToday).toBe(24024000);
    expect(calls.filter(call => call.table === 'payments').map(call => call.builder.range.mock.calls[0]))
      .toEqual([[0, 999], [1000, 1999]]);
  });

  it('surfaces an RLS error instead of showing a false zero', async () => {
    failedTable = 'payments';
    await expect(getClientDashboardData(storeId)).rejects.toEqual({ code: '42501' });
  });
});
