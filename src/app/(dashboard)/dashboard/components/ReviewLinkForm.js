'use client';

import { useActionState } from 'react';
import { Loader2, MapPin, Store } from 'lucide-react';
import { updateStoreReviewLinkAction } from '../actions';

export default function ReviewLinkForm({ cards, storeId }) {
  const [state, action, pending] = useActionState(async (_previousState, formData) => {
    try {
      return await updateStoreReviewLinkAction(formData, storeId);
    } catch {
      return { error: 'Link gagal disimpan. Silakan coba lagi.' };
    }
  }, null);

  if (!cards.length) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-8 text-center max-w-xl shadow-xs">
        <Store aria-hidden="true" className="size-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Belum Ada Kartu NFC Terdaftar</h3>
        <p className="mt-1 text-xs text-zinc-500">Hubungi tim Nived untuk menerbitkan kartu NFC toko Anda.</p>
      </div>
    );
  }

  const mixedLinks = new Set(cards.map(card => card.google_review_url || '')).size > 1;
  return (
    <div className="max-w-2xl space-y-6">
      <form action={action} className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="google_review_url" className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <MapPin aria-hidden="true" className="size-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Link Google Maps untuk Ulasan</span>
          </label>
          <input
            id="google_review_url"
            name="google_review_url"
            type="url"
            required
            disabled={pending}
            defaultValue={cards[0].google_review_url || ''}
            aria-describedby="review-link-help review-link-scope"
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
            placeholder="https://g.page/r/XXXXX/review"
          />
          <p id="review-link-help" className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Salin link “Minta ulasan” dari Google Business Profile toko Anda.
          </p>
          <p id="review-link-scope" className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {mixedLinks ? 'Beberapa kartu memakai link berbeda. Menyimpan akan menyamakan link semua kartu toko.' : 'Perubahan berlaku untuk semua kartu dan meja toko. Tautan NFC dan QR tetap sama.'}
          </p>
        </div>
        <div className="pt-2 flex items-center justify-between gap-4">
          <button type="submit" disabled={pending} className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-xs active:scale-[0.99]">
            {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            <span>{pending ? 'Menyimpan...' : 'Simpan Link'}</span>
          </button>
          {state && (
            <div role={state.error ? 'alert' : 'status'} className={`rounded-xl px-3.5 py-2 text-xs font-medium border ${state.error ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300' : 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300'}`}>
              {state.error || 'Link ulasan Google berhasil diperbarui untuk semua kartu toko.'}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
