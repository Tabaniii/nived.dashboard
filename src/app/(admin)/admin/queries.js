import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/session';

/** Session-scoped check shared by the admin layout and service-role reads. */
export const getAdminProfile = cache(async () => {
  const session = await requireRole('admin');
  return session?.profile ?? null;
});

async function getAuthorizedAdminClient() {
  if (!(await getAdminProfile())) redirect('/');
  return isAdminClientConfigured() ? createAdminClient() : null;
}

export async function getAdminOverview() {
  const admin = await getAuthorizedAdminClient();
  if (!admin) {
    return {
      totalTaps: 0,
      activeMerchants: 0,
      totalCards: 0,
      deviceBreakdown: { iOS: 0, Android: 0, Other: 0 },
    };
  }
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
  const admin = await getAuthorizedAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from('merchants')
    .select('*, profiles!merchant_id(id, email, full_name), cards(id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listCards() {
  const admin = await getAuthorizedAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from('cards')
    .select('*, merchants(business_name, status)')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function listTelemetry({ limit = 200 } = {}) {
  const admin = await getAuthorizedAdminClient();
  if (!admin) return { taps: [], feedbacks: [] };
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
