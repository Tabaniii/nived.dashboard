import { cache } from 'react';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { getSessionProfile } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/validation';
import { isMissingSchemaError } from '@/lib/db-errors';
import { buildLeaderboard } from '@/lib/staff-stats';
import { resolveDateRange } from '@/lib/date-range';

export const DASHBOARD_STORE_COOKIE = 'nived_dashboard_store';
const STORE_COLUMNS = 'id, business_name, owner_name, status';

/** Layout and page share the session and selected store within this request. */
export const getClientContext = cache(async () => {
  const session = await getSessionProfile();
  if (!session) return null;

  const { profile, user } = session;
  if (profile.dashboard_role === 'superadmin') {
    const storeId = (await cookies()).get(DASHBOARD_STORE_COOKIE)?.value;
    if (!isValidUUID(storeId)) return { ...session, merchant: null };

    const supabase = await createClient();
    const { data, error } = await supabase.from('merchants')
      .select(STORE_COLUMNS)
      .eq('id', storeId.trim())
      .maybeSingle();
    if (error) throw error;
    return { ...session, merchant: data };
  }
  if (profile.dashboard_role !== 'owner') return null;

  const supabase = await createClient();
  const { data, error } = await supabase.from('merchants')
    .select(STORE_COLUMNS)
    .eq('owner_id', user.id)
    .in('status', ['active', 'trial'])
    .maybeSingle();
  if (error) throw error;
  return data ? { ...session, merchant: data } : null;
});

export async function getDashboardStoreOptions() {
  const ctx = await getClientContext();
  if (ctx?.profile.dashboard_role !== 'superadmin') return [];

  const supabase = await createClient();
  const stores = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('merchants')
      .select('id, business_name, status')
      .order('business_name')
      .order('id')
      .range(offset, offset + 499);
    if (error) throw error;
    stores.push(...data);
    if (data.length < 500) return stores;
  }
}

export const getClientCards = cache(async (merchantId) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('merchant_id', merchantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
});

/** Store overview uses the same POS payments and tabletop feedback as the hub. */
export async function getClientDashboardData(merchantId, includeFeedbacks = true) {
  await connection();
  const supabase = await createClient();
  const now = new Date();
  const dayMs = 86_400_000;
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + wibOffsetMs);
  const startOfToday = new Date(Date.UTC(
    wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()
  ) - wibOffsetMs);
  const startOfRange = new Date(startOfToday.getTime() - 27 * dayMs);
  const dayKey = (date) => new Date(date.getTime() + wibOffsetMs).toISOString().slice(0, 10);

  const [cards, clicksResult, paymentsResult, ordersResult, feedbackResult] = await Promise.all([
    getClientCards(merchantId),
    fetchAllRows((from, to) => supabase.from('review_click_events')
      .select('id, created_at')
      .eq('store_id', merchantId)
      .gte('created_at', startOfRange.toISOString())
      .lte('created_at', now.toISOString())
      .order('id', { ascending: true })
      .range(from, to)),
    fetchAllRows((from, to) => supabase.from('payments')
      .select('id, amount')
      .eq('merchant_id', merchantId)
      .eq('status', 'success')
      .gte('paid_at', startOfToday.toISOString())
      .lte('paid_at', now.toISOString())
      .order('id', { ascending: true })
      .range(from, to)),
    supabase.from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('merchant_id', merchantId)
      .in('status', ['open', 'sent', 'ready'])
      .not('table_id', 'is', null),
    supabase.from('customer_feedback')
      .select('id, table_number, category, feedback_text, customer_contact, created_at, resolved_status', {
        count: 'exact', head: !includeFeedbacks,
      })
      .eq('store_id', merchantId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(25),
  ]);
  for (const result of [clicksResult, paymentsResult, ordersResult, feedbackResult]) {
    if (result.error) throw result.error;
  }

  const dailyMap = new Map();
  const weeklyCounts = [0, 0, 0, 0];
  const hourlyCounts = Array(24).fill(0);
  for (const click of clicksResult.data) {
    const date = new Date(click.created_at);
    const key = dayKey(date);
    dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
    hourlyCounts[(date.getUTCHours() + 7) % 24] += 1;
    const dayStart = Date.parse(`${key}T00:00:00+07:00`);
    const weekIndex = Math.floor((startOfToday.getTime() - dayStart) / (7 * dayMs));
    weeklyCounts[weekIndex] += 1;
  }

  const daily = Array.from({ length: 28 }, (_, index) => {
    const date = dayKey(new Date(startOfRange.getTime() + index * dayMs));
    return { date, count: dailyMap.get(date) || 0 };
  });
  const weekly = Array.from({ length: 4 }, (_, index) => {
    const week = 3 - index;
    const end = new Date(startOfToday.getTime() - week * 7 * dayMs);
    const start = new Date(end.getTime() - 6 * dayMs);
    return { week: `${dayKey(start).slice(5)}–${dayKey(end).slice(5)}`, count: weeklyCounts[week] };
  });

  return {
    cards,
    kpi: {
      salesToday: paymentsResult.data.reduce((sum, payment) => sum + Number(payment.amount), 0),
      activeTableOrders: ordersResult.count ?? 0,
      reviewClicks: clicksResult.data.filter((click) => new Date(click.created_at).getTime() >= now.getTime() - 7 * dayMs).length,
      privateFeedbacks: feedbackResult.count ?? 0,
    },
    daily,
    weekly,
    peakHours: hourlyCounts.map((count, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, count })),
    feedbacks: feedbackResult.data || [],
  };
}

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

/**
 * PostgREST caps responses (1000 rows on Supabase), so page through results.
 * @param {(from: number, to: number) => PromiseLike<{ data: any[]|null, error: any }>} fetchPage
 */
async function fetchAllRows(fetchPage) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
  return { data: null, error: new Error('Terlalu banyak data. Persempit periode laporan.') };
}

/**
 * Staff and table leaderboards for the selected WIB reporting window.
 *
 * @param {string} merchantId
 * @param {string} rangeKey 'month' | 'last_month' | '30d'
 */
export async function getStaffPerformance(merchantId, rangeKey) {
  await connection();
  const supabase = await createClient();
  const cards = await getClientCards(merchantId);
  const cardIds = cards.map((c) => c.id);
  const range = resolveDateRange(rangeKey);

  const empty = {
    cards,
    range,
    staff: [],
    tables: [],
    totals: { taps: 0, attributedTaps: 0 },
    needsMigration: false,
  };
  if (cardIds.length === 0) return empty;

  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const [tapsResult, feedbacksResult] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('tap_logs')
        .select('id, card_id, staff_code, table_code, selected_stars, created_at')
        .in('card_id', cardIds)
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('id', { ascending: true })
        .range(from, to)
    ),
    fetchAllRows((from, to) =>
      supabase
        .from('internal_feedbacks')
        .select('id, card_id, staff_code, table_code, rating, created_at')
        .in('card_id', cardIds)
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .order('id', { ascending: true })
        .range(from, to)
    ),
  ]);

  if (isMissingSchemaError(tapsResult.error) || isMissingSchemaError(feedbacksResult.error)) {
    return { ...empty, needsMigration: true };
  }
  if (tapsResult.error) throw tapsResult.error;
  if (feedbacksResult.error) throw feedbacksResult.error;

  const taps = tapsResult.data;
  const feedbacks = feedbacksResult.data;

  return {
    cards,
    range,
    staff: buildLeaderboard({ taps, feedbacks, key: 'staff_code' }),
    tables: buildLeaderboard({ taps, feedbacks, key: 'table_code' }),
    totals: {
      taps: taps.length,
      attributedTaps: taps.filter((t) => t.staff_code || t.table_code).length,
    },
    needsMigration: false,
  };
}

/**
 * Recent 5★ reviews with text, usable for social proof graphics.
 * @param {string} merchantId
 */
export async function getSocialProofCandidates(merchantId) {
  await connection();
  const supabase = await createClient();
  const cards = await getClientCards(merchantId);
  const cardIds = cards.map((c) => c.id);
  if (cardIds.length === 0) return { cards, reviews: [] };

  const { data, error } = await supabase
    .from('internal_feedbacks')
    .select('id, rating, feedback_text, created_at, card_id, cards(store_name)')
    .in('card_id', cardIds)
    .eq('rating', 5)
    .not('feedback_text', 'is', null)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return {
    cards,
    reviews: (data || []).filter((review) => review.feedback_text?.trim()),
  };
}

/** Rolling seven-day Google link clicks and the latest private feedback for this store. */
export async function getReviewsFeedbackData(storeId) {
  const supabase = await createClient();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  return Promise.all([
    supabase.from('review_click_events')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .gte('created_at', sevenDaysAgo)
      .lte('created_at', new Date(now).toISOString()),
    supabase.from('customer_feedback')
      .select('id, table_number, category, feedback_text, customer_contact, created_at, resolved_status', { count: 'exact' })
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(25),
  ]);
}
