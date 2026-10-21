'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import useSWR from 'swr';
import { TrendingUp, BarChart2, Clock, Activity } from 'lucide-react';

const fetcher = (url) => fetch(url).then((r) => r.json());

const chartMargin = { top: 8, right: 8, left: -20, bottom: 0 };

const CustomTooltip = ({ active, payload, label, unit = 'taps' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 p-3 text-xs shadow-xl backdrop-blur-md">
        <p className="font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
        <p className="mt-1 font-bold text-brand-600 dark:text-brand-400">
          {payload[0].value.toLocaleString('id-ID')} <span className="font-normal text-zinc-500">{unit}</span>
        </p>
      </div>
    );
  }
  return null;
};

const TABS = [
  { id: 'daily', label: 'Harian' },
  { id: 'weekly', label: 'Mingguan' },
  { id: 'peak', label: 'Jam Sibuk' },
];

export default function TrendCharts({ initialDaily, initialWeekly, initialPeakHours }) {
  const [activeTab, setActiveTab] = useState('daily');

  const { data } = useSWR('/api/dashboard/analytics', fetcher, {
    fallbackData: {
      daily: initialDaily,
      weekly: initialWeekly,
      peakHours: initialPeakHours,
    },
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0,
  });

  const daily = data?.daily || [];
  const weekly = data?.weekly || [];
  const peakHours = data?.peakHours || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp className="size-4 text-brand-600 dark:text-brand-400" />
            <span>Tren Tap & Interaksi</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Aktivitas fisik pelanggan pada kartu NFC dan kode QR
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-1 text-xs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-4 sm:p-5 shadow-xs">
        {activeTab === 'daily' && (
          <>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Activity className="size-3.5 text-brand-600 dark:text-brand-400" />
                Daily Taps (28 Hari Terakhir)
              </h3>
              <p className="text-[11px] text-zinc-500">Volume kunjungan harian pelanggan</p>
            </div>
            <div className="h-64 w-full">
              {daily.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                  Belum ada data tap dalam 28 hari terakhir.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#71717a', strokeOpacity: 0.2 }}
                      tickFormatter={(val) => {
                        const parts = String(val).split('-');
                        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                      }}
                    />
                    <YAxis stroke="#71717a" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ stroke: '#2A53E7', strokeDasharray: '3 3', strokeOpacity: 0.4 }}
                      content={<CustomTooltip unit="taps" />}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2A53E7"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                      activeDot={{ r: 5, fill: '#608df3', stroke: '#1b2d80', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}

        {activeTab === 'weekly' && (
          <>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <BarChart2 className="size-3.5 text-brand-600 dark:text-brand-400" />
                Volume Mingguan
              </h3>
              <p className="text-[11px] text-zinc-500">Agregat mingguan untuk pemetaan tren</p>
            </div>
            <div className="h-64 w-full">
              {weekly.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                  Belum ada data mingguan.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="week"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#71717a', strokeOpacity: 0.2 }}
                    />
                    <YAxis stroke="#71717a" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={false} content={<CustomTooltip unit="taps" />} />
                    <Bar dataKey="count" fill="#2A53E7" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}

        {activeTab === 'peak' && (
          <>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Clock className="size-3.5 text-brand-600 dark:text-brand-400" />
                Jam Sibuk / Peak Hours
              </h3>
              <p className="text-[11px] text-zinc-500">
                Identifikasi jam operasional teramai untuk optimasi staf
              </p>
            </div>
            <div className="h-64 w-full">
              {peakHours.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
                  Belum ada data distribusi jam.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.15} vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#71717a', strokeOpacity: 0.2 }}
                      interval={1}
                    />
                    <YAxis stroke="#71717a" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={false} content={<CustomTooltip unit="taps" />} />
                    <Bar dataKey="count" fill="#608df3" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
