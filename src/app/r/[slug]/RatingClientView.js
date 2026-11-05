'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Check, ChevronRight, MapPin, MessageSquare, X } from 'lucide-react';
import { FEEDBACK_CATEGORIES } from '@/lib/customer-feedback';
import { getStoreInitials } from '@/lib/store-initials';

const cardClass = 'flex w-full items-start gap-3 rounded-2xl p-4 text-left motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700';
const fieldClass = 'mt-1 block w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 focus-visible:outline-2 focus-visible:outline-brand-700';
const successMessage = 'Terima kasih! Masukan Anda langsung diterima tim manajemen.';
const submitError = 'Masukan belum terkirim. Silakan coba lagi.';

export default function RatingClientView({ card, tableNumber, promo }) {
  const dialog = useRef(null);
  const textarea = useRef(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  function trackClick() {
    void fetch('/api/feedback/google-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: card.id, table_number: tableNumber }),
      keepalive: true,
    }).catch(() => {});
  }

  function openFeedback() {
    dialog.current.showModal();
    textarea.current.focus();
  }

  function startFeedback() {
    if (status === 'pending') return;
    setError('');
    setStatus('idle');
    openFeedback();
  }

  async function submitFeedback(event) {
    event.preventDefault();
    if (status === 'pending') return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    setStatus('pending');
    setError('');
    dialog.current.close();

    let message = submitError;
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
          card_id: card.id,
          table_number: tableNumber ?? fields.table_number,
        }),
      });
      if (response.ok) {
        form.reset();
        setStatus('sent');
        return;
      }
      const result = await response.json();
      message = result.error || submitError;
    } catch {
      // Reopen the draft if the request failed before a response arrived.
    }
    setStatus('idle');
    setError(message);
    openFeedback();
  }

  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-stone-100 px-4 py-8 text-stone-900 scheme-light">
      <article className="w-full max-w-2xl rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          {card.logo_url && !logoFailed ? (
            <Image src={card.logo_url} alt="" width={48} height={48} unoptimized onError={() => setLogoFailed(true)} className="size-12 rounded-xl object-cover" />
          ) : (
            <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-900 font-semibold text-white">
              {getStoreInitials(card.store_name)}
            </span>
          )}
          <h1 className="min-w-0 flex-1 wrap-break-word text-lg font-bold tracking-tight sm:text-xl">{card.store_name}</h1>
          {tableNumber && <p className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-900">Meja {tableNumber}</p>}
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          {card.google_review_url ? (
            <a href={card.google_review_url} target="_blank" rel="noopener noreferrer" onClick={trackClick} onAuxClick={(event) => { if (event.button === 1) trackClick(); }} className={`${cardClass} bg-brand-900 text-white hover:bg-brand-800`}>
              <MapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Beri Ulasan di Google Maps</span>
                <span className="mt-1 block text-sm leading-relaxed text-white/90">Bagikan pengalamanmu tentang rasa, suasana, dan pelayanan kami langsung di Google.</span>
                <span className="mt-2 block text-xs text-white/85">Ulasan publik · tab baru</span>
              </span>
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" />
            </a>
          ) : (
            <div className={`${cardClass} border border-stone-200 bg-stone-50`}>
              <MapPin aria-hidden="true" className="size-5 shrink-0" />
              <span><span className="block font-semibold">Beri Ulasan di Google Maps</span><span className="text-sm text-stone-600">Tautan ulasan toko belum tersedia.</span></span>
            </div>
          )}
          <button type="button" aria-haspopup="dialog" aria-controls="private-feedback" aria-disabled={status === 'pending'} onClick={startFeedback} className={`${cardClass} cursor-pointer border border-stone-200 bg-stone-50 hover:border-brand-700 aria-disabled:cursor-wait aria-disabled:opacity-60`}>
            <MessageSquare aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-800" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Kritik &amp; Masukan ke Manajemen</span>
              <span className="mt-1 block text-sm leading-relaxed text-stone-700">Ada masukan soal rasa makanan, kebersihan, atau AC kurang dingin? Ceritakan langsung ke owner.</span>
              <span className="mt-2 block text-xs text-stone-600">Formulir masukan pribadi</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-stone-600" />
          </button>
        </div>
        {promo && (
          <aside className="mt-6 space-y-2 border-t border-stone-200 pt-4">
            {promo.image && <Image src={promo.image} alt="" width={400} height={200} unoptimized className="max-h-56 w-full rounded-xl object-cover" />}
            {promo.title && <h2 className="font-semibold">{promo.title}</h2>}
            {promo.message && <p className="whitespace-pre-wrap text-sm text-stone-700">{promo.message}</p>}
            {promo.url && <a href={promo.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800 underline">{promo.label || 'Buka tautan toko'} <ArrowUpRight aria-hidden="true" className="size-4" /></a>}
          </aside>
        )}
      </article>

      <div role="status" aria-atomic="true" className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 mx-auto max-w-md">
        {status === 'pending' && <p className="rounded-xl border border-stone-200 bg-white p-3 text-sm text-stone-700 shadow-lg">Mengirim masukan…</p>}
        {status === 'sent' && <p className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-900 shadow-lg"><Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{successMessage}</p>}
      </div>

      <dialog id="private-feedback" ref={dialog} aria-labelledby="private-feedback-title" aria-describedby="private-feedback-description" className="fixed inset-x-0 top-auto bottom-0 mx-auto mt-0 mb-0 max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-[2rem] border border-stone-200 bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-stone-900 shadow-xl backdrop:bg-stone-950/50 sm:px-7">
        <div aria-hidden="true" className="mx-auto mb-2 h-1 w-8 rounded-full bg-stone-300" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="private-feedback-title" className="text-lg font-bold">Kritik &amp; Masukan ke Manajemen</h2>
          <button type="button" aria-label="Tutup" onClick={() => dialog.current.close()} className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-brand-700"><X aria-hidden="true" className="size-5" /></button>
        </div>
        <p id="private-feedback-description" className="mb-4 text-sm text-stone-600">Masukan ini dikirim secara pribadi ke manajemen.</p>
        <form onSubmit={submitFeedback} className="space-y-4">
          {!tableNumber && (
            <label className="block text-sm font-medium">
              Nomor meja (opsional)
              <input name="table_number" maxLength={20} className={fieldClass} />
            </label>
          )}
          <fieldset>
            <legend className="text-sm font-medium">Pilih kategori</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {FEEDBACK_CATEGORIES.map((category) => (
                <label key={category} className="cursor-pointer">
                  <input type="radio" name="category" value={category} required className="peer sr-only" />
                  <span className="flex min-h-11 items-center rounded-full border border-stone-300 px-3 text-sm peer-checked:border-brand-800 peer-checked:bg-brand-50 peer-checked:font-semibold peer-checked:text-brand-900 peer-focus-visible:outline-2 peer-focus-visible:outline-brand-700">{category}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium">
            Masukan Anda
            <textarea ref={textarea} name="feedback_text" required rows={3} maxLength={2000} placeholder="Tuliskan keluhan atau masukan Anda di sini..." className={fieldClass} />
          </label>
          <div>
            <label htmlFor="feedback-contact" className="block text-sm font-medium">Nomor WhatsApp (opsional)</label>
            <input id="feedback-contact" name="customer_contact" type="tel" autoComplete="tel" maxLength={30} placeholder="Nomor WhatsApp (opsional, jika ingin dihubungi kembali)" aria-describedby="feedback-contact-hint" className={fieldClass} />
            <p id="feedback-contact-hint" className="mt-1 text-sm text-stone-600">Isi jika ingin dihubungi kembali oleh manajemen.</p>
          </div>
          {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
          <button type="submit" disabled={status === 'pending'} className="min-h-11 w-full rounded-xl bg-brand-900 px-4 font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-60">Kirim masukan</button>
        </form>
      </dialog>
    </main>
  );
}
