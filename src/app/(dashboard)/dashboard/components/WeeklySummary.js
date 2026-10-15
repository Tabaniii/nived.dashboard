import { connection } from 'next/server';
import { Sparkles, Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAlertThrottle } from '@/lib/alerts';
import { generateAndStoreSummary, getLatestSummary, isSummaryStale } from '@/lib/insights/store';
import MigrationNotice from './MigrationNotice';
import RefreshSummaryButton from './RefreshSummaryButton';

const autoGenerateThrottle = createAlertThrottle({ perSourceWindowMs: 10 * 60_000 });

const dayFormatter = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short' });
const stampFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'medium',
  timeStyle: 'short',
});

const panelClass =
  'rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs';

function Header({ summary }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <Sparkles className="size-4 text-brand-600 dark:text-brand-400" />
          Ringkasan Mingguan
          {summary && (
            <span className="rounded-full border border-brand-500/20 bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-400">
              {summary.source === 'ai' ? 'Gemini AI' : 'Analisis otomatis'}
            </span>
          )}
        </h2>
        {summary && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {dayFormatter.format(new Date(summary.period_start))} – {dayFormatter.format(new Date(summary.period_end))} ·{' '}
            {summary.feedback_count} masukan · {summary.complaint_count} keluhan 1–3★
            {summary.avg_rating != null ? ` · rata-rata ${Number(summary.avg_rating).toFixed(1)}★` : ''}
          </p>
        )}
      </div>
      <RefreshSummaryButton />
    </div>
  );
}

export function WeeklySummarySkeleton() {
  return (
    <section className={`${panelClass} space-y-3`} aria-busy="true" aria-label="Memuat ringkasan mingguan">
      <div className="h-4 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />
    </section>
  );
}

export default async function WeeklySummary({ merchantId }) {
  await connection();
  const supabase = await createClient();
  let { needsMigration, summary } = await getLatestSummary(supabase, merchantId);

  if (needsMigration) return <MigrationNotice feature="Ringkasan AI mingguan" />;

  if (isSummaryStale(summary) && autoGenerateThrottle.allow(merchantId, 'auto')) {
    try {
      summary = await generateAndStoreSummary(merchantId);
    } catch (err) {
      console.error('[dashboard] Weekly summary generation failed:', err);
    }
  }

  if (!summary) {
    return (
      <section className={`${panelClass} space-y-2`}>
        <Header summary={null} />
        <p className="text-xs text-zinc-500">Ringkasan belum tersedia. Tekan Perbarui untuk membuatnya sekarang.</p>
      </section>
    );
  }

  const themes = Array.isArray(summary.themes) ? summary.themes : [];
  const actions = Array.isArray(summary.actions) ? summary.actions : [];

  return (
    <section className={`${panelClass} space-y-4`} aria-label="Ringkasan mingguan">
      <Header summary={summary} />

      <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{summary.summary}</p>

      {themes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tema utama</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {themes.map((theme) => (
              <li
                key={theme.label}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3"
              >
                <div className="flex items-center justify-between gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <span>{theme.label}</span>
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                    {theme.count}×
                  </span>
                </div>
                {theme.detail && <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{theme.detail}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {actions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Saran minggu depan</h3>
          <ol className="space-y-1.5">
            {actions.map((action, index) => (
              <li key={action} className="flex items-start gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-500" />
                <span>
                  <span className="font-semibold">{index + 1}.</span> {action}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
        Dibuat {stampFormatter.format(new Date(summary.created_at))} WIB · diperbarui otomatis tiap minggu
      </p>
    </section>
  );
}
