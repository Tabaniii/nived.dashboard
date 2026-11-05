import { createClient } from '@/lib/supabase/server';
import { buildWeeklySummaryMessage } from '@/lib/insights/message';
import { getLatestSummary } from '@/lib/insights/store';
import MigrationNotice from './MigrationNotice';
import { CopySummaryButton } from '../reviews-feedback/FeedbackControls';
import RefreshSummaryButton from './RefreshSummaryButton';

const dayFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' });
const stampFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'medium',
  timeStyle: 'short',
});

const panelClass =
  'rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40';

export function WeeklySummarySkeleton() {
  return (
    <section className={`${panelClass} space-y-3`} aria-busy="true" aria-label="Memuat ringkasan mingguan">
      <h2 className="text-base font-semibold">Weekly AI Sentiment Briefing</h2>
      <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800/60" />
      <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800/60" />
    </section>
  );
}

export default async function WeeklySummary({ merchantId, businessName }) {
  const supabase = await createClient();
  const { needsMigration, summary } = await getLatestSummary(supabase, merchantId);

  if (needsMigration) return <MigrationNotice feature="Ringkasan AI mingguan" reputationHub />;

  return (
    <section className={`${panelClass} space-y-4`} aria-labelledby="weekly-briefing-heading">
      <header>
        <h2 id="weekly-briefing-heading" className="text-base font-semibold">Weekly AI Sentiment Briefing</h2>
        {summary && (
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            {dayFormatter.formatRange(new Date(summary.period_start), new Date(summary.period_end))} ·{' '}
            {summary.feedback_count} masukan pribadi · {summary.source === 'ai' ? 'Gemini AI' : 'Analisis otomatis'}
          </p>
        )}
      </header>
      {summary ? (
        <>
          <p className="whitespace-pre-line wrap-anywhere text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            {summary.summary}
          </p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Dibuat {stampFormatter.format(new Date(summary.created_at))} WIB
          </p>
        </>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ringkasan belum tersedia. Buat ringkasan dari masukan pribadi tujuh hari terakhir.
        </p>
      )}
      <div className="flex flex-wrap items-start gap-2">
        <RefreshSummaryButton storeId={merchantId} />
        {summary && <CopySummaryButton text={buildWeeklySummaryMessage({ businessName, summary })} />}
      </div>
    </section>
  );
}
