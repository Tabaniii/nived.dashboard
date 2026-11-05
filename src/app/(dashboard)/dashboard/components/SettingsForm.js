'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ExternalLink, Copy, Check, ShieldCheck, Phone, Store, Loader2, Info } from 'lucide-react';
import { updateCardSettingsAction } from '../actions';
import AlertSettingsForm from './AlertSettingsForm';
import MigrationNotice from './MigrationNotice';
import { cardPublicUrl } from '@/lib/slug';
import { normalizePhoneNumber } from '@/lib/whatsapp';

function handleWhatsAppInput(event) {
  const normalized = normalizePhoneNumber(event.target.value);
  if (event.target.value !== normalized) {
    event.target.value = normalized;
  }
}

const fieldClass =
  'w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all';

export default function SettingsForm({ cards = [], notifyStatus }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedId, setSelectedId] = useState(cards?.[0]?.id || '');

  const selected = cards.find((c) => c.id === selectedId) || cards?.[0];

  if (!selected) {
    return (
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-8 text-center max-w-xl shadow-xs">
        <Store className="size-10 text-zinc-400 dark:text-zinc-600 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Belum Ada Kartu NFC Terdaftar</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Hubungi tim Nived untuk menerbitkan kartu fisik NFC dan slug toko Anda.
        </p>
      </div>
    );
  }

  const publicUrl = cardPublicUrl(selected.slug);

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  function onSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);
    setIsError(false);

    startTransition(async () => {
      const result = await updateCardSettingsAction(formData, selected.merchant_id);
      if (result?.error) {
        setIsError(true);
        setMessage(result.error);
      } else {
        setIsError(false);
        setMessage('Pengaturan toko berhasil diperbarui!');
        setTimeout(() => setMessage(null), 4000);
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Multiple Cards Switcher (if more than 1 card) */}
      {cards.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Pilih Kartu Toko</label>
          <div className="flex flex-wrap gap-2">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedId(c.id);
                  setMessage(null);
                }}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition cursor-pointer border ${
                  selected.id === c.id
                    ? 'border-brand-500/50 bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Store className="size-3.5" />
                <span>{c.store_name}</span>
                <span className="font-mono text-[10px] opacity-60">({c.slug})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Public NFC URL Info Card */}
      <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Tautan Publik Kartu NFC</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-brand-500/30 bg-brand-500/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-700 dark:text-brand-300">
            <ShieldCheck className="size-3" />
            <span>Ulasan &amp; Masukan</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 p-3">
          <code className="text-xs text-brand-600 dark:text-brand-400 font-mono truncate max-w-sm sm:max-w-md">
            {publicUrl}
          </code>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer shadow-xs"
            >
              {copied ? <Check className="size-3.5 text-brand-600 dark:text-brand-400" /> : <Copy className="size-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-xs"
            >
              <ExternalLink className="size-3.5" />
              <span>Tes URL</span>
            </a>
          </div>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-zinc-500 pt-1">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <p>
            Halaman ini selalu menampilkan tautan ulasan Google dan formulir masukan pribadi.
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs space-y-4"
      >
        <input type="hidden" name="card_id" value={selected.id} />

        <div className="space-y-1.5">
          <label htmlFor="store_name" className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <Store className="size-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Nama Toko / Restoran</span>
          </label>
          <input
            id="store_name"
            key={`${selected.id}-store`}
            name="store_name"
            defaultValue={selected.store_name}
            required
            className={fieldClass}
            placeholder="Kopi Senja Utama"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="logo_url" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            URL Logo Toko (opsional)
          </label>
          <input
            id="logo_url"
            key={`${selected.id}-logo`}
            name="logo_url"
            type="url"
            defaultValue={selected.logo_url || ''}
            className={fieldClass}
            placeholder="https://contoh.com/logo.png"
          />
        </div>

        <div className="space-y-1.5">
          <Link href="/dashboard/review-link" className="text-xs font-medium text-brand-600 dark:text-brand-400 underline">
            Kelola link ulasan Google Maps
          </Link>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Satu link ulasan berlaku untuk semua kartu NFC dan QR toko.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="whatsapp_number" className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <Phone className="size-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>WhatsApp Manager / Toko</span>
          </label>
          <input
            id="whatsapp_number"
            key={`${selected.id}-wa`}
            name="whatsapp_number"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={normalizePhoneNumber(selected.whatsapp_number || '')}
            onChange={handleWhatsAppInput}
            onBlur={handleWhatsAppInput}
            className={fieldClass}
            placeholder="081234567890 → 6281234567890"
          />
          <p className="text-[11px] text-zinc-500">
            Boleh ketik 08… — otomatis diubah ke 628….
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Perubahan</span>
            )}
          </button>

          {message && (
            <div
              role="alert"
              className={`rounded-xl px-3.5 py-2 text-xs font-medium border ${
                isError
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300'
                  : 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </form>

      {!Object.hasOwn(selected, 'alerts_enabled') && <MigrationNotice feature="Pengiriman ringkasan mingguan" />}
      <AlertSettingsForm
        key={`${selected.id}-alerts`}
        card={selected}
        notifyStatus={notifyStatus}
        needsMigration={!Object.hasOwn(selected, 'alerts_enabled')}
      />
    </div>
  );
}
