'use client';

import { useMemo, useState, useTransition } from 'react';
import QRCode from 'qrcode';
import { CreditCard, Copy, Check, Download, ExternalLink, ShieldCheck, Store, Phone, MapPin, Loader2 } from 'lucide-react';
import { provisionCardAction } from '../actions';
import { getBaseUrl } from '@/lib/url';

const fieldClass =
  'w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all';

export default function ProvisionCardForm({ merchants }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  const merchantOptions = useMemo(() => merchants || [], [merchants]);

  function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);

    startTransition(async () => {
      const res = await provisionCardAction(formData);
      if (res?.error) {
        setError(res.error);
        setResult(null);
        setQrDataUrl(null);
        return;
      }
      const canonicalUrl = res.publicUrl || `${getBaseUrl()}/r/${res.card.slug}`;
      setResult({ ...res, publicUrl: canonicalUrl });
      const dataUrl = await QRCode.toDataURL(canonicalUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#09090b', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
      form.reset();
    });
  }

  const handleCopy = () => {
    if (!result?.publicUrl) return;
    navigator.clipboard.writeText(result.publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-xs">
          <CreditCard className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Provision Kartu NFC Baru</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Generate slug acak aman, URL publik (/r/[slug]), dan kode QR resolusi tinggi untuk di-encode ke kartu fisik NTAG215.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="merchant_id" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Pilih Merchant
          </label>
          <select id="merchant_id" name="merchant_id" required className={fieldClass} defaultValue="">
            <option value="" disabled>
              -- Pilih merchant pemilik kartu --
            </option>
            {merchantOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.business_name} ({m.owner_name})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="card_store_name" className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <Store className="size-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Nama Gerai / Display Kartu (Store Name)</span>
          </label>
          <input
            id="card_store_name"
            name="store_name"
            required
            className={fieldClass}
            placeholder="Kopi Kenangan Senja - Cabang Senopati"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="card_google_review_url" className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <MapPin className="size-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Google Review URL Intent</span>
          </label>
          <input
            id="card_google_review_url"
            name="google_review_url"
            type="url"
            required
            className={fieldClass}
            placeholder="https://g.page/r/XXXXX/review"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="card_whatsapp_number" className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <Phone className="size-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Nomor WhatsApp Manager Toko (Opsional)</span>
          </label>
          <input
            id="card_whatsapp_number"
            name="whatsapp_number"
            className={fieldClass}
            placeholder="6281234567890"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-3 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer shadow-xs">
            <input
              type="checkbox"
              name="is_shield_active"
              value="true"
              defaultChecked
              className="size-4 rounded border-zinc-300 dark:border-zinc-700 text-brand-500 accent-brand-500 cursor-pointer"
            />
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-brand-600 dark:text-brand-400" />
              <span className="font-medium">Aktifkan Shield Mode (Reputation Filter 4–5★ vs 1–3★)</span>
            </div>
          </label>
        </div>

        <div className="sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={pending || merchantOptions.length === 0}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Membuat Slug & Generate QR...</span>
              </>
            ) : (
              <span>Generate Slug & QR Kartu</span>
            )}
          </button>
        </div>
      </form>

      {error ? (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {/* Generated Result & QR Code */}
      {result ? (
        <div className="mt-5 rounded-2xl border border-brand-500/40 bg-brand-500/5 dark:bg-brand-950/20 p-5 shadow-xs grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand-500/15 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:text-brand-400 border border-brand-500/30">
                Kartu Siap Di-Encode ke NFC
              </span>
            </div>

            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Slug Terdaftar:</p>
              <p className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{result.card.slug}</p>
            </div>

            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">URL Publik Tap NFC:</p>
              <code className="block mt-0.5 break-all rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 p-2.5 font-mono text-xs text-brand-600 dark:text-brand-300 shadow-xs">
                {result.publicUrl}
              </code>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-brand-500/40 bg-brand-500/10 px-3.5 py-2 text-xs font-semibold text-brand-700 dark:text-brand-300 transition hover:bg-brand-500/20 cursor-pointer shadow-xs"
              >
                {copied ? <Check className="size-3.5 text-brand-600 dark:text-brand-400" /> : <Copy className="size-3.5" />}
                <span>{copied ? 'URL Tersalin' : 'Copy URL'}</span>
              </button>

              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`${result.card.slug}-qr.png`}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white shadow-xs"
                >
                  <Download className="size-3.5" />
                  <span>Download QR PNG</span>
                </a>
              )}

              <a
                href={result.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white shadow-xs"
              >
                <ExternalLink className="size-3.5" />
                <span>Buka /r/{result.card.slug}</span>
              </a>
            </div>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-3 border border-zinc-200 dark:border-zinc-800 shadow-sm self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code ${result.card.slug}`}
                className="h-36 w-36 object-contain"
              />
              <span className="mt-1 font-mono text-[10px] text-zinc-600 font-semibold">{result.card.slug}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
