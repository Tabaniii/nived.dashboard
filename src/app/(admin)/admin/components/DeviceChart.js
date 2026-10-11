'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import { Smartphone } from 'lucide-react';

const COLORS = {
  iOS: '#3b82f6', // blue
  Android: '#10b981', // emerald
  Other: '#a1a1aa', // zinc
};

const CustomTooltip = ({ active, payload, label, total = 0 }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-xs shadow-xl backdrop-blur-md">
        <p className="font-semibold text-zinc-300">{label}</p>
        <p className="mt-1 font-bold text-emerald-400">
          {val.toLocaleString('id-ID')} <span className="font-normal text-zinc-500">taps</span>
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{pct}% dari total taps</p>
      </div>
    );
  }
  return null;
};

export default function DeviceChart({ breakdown }) {
  const ios = breakdown?.iOS || 0;
  const android = breakdown?.Android || 0;
  const other = breakdown?.Other || 0;
  const total = ios + android + other;

  const data = [
    { name: 'iOS', value: ios, color: COLORS.iOS },
    { name: 'Android', value: android, color: COLORS.Android },
    { name: 'Other', value: other, color: COLORS.Other },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
            <Smartphone className="size-4 text-emerald-400" />
            <span>Distribusi Sistem Operasi Device</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Breakdown perangkat pelanggan yang melakukan tap NFC
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-500">{total.toLocaleString('id-ID')} total</span>
      </div>

      <div className="h-56 w-full">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">
            Belum ada aktivitas tap tercatat.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#27272a' }} />
              <YAxis stroke="#71717a" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip total={total} />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Percentage Indicators */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-center">
        {data.map((item) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
          return (
            <div key={item.name} className="rounded-xl bg-zinc-950/50 p-2 border border-zinc-800/40">
              <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-400">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
              <p className="mt-0.5 text-sm font-bold text-zinc-100">{pct}%</p>
              <p className="text-[10px] text-zinc-500 font-mono">{item.value.toLocaleString('id-ID')}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
