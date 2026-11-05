import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { collectDigestTargets } from '@/lib/alerts';
import { isAuthorizedCronRequest } from '@/lib/insights/cron-auth';
import { generateAndStoreSummary } from '@/lib/insights/store';
import { buildWeeklySummaryMessage } from '@/lib/insights/message';
import { getNotifyConfig, sendFonnteMessage, sendTelegramMessage } from '@/lib/notify';
import { getBaseUrl } from '@/lib/url';

export const instant = false;
export const maxDuration = 300;

const CONCURRENCY = 4;

async function deliverDigest(message, targets, config) {
  const results = await Promise.all([
    ...targets.whatsapp.map((target) => sendFonnteMessage({ target, message, token: config.fonnteToken })),
    ...targets.telegram.map((chatId) => sendTelegramMessage({ chatId, text: message, token: config.telegramBotToken })),
  ]);
  return results.filter((result) => result.ok).length;
}

async function processMerchant(admin, merchant, { config, dashboardUrl }) {
  try {
    const summary = await generateAndStoreSummary(merchant.id);
    if (!summary) return { merchant_id: merchant.id, skipped: true };
    let delivered = 0;

    if (summary.feedback_count > 0 && (config.fonnteToken || config.telegramBotToken)) {
      const { data: cards, error } = await admin
        .from('cards')
        .select('is_active, alerts_enabled, alert_whatsapp, alert_telegram_chat_id')
        .eq('merchant_id', merchant.id)
        .eq('is_active', true)
        .eq('alerts_enabled', true)
        .is('deleted_at', null);
      if (error) throw error;

      const message = buildWeeklySummaryMessage({ businessName: merchant.business_name, summary, dashboardUrl });
      delivered = await deliverDigest(message, collectDigestTargets(cards || []), config);
    }

    return { merchant_id: merchant.id, source: summary.source, feedback_count: summary.feedback_count, delivered };
  } catch (err) {
    console.error(`[cron/weekly-summary] Merchant ${merchant.id} failed:`, err?.code || err?.name);
    return { merchant_id: merchant.id, error: true };
  }
}

/**
 * Weekly AI feedback digest. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: merchants, error } = await admin
    .from('merchants')
    .select('id, business_name')
    .in('status', ['trial', 'active']);

  if (error) {
    console.error('[cron/weekly-summary] Failed to list merchants:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  const context = { config: getNotifyConfig(), dashboardUrl: `${getBaseUrl()}/dashboard/reviews-feedback` };
  const results = [];
  const queue = merchants || [];
  for (let index = 0; index < queue.length; index += CONCURRENCY) {
    const batch = queue.slice(index, index + CONCURRENCY);
    results.push(...(await Promise.all(batch.map((merchant) => processMerchant(admin, merchant, context)))));
  }

  return NextResponse.json({ processed: results.length, results });
}
