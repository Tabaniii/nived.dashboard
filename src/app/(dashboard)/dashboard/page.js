import { Zap, Calendar, Star, ShieldAlert } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import TrendCharts from './components/TrendCharts';
import FeedbackBox from './components/FeedbackBox';
import { getClientContext, getClientDashboardData } from './queries';

export const metadata = {
  title: 'Dashboard — Nived Reputation Shield',
};

export default async function ClientDashboardPage() {
  const ctx = await getClientContext();
  const data = await getClientDashboardData(ctx.profile.merchant_id);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
            {ctx.merchant?.business_name || 'Merchant Dashboard'}
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Pemilik: <span className="text-zinc-300 font-medium">{ctx.merchant?.owner_name}</span> &middot; Status: <span className="text-emerald-400 font-medium capitalize">{ctx.merchant?.status}</span>
          </p>
        </div>
      </div>

      {/* KPI Section */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan Kinerja">
        <StatCard
          label="Taps Hari Ini"
          value={data.kpi.tapsToday}
          icon={Zap}
          hint="Aktivitas tap & scan hari ini"
        />
        <StatCard
          label="Taps Bulan Ini"
          value={data.kpi.tapsMonth}
          icon={Calendar}
          hint="Akumulasi kunjungan bulan ini"
        />
        <StatCard
          label="Ulasan Positif (4–5★)"
          value={data.kpi.positiveReviews}
          icon={Star}
          hint="Rating positif dari halaman slug"
          badge="Internal"
        />
        <StatCard
          label="Keluhan Terlindungi (1–3★)"
          value={data.kpi.shieldedComplaints}
          icon={ShieldAlert}
          hint="Ditahan di kotak masukan internal"
          badge="Shielded"
        />
      </section>

      {/* Trend Analytics Section */}
      <TrendCharts
        initialDaily={data.daily}
        initialWeekly={data.weekly}
        initialPeakHours={data.peakHours}
      />

      {/* Private Feedback Box Section */}
      <FeedbackBox feedbacks={data.feedbacks} />
    </div>
  );
}
