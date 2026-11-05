import Link from 'next/link';
import dynamic from 'next/dynamic';
import { redirect } from 'next/navigation';
import { Zap, Calendar, Star, ShieldAlert } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import FeedbackBox from './components/FeedbackBox';
import { getClientContext, getClientDashboardData } from './queries';

const TrendCharts = dynamic(() => import('./components/TrendCharts'), {
  loading: () => (
    <div className="h-80 animate-pulse rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40" />
  ),
});

export const metadata = {
  title: 'Dashboard — Nived Reputation Shield',
};

export const instant = false;

export default async function ClientDashboardPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect('/login');
  if (!ctx.merchant) return null;
  const data = await getClientDashboardData(ctx.merchant.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
            {ctx.merchant?.business_name || 'Merchant Dashboard'}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Pemilik: <span className="text-zinc-800 dark:text-zinc-300 font-medium">{ctx.merchant?.owner_name}</span> &middot;
            Status:{' '}
            <span className="text-brand-600 dark:text-brand-400 font-semibold capitalize">{ctx.merchant?.status}</span>
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan Kinerja">
        <StatCard label="Penjualan Hari Ini" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.kpi.salesToday)} icon={Zap} hint="Pembayaran POS berhasil · WIB" />
        <StatCard label="Pesanan Meja Aktif" value={data.kpi.activeTableOrders} icon={Calendar} hint="Pesanan meja yang belum selesai" />
        <StatCard
          label="Google Review Taps"
          value={data.kpi.reviewClicks}
          icon={Star}
          hint="Klik tautan Google Maps · 7 hari terakhir"
          badge="7 Hari"
        />
        <StatCard
          label="Masukan Pribadi"
          value={data.kpi.privateFeedbacks}
          icon={ShieldAlert}
          hint="Masukan yang diterima manajemen"
          badge="Semua Waktu"
        />
      </section>

      <Link href="/dashboard/reviews-feedback" className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline dark:text-brand-400">Reputation &amp; Feedback Hub</Link>

      <TrendCharts
        storeId={ctx.merchant.id}
        initialDaily={data.daily}
        initialWeekly={data.weekly}
        initialPeakHours={data.peakHours}
      />

      <FeedbackBox feedbacks={data.feedbacks} businessName={ctx.merchant.business_name} />
    </div>
  );
}
