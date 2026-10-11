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

const CustomTooltip = ({ active, payload, label, unit = 'taps' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-xs shadow-xl backdrop-blur-md">
        <p className="font-medium text-zinc-400">{label}</p>
        <p className="mt-1 font-bold text-emerald-400">
          {payload[0].value.toLocaleString('id-ID')} <span className="font-normal text-zinc-500">{unit}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function TrendCharts({ initialDaily, initialWeekly, initialPeakHours }) {
  const [activeTab, setActiveTab] = useState('all');

  const { data } = useSWR('/api/dashboard/analytics', fetcher, {
    fallbackData: {
      daily: initialDaily,
      weekly: initialWeekly,
      peakHours: initialPeakHours,
    },
    refreshInterval: 60_000,
  });

  const daily = data?.daily || [];
  const weekly = data?.weekly || [];
  const peakHours = data?.peakHours || [];

  return (
    <div className="space-y-4">
      {/* Header & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-400" />
            <span>Tren Tap & Interaksi</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Aktivitas fisik pelanggan pada kartu NFC dan kode QR
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Harian
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
              activeTab === 'weekly'
                ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Mingguan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('peak')}
            className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
              activeTab === 'peak'
                ? 'bg-zinc-800 text-zinc-100 shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Jam Sibuk
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily Taps Line Chart */}
        {(activeTab === 'all' || activeTab === 'daily') && (
          <div
            className={`rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 sm:p-5 shadow-sm transition hover:border-zinc-700/80 ${
              activeTab === 'daily' ? 'lg:col-span-2' : ''
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
                  <Activity className="size-3.5 text-emerald-400" />
                  Daily Taps (28 Hari Terakhir)
                </h3>
                <p className="text-[11px] text-zinc-500">Volume kunjungan harian pelanggan</p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                Live Sync
              </span>
            </div>

            <div className="h-64 w-full">
              {daily.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  Belum ada data tap dalam 28 hari terakhir.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#27272a' }}
                      tickFormatter={(val) => {
                        const parts = String(val).split('-');
                        return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                      }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip unit="taps" />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#34d399', stroke: '#064e3b', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Weekly Volume Bar Chart */}
        {(activeTab === 'all' || activeTab === 'weekly') && (
          <div
            className={`rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 sm:p-5 shadow-sm transition hover:border-zinc-700/80 ${
              activeTab === 'weekly' ? 'lg:col-span-2' : ''
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
                  <BarChart2 className="size-3.5 text-emerald-400" />
                  Volume Mingguan
                </h3>
                <p className="text-[11px] text-zinc-500">Agregat mingguan untuk pemetaan tren</p>
              </div>
            </div>

            <div className="h-64 w-full">
              {weekly.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  Belum ada data mingguan.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                      dataKey="week"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#27272a' }}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip unit="taps" />} />
                    <Bar dataKey="count" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Peak Hours Spike Bar Chart */}
        {(activeTab === 'all' || activeTab === 'peak') && (
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 sm:p-5 shadow-sm transition hover:border-zinc-700/80 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-emerald-400" />
                  Jam Sibuk / Peak Hours (Makan Siang & Malam)
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Identifikasi jam operasional teramai untuk optimasi staf kasir/waiter
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              {peakHours.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-500">
                  Belum ada data distribusi jam.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peakHours} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                      dataKey="hour"
                      stroke="#71717a"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#27272a' }}
                      interval={1}
                    />
                    <YAxis
                      stroke="#71717a"
                      fontSize={10}
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip unit="taps" />} />
                    <Bar dataKey="count" fill="#6ee7b7" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
