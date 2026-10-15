'use client';

import { useEffect, useState } from 'react';
import { Radio, Star, Smartphone, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LiveAuditFeed({ initialEvents = [] }) {
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('admin-tap-audit')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tap_logs' },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev].slice(0, 40));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-5 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Activity className="size-4 text-brand-600 dark:text-brand-400" />
              <span>Realtime Audit Ticker</span>
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:text-brand-400 border border-brand-500/20">
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-brand-500" />
              </span>
              <span>LIVE</span>
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Event fisik tap NFC & scan QR dari seluruh toko mitra
          </p>
        </div>
        <Radio className="size-4 text-zinc-400 dark:text-zinc-600 animate-pulse" />
      </div>

      <ul className="max-h-72 space-y-2 overflow-y-auto pr-1 text-sm custom-scrollbar">
        {events.length === 0 ? (
          <li className="flex flex-col items-center justify-center p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 rounded-xl border border-zinc-200/80 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-950/40">
            <span>Belum ada event tap realtime.</span>
          </li>
        ) : (
          events.map((event, idx) => {
            const hasStars = event.selected_stars != null;
            const isHigh = event.selected_stars >= 4;

            return (
              <li
                key={event.id || `${event.created_at}-${idx}`}
                className="group rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950/60 p-3 transition hover:border-zinc-300 dark:hover:border-zinc-700/80 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                      {event.cards?.store_name || event.cards?.slug || (event.card_id ? `Card #${event.card_id.slice(0, 8)}` : 'Tap Event')}
                    </span>
                    {hasStars && (
                      <span
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold border ${
                          isHigh
                            ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20'
                            : 'bg-brand-500/10 text-brand-700 dark:text-brand-400 border border-brand-500/20'
                        }`}
                      >
                        <Star className="size-2.5 fill-current" />
                        <span>{event.selected_stars}★</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {event.created_at
                      ? new Date(event.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'Baru saja'}
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Smartphone className="size-3 text-zinc-400 dark:text-zinc-500" />
                    <span>{event.device_os || 'Unknown OS'}</span>
                  </span>
                  {hasStars ? (
                    <span className="text-[10px] text-zinc-500">
                      {isHigh ? 'Redirect: Google Maps' : 'Shielded: Private Form'}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic">Initial tap view</span>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
