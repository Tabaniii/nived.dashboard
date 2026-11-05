'use client';

import { useMemo, useState } from 'react';
import { Star, MessageSquare, PhoneCall, ShieldCheck, Filter } from 'lucide-react';
import { normalizePhoneNumber } from '@/lib/whatsapp';

const dateFmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'short', timeStyle: 'short' });

function followUpText(feedback, businessName) {
  const store = businessName || feedback.cards?.store_name || 'toko kami';
  return encodeURIComponent(
    feedback.rating >= 4
      ? `Halo Kak, terima kasih banyak atas ulasan positifnya untuk ${store}! Senang sekali Kakak puas. Sampai jumpa di kunjungan berikutnya.`
      : `Halo Kak, terima kasih atas masukannya saat berkunjung ke ${store}. Kami dari tim manajemen ingin menindaklanjuti keluhan Anda agar ke depan lebih baik.`
  );
}

function AttributionChips({ feedback }) {
  if (!feedback.table_number && !feedback.staff_code) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {feedback.table_number && (
        <span className="rounded-md border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
          Meja {feedback.table_number}
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

function FeedbackCard({ feedback: f, businessName }) {
  const cleanPhone = normalizePhoneNumber(f.customer_contact);
  const waText = followUpText(f, businessName);

  return (
    <article
      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-4 shadow-xs space-y-3"
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 180px' }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500 dark:text-amber-400 border border-amber-500/20">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            {f.resolved_status ? 'Selesai' : 'Belum selesai'}
          </span>
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-300 truncate max-w-[150px]">
            {f.category || '—'}
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
      </div>
    </article>
  );
}

export default function FeedbackBox({ feedbacks = [], businessName }) {
  const [filterStatus, setFilterStatus] = useState('all');

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return feedbacks;
    return feedbacks.filter((f) => f.resolved_status === (filterStatus === 'resolved'));
  }, [feedbacks, filterStatus]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <MessageSquare className="size-4 text-brand-600 dark:text-brand-400" />
            <span>Private Feedback Box</span>
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Masukan pribadi pelanggan dari halaman meja
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-1 text-xs">
          <span className="flex items-center gap-1 pl-1.5 text-zinc-500">
            <Filter className="size-3" />
          </span>
          {['all', 'unresolved', 'resolved'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilterStatus(r)}
              className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                filterStatus === r
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {r === 'all' ? 'Semua' : r === 'resolved' ? 'Selesai' : 'Belum selesai'}
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
            {feedbacks.length === 0 ? 'Belum ada masukan pribadi' : 'Tidak ada masukan untuk filter ini'}
          </h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm">
            {feedbacks.length === 0
              ? 'Masukan pribadi dari halaman meja akan tampil di sini.'
              : 'Pilih opsi filter lain untuk melihat riwayat masukan pelanggan.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((f) => (
            <FeedbackCard key={f.id} feedback={f} businessName={businessName} />
          ))}
        </div>
      )}
    </section>
  );
}
