import { Radio, Users, CreditCard } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import DeviceChart from './components/DeviceChart';
import LiveAuditFeed from './components/LiveAuditFeed';
import { getAdminOverview, listTelemetry } from './queries';

export const metadata = {
  title: 'Admin Overview — Nived Platform',
};

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();
  const { taps } = await listTelemetry({ limit: 25 });

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          Platform Overview
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Metrik operasional global, provisioning kartu fisik, dan audit tap realtime seluruh merchant.
        </p>
      </div>

      {/* Global Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Statistik Global">
        <StatCard
          label="Total Platform Taps"
          value={overview.totalTaps}
          icon={Radio}
          hint="Total seluruh tap NFC & scan QR"
        />
        <StatCard
          label="Merchant Aktif"
          value={overview.activeMerchants}
          icon={Users}
          hint="Merchant berstatus trial & active"
          badge="Operasional"
        />
        <StatCard
          label="Kartu NFC Diterbitkan"
          value={overview.totalCards}
          icon={CreditCard}
          hint="Total fisik kartu NTAG215 diprovisi"
        />
      </section>

      {/* Analytics & Realtime Grid */}
      <section className="grid gap-6 lg:grid-cols-2" aria-label="Grafik & Live Feed">
        <DeviceChart breakdown={overview.deviceBreakdown} />
        <LiveAuditFeed initialEvents={taps} />
      </section>
    </div>
  );
}
