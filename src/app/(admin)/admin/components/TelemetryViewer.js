'use client';

import { useState } from 'react';
import { Search, Star, Smartphone, MessageSquare, PhoneCall, Radio, Filter } from 'lucide-react';
import TelemetryExport from './TelemetryExport';

export default function TelemetryViewer({ taps = [], feedbacks = [] }) {
  const [tab, setTab] = useState('taps');
  const [search, setSearch] = useState('');

  const filteredTaps = taps.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.cards?.store_name?.toLowerCase().includes(q) ||
      t.cards?.slug?.toLowerCase().includes(q) ||
      t.device_os?.toLowerCase().includes(q) ||
      t.user_agent?.toLowerCase().includes(q)
    );
  });

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.cards?.store_name?.toLowerCase().includes(q) ||
      f.cards?.slug?.toLowerCase().includes(q) ||
      f.feedback_text?.toLowerCase().includes(q) ||
      f.customer_whatsapp?.includes(q)
    );
  });

  const getDeviceBadge = (os) => {
    switch (os) {
      case 'iOS':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
      case 'Android':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      default:
        return 'border-zinc-700 bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Exports */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
            <Search className="size-3.5" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari toko, slug, OS, atau masukan..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-8 pr-3 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>

        <TelemetryExport taps={filteredTaps} feedbacks={filteredFeedbacks} />
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setTab('taps')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
            tab === 'taps'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <Radio className="size-3.5" />
          <span>Tap Logs & Interaksi ({filteredTaps.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab('feedbacks')}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer border ${
            tab === 'feedbacks'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="size-3.5" />
          <span>Keluhan Pelanggan Terlindungi ({filteredFeedbacks.length})</span>
        </button>
      </div>

      {/* Tab Content: Tap Logs */}
      {tab === 'taps' && (
        <section className="space-y-3">
          {filteredTaps.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center text-xs text-zinc-500">
              Tidak ada data tap log yang sesuai kriteria pencarian.
            </div>
          ) : (
            <>
              {/* Mobile Card View (< 768px) */}
              <div className="space-y-3 md:hidden">
                {filteredTaps.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-zinc-100">
                        {t.cards?.store_name || t.cards?.slug || 'Kartu'}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(t.created_at).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${getDeviceBadge(
                          t.device_os
                        )}`}
                      >
                        <Smartphone className="size-2.5" />
                        <span>{t.device_os}</span>
                      </span>

                      {t.selected_stars != null ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                          <Star className="size-2.5 fill-current" />
                          <span>{t.selected_stars} Bintang</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-500 italic">Initial Tap</span>
                      )}
                    </div>

                    <p className="text-[10px] font-mono text-zinc-500 truncate" title={t.user_agent}>
                      {t.user_agent}
                    </p>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm">
                <table className="min-w-full text-left text-sm" aria-label="Tabel Telemetri Tap Logs">
                  <thead className="border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th scope="col" className="px-4 py-3.5">Waktu</th>
                      <th scope="col" className="px-4 py-3.5">Toko / Kartu</th>
                      <th scope="col" className="px-4 py-3.5">Device OS</th>
                      <th scope="col" className="px-4 py-3.5 text-center">Selected Stars</th>
                      <th scope="col" className="px-4 py-3.5">User-Agent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredTaps.map((t) => (
                      <tr key={t.id} className="transition hover:bg-zinc-800/30">
                        <td className="px-4 py-3.5 whitespace-nowrap text-xs text-zinc-400 font-mono">
                          {new Date(t.created_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-zinc-200">
                          {t.cards?.store_name || t.cards?.slug}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${getDeviceBadge(
                              t.device_os
                            )}`}
                          >
                            <Smartphone className="size-3" />
                            <span>{t.device_os}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          {t.selected_stars != null ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                              <Star className="size-3 fill-current" />
                              <span>{t.selected_stars}★</span>
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="max-w-md truncate px-4 py-3.5 text-xs font-mono text-zinc-500" title={t.user_agent}>
                          {t.user_agent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {/* Tab Content: Internal Feedbacks */}
      {tab === 'feedbacks' && (
        <section className="space-y-3">
          {filteredFeedbacks.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center text-xs text-zinc-500">
              Tidak ada data keluhan pelanggan yang cocok dengan pencarian.
            </div>
          ) : (
            <>
              {/* Mobile Card View (< 768px) */}
              <div className="space-y-3 md:hidden">
                {filteredFeedbacks.map((f) => {
                  const cleanPhone = f.customer_whatsapp?.replace(/\D/g, '');

                  return (
                    <div
                      key={f.id}
                      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                            <Star className="size-3 fill-current" />
                            {f.rating}/5
                          </span>
                          <span className="text-xs font-medium text-zinc-200">
                            {f.cards?.store_name || f.cards?.slug}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(f.created_at).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/50">
                        {f.feedback_text ? (
                          `"${f.feedback_text}"`
                        ) : (
                          <span className="italic text-zinc-500">Tidak ada pesan tertulis</span>
                        )}
                      </p>

                      {cleanPhone ? (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-zinc-400 font-mono">+{cleanPhone}</span>
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 px-3 py-1.5 text-xs font-medium text-[#25D366]"
                          >
                            <PhoneCall className="size-3" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-sm">
                <table className="min-w-full text-left text-sm" aria-label="Tabel Keluhan Pelanggan">
                  <thead className="border-b border-zinc-800 bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th scope="col" className="px-4 py-3.5">Waktu</th>
                      <th scope="col" className="px-4 py-3.5">Toko</th>
                      <th scope="col" className="px-4 py-3.5 text-center">Rating</th>
                      <th scope="col" className="px-4 py-3.5">Isi Keluhan</th>
                      <th scope="col" className="px-4 py-3.5 text-right">No. WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {filteredFeedbacks.map((f) => {
                      const cleanPhone = f.customer_whatsapp?.replace(/\D/g, '');

                      return (
                        <tr key={f.id} className="transition hover:bg-zinc-800/30">
                          <td className="px-4 py-3.5 text-xs text-zinc-400 font-mono whitespace-nowrap">
                            {new Date(f.created_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'medium',
                            })}
                          </td>
                          <td className="px-4 py-3.5 font-medium text-zinc-200">
                            {f.cards?.store_name || f.cards?.slug}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/20">
                              <Star className="size-3 fill-current" />
                              <span>{f.rating}/5</span>
                            </span>
                          </td>
                          <td className="px-4 py-3.5 max-w-md text-xs text-zinc-300">
                            {f.feedback_text ? (
                              <span>{f.feedback_text}</span>
                            ) : (
                              <span className="italic text-zinc-500">Tidak ada pesan tertulis</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap font-mono text-xs">
                            {cleanPhone ? (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 px-2.5 py-1 text-xs font-medium text-[#25D366]"
                              >
                                <PhoneCall className="size-3" />
                                <span>+{cleanPhone}</span>
                              </a>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
