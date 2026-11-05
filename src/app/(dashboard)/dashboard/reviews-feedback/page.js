import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { isMissingSchemaError } from '@/lib/db-errors';
import { getClientContext, getReviewsFeedbackData } from '../queries';
import MigrationNotice from '../components/MigrationNotice';
import WeeklySummary, { WeeklySummarySkeleton } from '../components/WeeklySummary';
import { ResolutionToggle } from './FeedbackControls';

export const metadata = { title: 'Reputation & Feedback Hub' };
export const instant = false;

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const countFormatter = new Intl.NumberFormat('id-ID');

const panelClass = 'rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40';

export default async function ReviewsFeedbackPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect('/login');
  if (!ctx.merchant) return null;
  const { id: storeId, business_name: businessName } = ctx.merchant;
  const [clicks, feedback] = await getReviewsFeedbackData(storeId);

  for (const { error } of [clicks, feedback]) {
    if (error && !isMissingSchemaError(error)) throw error;
  }

  return (
    <div className="space-y-6">
      <header className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">Reputation &amp; Feedback Hub</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{businessName}</p>
      </header>
      {clicks.error || feedback.error ? <MigrationNotice feature="Reputation &amp; Feedback Hub" reputationHub /> : (
        <>
          <dl className={`${panelClass} grid grid-cols-2 overflow-hidden`}>
            <div className="row-span-2 grid grid-rows-subgrid gap-1 p-4 sm:p-5">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">Total Google Review Taps (Last 7 Days)</dt>
              <dd>
                <span className="block text-3xl font-bold tabular-nums">{countFormatter.format(clicks.count ?? 0)}</span>
                <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">Klik tautan Google Maps</span>
              </dd>
            </div>
            <div className="row-span-2 grid grid-rows-subgrid gap-1 border-l border-zinc-200 p-4 sm:p-5 dark:border-zinc-800">
              <dt className="text-sm text-zinc-600 dark:text-zinc-400">Private Feedbacks Received</dt>
              <dd>
                <span className="block text-3xl font-bold tabular-nums">{countFormatter.format(feedback.count ?? 0)}</span>
                <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">Semua waktu</span>
              </dd>
            </div>
          </dl>

          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <section aria-labelledby="latest-feedback-heading" className={panelClass}>
              <header className="flex flex-wrap items-center justify-between gap-x-4 px-5 pt-5 pb-3 xl:pb-5">
                <div>
                  <h2 id="latest-feedback-heading" className="text-base font-semibold">Latest Private Feedbacks</h2>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Menampilkan hingga 25 masukan terbaru</p>
                </div>
                <a href="#weekly-briefing" className="inline-flex min-h-11 items-center text-xs font-semibold text-brand-700 underline focus-visible:outline-2 focus-visible:outline-brand-500 xl:hidden dark:text-brand-300">
                  Ke ringkasan mingguan
                </a>
              </header>
              {feedback.data.length ? (
                <ul className="divide-y divide-zinc-200 border-t border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {feedback.data.map((item) => (
                    <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-5 py-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-zinc-800 dark:text-zinc-200">
                        <span className="wrap-anywhere font-semibold">Meja {item.table_number ?? '—'}</span>
                        <span className="rounded-full bg-zinc-100 px-2 py-1 font-medium dark:bg-zinc-800">{item.category}</span>
                      </div>
                      <ResolutionToggle id={item.id} storeId={storeId} resolved={item.resolved_status} tableNumber={item.table_number} />
                      <p className="col-span-2 whitespace-pre-wrap wrap-anywhere text-sm">{item.feedback_text}</p>
                      <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pb-1 text-xs text-zinc-600 dark:text-zinc-400">
                        <p className="wrap-anywhere">
                          {item.customer_contact ? `Kontak · ${item.customer_contact}` : 'Anonymous'}
                        </p>
                        <time dateTime={item.created_at}>{dateFormatter.format(new Date(item.created_at))} WIB</time>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t border-zinc-200 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">Belum ada masukan pribadi untuk toko ini.</p>
              )}
            </section>
            <div id="weekly-briefing" className={ctx.profile.dashboard_role === 'superadmin' ? 'scroll-mt-44' : 'scroll-mt-24'}>
              <Suspense fallback={<WeeklySummarySkeleton />}>
                <WeeklySummary merchantId={storeId} businessName={businessName} />
              </Suspense>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
