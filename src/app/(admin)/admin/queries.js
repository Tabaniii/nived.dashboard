import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function getAdminOverview() {
  if (!isAdminClientConfigured()) {
    return {
      totalTaps: 0,
      activeMerchants: 0,
      totalCards: 0,
      deviceBreakdown: { iOS: 0, Android: 0, Other: 0 },
    };
  }
  const admin = createAdminClient();

  const [
    { count: totalTaps },
    { count: activeMerchants },
    { count: totalCards },
    { data: deviceRows },
  ] = await Promise.all([
    admin.from('tap_logs').select('id', { count: 'exact', head: true }),
    admin
      .from('merchants')
      .select('id', { count: 'exact', head: true })
      .in('status', ['trial', 'active']),
    admin
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
    admin.from('tap_logs').select('device_os').limit(5000),
  ]);

  const deviceBreakdown = { iOS: 0, Android: 0, Other: 0 };
  for (const row of deviceRows || []) {
    const key = deviceBreakdown[row.device_os] !== undefined ? row.device_os : 'Other';
    deviceBreakdown[key] += 1;
  }

  return {
    totalTaps: totalTaps || 0,
    activeMerchants: activeMerchants || 0,
    totalCards: totalCards || 0,
    deviceBreakdown,
  };
}

export async function listMerchants() {
  if (!isAdminClientConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('merchants')
    .select('*, profiles(id, email, full_name), cards(id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listCards() {
  if (!isAdminClientConfigured()) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('cards')
    .select('*, merchants(business_name, status)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listTelemetry({ limit = 200 } = {}) {
  if (!isAdminClientConfigured()) return { taps: [], feedbacks: [] };
  const admin = createAdminClient();
  const { data: taps, error } = await admin
    .from('tap_logs')
    .select('id, card_id, device_os, user_agent, selected_stars, ip_hash, created_at, cards(slug, store_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  const { data: feedbacks } = await admin
    .from('internal_feedbacks')
    .select('id, card_id, rating, feedback_text, customer_whatsapp, created_at, cards(slug, store_name)')
    .order('created_at', { ascending: false })
    .limit(limit);

  return { taps: taps || [], feedbacks: feedbacks || [] };
}

/** Session-scoped check using cookie client (RLS). */
export async function getAdminProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  return profile?.role === 'admin' ? profile : null;
}
