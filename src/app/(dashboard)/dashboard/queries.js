import { createClient } from '@/lib/supabase/server';

export async function getClientContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, full_name, merchant_id, merchants(id, business_name, status)')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'client' || !profile.merchant_id) {
    return null;
  }

  return { user, profile, merchant: profile.merchants };
}

export async function getClientCards(merchantId) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('merchant_id', merchantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getClientDashboardData(merchantId) {
  const supabase = await createClient();
  const cards = await getClientCards(merchantId);
  const cardIds = cards.map((c) => c.id);

  if (cardIds.length === 0) {
    return {
      cards,
      kpi: { tapsToday: 0, tapsMonth: 0, positiveReviews: 0, shieldedComplaints: 0 },
      daily: [],
      weekly: [],
      peakHours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
      feedbacks: [],
    };
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
  const startOfRange = new Date(startOfToday);
  startOfRange.setDate(startOfRange.getDate() - 27);

  const { data: taps } = await supabase
    .from('tap_logs')
    .select('id, selected_stars, created_at, card_id')
    .in('card_id', cardIds)
    .gte('created_at', startOfRange.toISOString());

  const { data: feedbacks } = await supabase
    .from('internal_feedbacks')
    .select('id, rating, feedback_text, customer_whatsapp, created_at, card_id, cards(store_name)')
    .in('card_id', cardIds)
    .order('created_at', { ascending: false })
    .limit(100);

  const allTaps = taps || [];
  const tapsToday = allTaps.filter((t) => new Date(t.created_at) >= startOfToday).length;
  const tapsMonth = allTaps.filter((t) => new Date(t.created_at) >= startOfMonth).length;
  const positiveReviews = allTaps.filter(
    (t) => t.selected_stars === 4 || t.selected_stars === 5
  ).length;

  const { count: shieldedComplaints } = await supabase
    .from('internal_feedbacks')
    .select('id', { count: 'exact', head: true })
    .in('card_id', cardIds);

  const dailyMap = new Map();
  const hourMap = new Map(Array.from({ length: 24 }, (_, h) => [h, 0]));

  for (const tap of allTaps) {
    const d = new Date(tap.created_at);
    const dayKey = d.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);
    hourMap.set(d.getHours(), (hourMap.get(d.getHours()) || 0) + 1);
  }

  const daily = [];
  for (let i = 27; i >= 0; i -= 1) {
    const d = new Date(startOfToday);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ date: key, count: dailyMap.get(key) || 0 });
  }

  const weekly = [];
  for (let w = 3; w >= 0; w -= 1) {
    const end = new Date(startOfToday);
    end.setDate(end.getDate() - w * 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    const count = allTaps.filter((t) => {
      const ts = new Date(t.created_at);
      return ts >= start && ts <= new Date(end.getTime() + 86400000 - 1);
    }).length;
    weekly.push({
      week: `${start.toISOString().slice(5, 10)}–${end.toISOString().slice(5, 10)}`,
      count,
    });
  }

  const peakHours = Array.from(hourMap.entries()).map(([hour, count]) => ({
    hour: `${String(hour).padStart(2, '0')}:00`,
    count,
  }));

  return {
    cards,
    kpi: {
      tapsToday,
      tapsMonth,
      positiveReviews,
      shieldedComplaints: shieldedComplaints || 0,
    },
    daily,
    weekly,
    peakHours,
    feedbacks: feedbacks || [],
  };
}
