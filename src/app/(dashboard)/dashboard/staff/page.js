import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Trophy, Users, LayoutGrid, Zap } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import MigrationNotice from '../components/MigrationNotice';
import StaffLinkBuilder from '../components/StaffLinkBuilder';
import { getClientContext, getStaffPerformance } from '../queries';
import { DATE_RANGES } from '@/lib/date-range';

export const metadata = {
  title: 'Staff & Meja — Dashboard Nived',
};

export const instant = false;

function formatStars(value) {
  return value == null ? '—' : `${value.toFixed(1)}★`;
}

function formatRate(value) {
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

function RangePills({ active }) {
  return (
    <nav aria-label="Periode" className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-1 text-xs">
      {Object.entries(DATE_RANGES).map(([key, label]) => (
        <Link
          key={key}
          href={`/dashboard/staff?range=${key}`}
          aria-current={active === key ? 'page' : undefined}
          className={`rounded-lg px-2.5 py-1 font-medium transition ${
            active === key
              ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function LeaderboardTable({ title, icon: Icon, rows, codeLabel, formatCode, emptyText, ranked }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        <Icon className="size-4 text-brand-600 dark:text-brand-400" />
        {title}
      </h3>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-6 text-center text-xs text-zinc-500 shadow-xs">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-xs">
          <table className="min-w-full text-left text-sm" aria-label={title}>
            <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <tr>
                {ranked && <th scope="col" className="px-4 py-3">#</th>}
                <th scope="col" className="px-4 py-3">{codeLabel}</th>
                <th scope="col" className="px-4 py-3 text-right">Tap</th>
                <th scope="col" className="px-4 py-3 text-right">Rata-rata</th>
                <th scope="col" className="px-4 py-3 text-right">4–5★</th>
                <th scope="col" className="px-4 py-3 text-right">1–3★</th>
                <th scope="col" className="px-4 py-3 text-right">% Positif</th>
                <th scope="col" className="px-4 py-3 text-right">Keluhan tertulis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
              {rows.map((row, index) => (
                <tr key={row.code} className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                  {ranked && <td className="px-4 py-3 text-xs font-bold text-zinc-400">{index + 1}</td>}
                  <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{formatCode(row.code)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.taps.toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatStars(row.avgStars)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{row.positive}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-rose-600 dark:text-rose-400">{row.negative}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatRate(row.positiveRate)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.complaintCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function staffName(code) {
  return code
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function StaffPerformancePage({ searchParams }) {
  const ctx = await getClientContext();
  if (!ctx) redirect('/');

  const { range } = await searchParams;
  const data = await getStaffPerformance(ctx.profile.merchant_id, typeof range === 'string' ? range : 'month');
  const topPerformer = data.staff.find((row) => row.positive > 0);
  const tablesByComplaints = [...data.tables].sort(
    (a, b) => b.complaintCount - a.complaintCount || b.negative - a.negative || b.taps - a.taps
  );
  const untracked = data.totals.taps - data.totals.attributedTaps;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">Staff & Meja</h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Siapa yang paling banyak mendatangkan ulasan positif, dan meja mana yang paling sering dikeluhkan.
          </p>
        </div>
        <RangePills active={data.range.key} />
      </div>

      {data.needsMigration && <MigrationNotice feature="Tracking staf & meja" />}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Ringkasan staf">
        <StatCard label={`Tap ${data.range.label.toLowerCase()}`} value={data.totals.taps} icon={Zap} hint="Semua tap kartu & scan QR" />
        <StatCard
          label="Tap dengan kode staf/meja"
          value={data.totals.attributedTaps}
          icon={Users}
          hint={untracked > 0 ? `${untracked.toLocaleString('id-ID')} tap lewat link umum` : 'Semua tap sudah ter-tracking'}
        />
        <StatCard
          label="Staf terbaik"
          value={topPerformer ? staffName(topPerformer.code) : '—'}
          icon={Trophy}
          hint={
            topPerformer
              ? `${topPerformer.positive} rating 4–5★ · rata-rata ${formatStars(topPerformer.avgStars)}`
              : 'Belum ada rating lewat link staf'
          }
          badge={topPerformer ? 'Top' : undefined}
        />
      </section>

      <LeaderboardTable
        title="Leaderboard Staf"
        icon={Trophy}
        rows={data.staff}
        codeLabel="Staf"
        formatCode={staffName}
        ranked
        emptyText="Belum ada data staf di periode ini. Buat link per staf di bawah, lalu tempel di stiker NFC atau QR."
      />

      <LeaderboardTable
        title="Per Meja (paling banyak keluhan di atas)"
        icon={LayoutGrid}
        rows={tablesByComplaints}
        codeLabel="Meja"
        formatCode={(code) => `Meja ${code}`}
        emptyText="Belum ada data meja di periode ini. Tambahkan ?meja=12 di link kartu masing-masing meja."
      />

      <StaffLinkBuilder cards={data.cards} />

      <p className="text-[11px] text-zinc-500">
        Rating dihitung dari bintang yang dipilih pelanggan setelah tap. Keluhan tertulis = masukan 1–3★ yang dikirim lewat kotak masukan.
      </p>
    </div>
  );
}
