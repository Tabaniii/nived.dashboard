'use client';

import { useMemo, useState, useTransition } from 'react';
import QRCode from 'qrcode';
import { CreditCard, QrCode, Copy, Check, Download, ExternalLink, ShieldCheck, Store, Phone, MapPin, Loader2 } from 'lucide-react';
import { provisionCardAction } from '../actions';
import { getBaseUrl } from '@/lib/url';

const fieldClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all';

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
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CreditCard className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Provision Kartu NFC Baru</h2>
          <p className="text-xs text-zinc-400">
            Generate slug acak aman, URL publik (/r/[slug]), dan kode QR resolusi tinggi untuk di-encode ke kartu fisik NTAG215.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="merchant_id" className="block text-xs font-medium text-zinc-300">
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

        <div className="space-y-1.5">
          <label htmlFor="card_store_name" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Store className="size-3.5 text-zinc-500" />
            <span>Nama Toko di Kartu</span>
          </label>
          <input
            id="card_store_name"
            name="store_name"
            required
            className={fieldClass}
            placeholder="Contoh: Kopi Senja - Cabang Tebet"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="card_whatsapp" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Phone className="size-3.5 text-zinc-500" />
            <span>WhatsApp Manager</span>
          </label>
          <input
            id="card_whatsapp"
            name="whatsapp_number"
            className={fieldClass}
            placeholder="6281234567890"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="card_google_url" className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <MapPin className="size-3.5 text-zinc-500" />
            <span>Google Review URL</span>
          </label>
          <input
            id="card_google_url"
            name="google_review_url"
            type="url"
            required
            className={fieldClass}
            placeholder="https://g.page/r/XXXXX/review"
          />
          <p className="text-[11px] text-zinc-400">
            Provide your Google Business Profile direct review intent URL so customers see the rating modal immediately upon opening.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-200 cursor-pointer">
            <input
              type="checkbox"
              name="is_shield_active"
              value="true"
              defaultChecked
              className="size-4 rounded border-zinc-700 text-emerald-500 accent-emerald-500"
            />
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span className="font-medium">Aktifkan Shield Mode (Reputation Filter 4–5★ vs 1–3★)</span>
            </div>
          </label>
        </div>

        <div className="sm:col-span-2 pt-2">
          <button
            type="submit"
            disabled={pending || merchantOptions.length === 0}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer shadow-sm active:scale-[0.99]"
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
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
          {error}
        </div>
      ) : null}

      {/* Generated Result & QR Code */}
      {result ? (
        <div className="mt-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5 shadow-sm grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                Kartu Siap Di-Encode ke NFC
              </span>
            </div>

            <div>
              <p className="text-xs text-zinc-400">Slug Terdaftar:</p>
              <p className="font-mono text-sm font-bold text-zinc-100">{result.card.slug}</p>
            </div>

            <div>
              <p className="text-xs text-zinc-400">URL Publik Tap NFC:</p>
              <code className="block mt-0.5 break-all rounded-lg border border-zinc-800 bg-zinc-950/80 p-2.5 font-mono text-xs text-emerald-300">
                {result.publicUrl}
              </code>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 cursor-pointer"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                <span>{copied ? 'URL Tersalin' : 'Copy URL'}</span>
              </button>

              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`${result.card.slug}-qr.png`}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
                >
                  <Download className="size-3.5" />
                  <span>Download QR PNG</span>
                </a>
              )}

              <a
                href={result.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
              >
                <ExternalLink className="size-3.5" />
                <span>Buka /r/{result.card.slug}</span>
              </a>
            </div>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center justify-center rounded-xl bg-white p-3 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`QR code for ${result.card.slug}`}
                className="h-44 w-44 rounded-md object-contain"
              />
              <span className="mt-1 text-[10px] font-mono font-semibold text-zinc-700">
                slug: {result.card.slug}
              </span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
