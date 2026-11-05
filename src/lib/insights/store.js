import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { generateFeedbackSummary } from '@/lib/insights/summary';
import { isMissingSchemaError } from '@/lib/db-errors';

export const SUMMARY_PERIOD_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * Latest stored weekly summary, read with the caller's (RLS-scoped) client.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} merchantId
 * @returns {Promise<{ needsMigration: boolean, summary: Object|null }>}
 */
export async function getLatestSummary(supabase, merchantId) {
  const { data, error } = await supabase
    .from('feedback_summaries')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('private_feedback_only', true)
    .order('period_end', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return { needsMigration: true, summary: null };
    throw error;
  }
  return { needsMigration: false, summary: data };
}

/**
 * @param {Object|null} summary
 * @param {Date} [now]
 */
export function isSummaryStale(summary, now = new Date()) {
  if (!summary?.created_at) return true;
  return now.getTime() - new Date(summary.created_at).getTime() >= SUMMARY_PERIOD_DAYS * DAY_MS;
}

/**
 * Summarize the merchant's last 7 days of feedback and persist the result.
 * Uses the service role so it also works from the weekly cron job.
 *
 * @param {string} merchantId
 * @param {{ now?: Date, includeSuspended?: boolean }} [options]
 */
export async function generateAndStoreSummary(merchantId, { now = new Date(), includeSuspended = false } = {}) {
  const admin = createAdminClient();
  const periodStart = new Date(now.getTime() - SUMMARY_PERIOD_DAYS * DAY_MS);

  let storeQuery = admin
    .from('merchants')
    .select('business_name')
    .eq('id', merchantId);
  if (!includeSuspended) storeQuery = storeQuery.in('status', ['active', 'trial']);
  const { data: store, error: storeError } = await storeQuery.maybeSingle();
  if (storeError) throw storeError;
  if (!store) return null;

  const feedbacks = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from('customer_feedback')
      .select('category, feedback_text, table_number, sentiment_tag, created_at')
      .eq('store_id', merchantId)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    feedbacks.push(...data);
    if (data.length < pageSize) break;
  }

  const result = await generateFeedbackSummary(feedbacks, { storeName: store.business_name || 'Toko Anda' });

  const row = {
    merchant_id: merchantId,
    private_feedback_only: true,
    period_start: periodStart.toISOString(),
    period_end: now.toISOString(),
    feedback_count: result.feedbackCount,
    complaint_count: result.complaintCount,
    avg_rating: result.avgRating,
    summary: result.summary,
    themes: result.themes,
    actions: result.actions,
    source: result.source,
  };

  const { data: inserted, error: insertError } = await admin
    .from('feedback_summaries')
    .insert([row])
    .select()
    .single();
  if (insertError) throw insertError;

  return inserted;
}
