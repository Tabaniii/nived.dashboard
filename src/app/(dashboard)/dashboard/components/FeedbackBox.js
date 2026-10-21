'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Star, MessageSquare, PhoneCall, ShieldCheck, Filter, ImageIcon } from 'lucide-react';

const dateFmt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'short', timeStyle: 'short' });

function followUpText(feedback) {
  const store = feedback.cards?.store_name || 'toko kami';
  return encodeURIComponent(
    feedback.rating >= 4
      ? `Halo Kak, terima kasih banyak atas ulasan positifnya untuk ${store}! Senang sekali Kakak puas. Sampai jumpa di kunjungan berikutnya.`
      : `Halo Kak, terima kasih atas masukannya saat berkunjung ke ${store}. Kami dari tim manajemen ingin menindaklanjuti keluhan Anda agar ke depan lebih baik.`
  );
}

function AttributionChips({ feedback }) {
  if (!feedback.table_code && !feedback.staff_code) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {feedback.table_code && (
        <span className="rounded-md border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
          Meja {feedback.table_code}
        </span>
      )}
      {feedback.staff_code && (
        <span className="rounded-md border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
          Staf: {feedback.staff_code}
        </span>
      )}
    </span>
  );
}

function FeedbackCard({ feedback: f }) {
  const cleanPhone = f.customer_whatsapp?.replace(/\D/g, '');
  const waText = followUpText(f);
  const showSocial = f.rating === 5 && f.feedback_text?.trim();

  return (
    <article
      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-4 shadow-xs space-y-3"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 180px' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500 dark:text-amber-400 border border-amber-500/20">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {f.rating}/5
          </span>
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 truncate max-w-[150px]">
            {f.cards?.store_name || '—'}
          </span>
          <AttributionChips feedback={f} />
        </div>
        <span className="shrink-0 text-[11px] text-zinc-500">{dateFmt.format(new Date(f.created_at))}</span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/50">
        {f.feedback_text ? (
          `"${f.feedback_text}"`
        ) : (
          <span className="italic text-zinc-500">Tidak ada catatan tertulis dari pelanggan.</span>
        )}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {cleanPhone ? (
          <>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">+{cleanPhone}</span>
            <a
              href={`https://wa.me/${cleanPhone}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 px-3 py-1.5 text-xs font-medium text-[#25D366] transition shadow-xs"
            >
              <PhoneCall className="size-3" />
              <span>Hubungi via WA</span>
            </a>
          </>
        ) : (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-600">Pelanggan tidak mengisi nomor WA.</p>
        )}
        {showSocial && (
          <Link
            href={`/dashboard/promo?review=${f.id}#social-proof`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-700 dark:text-brand-300 transition hover:bg-brand-500/20 shadow-xs"
          >
            <ImageIcon className="size-3" />
            <span>Jadikan konten IG</span>
          </Link>
        )}
      </div>
    </article>
  );
}

export default function FeedbackBox({ feedbacks = [] }) {
  const [filterRating, setFilterRating] = useState('all');

  const filtered = useMemo(() => {
    if (filterRating === 'all') return feedbacks;
    return feedbacks.filter((f) => String(f.rating) === filterRating);
  }, [feedbacks, filterRating]);

  return (
    <section className="space-y-4">
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

        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-1 text-xs">
          <span className="flex items-center gap-1 pl-1.5 text-zinc-500">
            <Filter className="size-3" />
          </span>
          {['all', '1', '2', '3', '4', '5'].map((r) => (
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
            {feedbacks.length === 0 ? 'Belum ada keluhan internal' : 'Tidak ada masukan untuk filter ini'}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm">
            {feedbacks.length === 0
              ? 'Semua pelanggan Anda puas atau belum ada masukan berskala 1–3 bintang.'
              : 'Pilih opsi filter lain untuk melihat riwayat masukan pelanggan.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((f) => (
            <FeedbackCard key={f.id} feedback={f} />
          ))}
        </div>
      )}
    </section>
  );
}
