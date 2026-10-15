'use client';

import { useState } from 'react';
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
  iOS: '#608df3',
  Android: '#2A53E7',
  Other: '#a1a1aa',
};

const CustomTooltip = ({ active, payload, label, total = 0 }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const color = payload[0]?.payload?.color || COLORS[label] || '#2A53E7';
    const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 p-3 text-xs shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">{label}</p>
        </div>
        <p className="mt-1 font-bold" style={{ color }}>
          {val.toLocaleString('id-ID')} <span className="font-normal text-zinc-500">taps</span>
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{pct}% dari total taps</p>
      </div>
    );
  }
  return null;
};

export default function DeviceChart({ breakdown }) {
  const [activeIndex, setActiveIndex] = useState(null);

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
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Smartphone className="size-4 text-brand-600 dark:text-brand-400" />
            <span>Distribusi Sistem Operasi Device</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Breakdown perangkat pelanggan yang melakukan tap NFC
          </p>
        </div>
        <span className="text-xs font-mono text-zinc-500">{total.toLocaleString('id-ID')} total</span>
      </div>

      <div className="h-56 w-full">
        {total === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
            Belum ada aktivitas tap tercatat.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#71717a" strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} axisLine={{ stroke: '#71717a', strokeOpacity: 0.2 }} />
              <YAxis stroke="#71717a" fontSize={10} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip total={total} />} />
              <Bar
                dataKey="value"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={entry.color}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                    style={{
                      transition: 'opacity 0.2s ease, filter 0.2s ease',
                      filter: activeIndex === index ? 'brightness(1.15)' : 'none',
                    }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Percentage Indicators */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800/60 text-center">
        {data.map((item, index) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
          const isHighlighted = activeIndex === index;
          return (
            <div
              key={item.name}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`rounded-xl p-2 border transition-all cursor-pointer ${
                isHighlighted
                  ? 'bg-zinc-100 dark:bg-zinc-800/90 border-zinc-300 dark:border-zinc-700 shadow-xs scale-[1.02]'
                  : 'bg-zinc-50/80 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700/60'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
              </div>
              <p className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">{pct}%</p>
              <p className="text-[10px] text-zinc-500 font-mono">{item.value.toLocaleString('id-ID')}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
