'use client';

import { useState } from 'react';
import { Star, MessageSquare, PhoneCall, ShieldCheck, Filter } from 'lucide-react';

export default function FeedbackBox({ feedbacks = [] }) {
  const [filterRating, setFilterRating] = useState('all');

  const filtered = feedbacks.filter((f) => {
    if (filterRating === 'all') return true;
    return String(f.rating) === filterRating;
  });

  return (
    <section className="space-y-4">
      {/* Section Header & Rating Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquare className="size-4 text-brand-600 dark:text-brand-400" />
            <span>Private Feedback Box (Reputation Shield)</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Rating dan masukan pelanggan yang dikirim langsung dari halaman slug
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-1 text-xs">
          <span className="flex items-center gap-1 pl-1.5 text-zinc-500">
            <Filter className="size-3" />
          </span>
          {['all', '1', '2', '3'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilterRating(r)}
              className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                filterRating === r
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {r === 'all' ? 'Semua' : `${r}★`}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-10 text-center shadow-xs">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 mb-3">
            <ShieldCheck className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">
            {feedbacks.length === 0
              ? 'Belum ada keluhan internal'
              : 'Tidak ada masukan untuk filter ini'}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm">
            {feedbacks.length === 0
              ? 'Semua pelanggan Anda puas atau belum ada masukan berskala 1–3 bintang.'
              : 'Pilih opsi filter lain untuk melihat riwayat masukan pelanggan.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List (< 768px) */}
          <div className="space-y-3 md:hidden">
            {filtered.map((f) => {
              const cleanPhone = f.customer_whatsapp?.replace(/\D/g, '');
              const waText = encodeURIComponent(
                `Halo Kak, terima kasih atas masukannya saat berkunjung ke ${
                  f.cards?.store_name || 'toko kami'
                }. Kami dari tim manajemen ingin menindaklanjuti keluhan Anda agar ke depan lebih baik.`
              );

              return (
                <div
                  key={f.id}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500 dark:text-amber-400 border border-amber-500/20">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        {f.rating}/5
                      </span>
                      <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 truncate max-w-[150px]">
                        {f.cards?.store_name || '—'}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(f.created_at).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/50">
                    {f.feedback_text ? (
                      `"${f.feedback_text}"`
                    ) : (
                      <span className="italic text-zinc-500">
                        Tidak ada catatan tertulis dari pelanggan.
                      </span>
                    )}
                  </p>

                  {cleanPhone ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
                        +{cleanPhone}
                      </span>
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${waText}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 px-3 py-1.5 text-xs font-medium text-[#25D366] transition shadow-xs"
                      >
                        <PhoneCall className="size-3" />
                        <span>Hubungi via WA</span>
                      </a>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-600">Pelanggan tidak mengisi nomor WA.</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-xs">
            <table className="min-w-full text-left text-sm" aria-label="Tabel Feedback Pelanggan">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Waktu</th>
                  <th scope="col" className="px-4 py-3.5">Kartu Toko</th>
                  <th scope="col" className="px-4 py-3.5">Rating</th>
                  <th scope="col" className="px-4 py-3.5">Pesan Feedback</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Aksi Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {filtered.map((f) => {
                  const cleanPhone = f.customer_whatsapp?.replace(/\D/g, '');
                  const waText = encodeURIComponent(
                    `Halo Kak, terima kasih atas masukannya saat berkunjung ke ${
                      f.cards?.store_name || 'toko kami'
                    }. Kami dari tim manajemen ingin menindaklanjuti keluhan Anda agar ke depan lebih baik.`
                  );

                  return (
                    <tr key={f.id} className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3.5 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {new Date(f.created_at).toLocaleString('id-ID', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-zinc-800 dark:text-zinc-200">
                        {f.cards?.store_name || '—'}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500 dark:text-amber-400 border border-amber-500/20">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {f.rating}/5
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-md text-xs text-zinc-700 dark:text-zinc-300">
                        {f.feedback_text ? (
                          <span>{f.feedback_text}</span>
                        ) : (
                          <span className="italic text-zinc-400 dark:text-zinc-500">Tidak ada pesan tertulis</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {cleanPhone ? (
                          <a
                            href={`https://wa.me/${cleanPhone}?text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 px-3 py-1.5 text-xs font-medium text-[#25D366] transition shadow-xs"
                          >
                            <PhoneCall className="size-3" />
                            <span>Hubungi WA ({cleanPhone})</span>
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>
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
  );
}
