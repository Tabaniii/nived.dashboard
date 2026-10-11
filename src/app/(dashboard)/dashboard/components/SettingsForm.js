'use client';

import { useState, useTransition } from 'react';
import { ExternalLink, Copy, Check, ShieldCheck, MapPin, Phone, Store, Loader2, Info } from 'lucide-react';
import { updateCardSettingsAction } from '../actions';
import { cardPublicUrl } from '@/lib/slug';

const fieldClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all';

export default function SettingsForm({ cards = [] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState(null);
  const [isError, setIsError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedId, setSelectedId] = useState(cards?.[0]?.id || '');

  const selected = cards.find((c) => c.id === selectedId) || cards?.[0];

  if (!selected) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 text-center max-w-xl">
        <Store className="size-10 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-zinc-200">Belum Ada Kartu NFC Terdaftar</h3>
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
      const result = await updateCardSettingsAction(formData);
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
          <label className="text-xs font-medium text-zinc-400">Pilih Kartu Toko</label>
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
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
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
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-400">Tautan Publik Kartu NFC</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border ${
              selected.is_shield_active
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            <ShieldCheck className="size-3" />
            <span>{selected.is_shield_active ? 'Shield Mode Aktif' : 'Direct Mode'}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
          <code className="text-xs text-emerald-400 font-mono truncate max-w-sm sm:max-w-md">
            {publicUrl}
          </code>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-lg border border-zinc-700/80 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              <ExternalLink className="size-3.5" />
              <span>Tes URL</span>
            </a>
          </div>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-zinc-500 pt-1">
          <Info className="size-3.5 shrink-0 mt-0.5" />
          <p>
            Toggle Shield Mode dikendalikan sepenuhnya oleh Admin Nived sesuai status langganan.
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 sm:p-6 shadow-sm space-y-4"
      >
        <input type="hidden" name="card_id" value={selected.id} />

        <div className="space-y-1.5">
          <label htmlFor="store_name" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Store className="size-3.5 text-zinc-500" />
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
          <label htmlFor="google_review_url" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <MapPin className="size-3.5 text-zinc-500" />
            <span>Google Maps Review URL</span>
          </label>
          <input
            id="google_review_url"
            key={`${selected.id}-gurl`}
            name="google_review_url"
            type="url"
            required
            defaultValue={selected.google_review_url}
            className={fieldClass}
            placeholder="https://maps.app.goo.gl/..."
          />
          <p className="text-[11px] text-zinc-500">
            Tautan tujuan redirect untuk pelanggan yang memberikan rating 4 atau 5 bintang.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="whatsapp_number" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Phone className="size-3.5 text-zinc-500" />
            <span>WhatsApp Manager / Toko</span>
          </label>
          <input
            id="whatsapp_number"
            key={`${selected.id}-wa`}
            name="whatsapp_number"
            defaultValue={selected.whatsapp_number || ''}
            className={fieldClass}
            placeholder="6281234567890"
          />
          <p className="text-[11px] text-zinc-500">
            Pelanggan dengan keluhan (1–3 bintang) dapat memilih opsi chat langsung ke nomor ini.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between gap-4">
          <button
            type="submit"
            disabled={pending}
            className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-sm active:scale-[0.99]"
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
                  ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
