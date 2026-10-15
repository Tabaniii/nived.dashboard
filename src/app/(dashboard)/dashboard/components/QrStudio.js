'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Loader2, Printer, QrCode } from 'lucide-react';
import CardSwitcher from './CardSwitcher';
import { cardPublicUrl } from '@/lib/slug';
import { buildAttributedUrl, sanitizeStaffCode, sanitizeTableCode } from '@/lib/attribution';

const fieldClass =
  'w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all';

const buttonClass =
  'flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs';

const QR_OPTIONS = { margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0B1B4D', light: '#FFFFFF' } };

export default function QrStudio({ cards = [], initialCardId = '', initialStaff = '', initialTable = '' }) {
  const [cardId, setCardId] = useState(
    cards.some((c) => c.id === initialCardId) ? initialCardId : cards[0]?.id || ''
  );
  const [staff, setStaff] = useState(initialStaff);
  const [table, setTable] = useState(initialTable);
  const [lang, setLang] = useState('id');
  const [qr, setQr] = useState(null);

  const card = cards.find((c) => c.id === cardId) || cards[0];
  const staffCode = sanitizeStaffCode(staff);
  const tableCode = sanitizeTableCode(table);
  const targetUrl = card ? buildAttributedUrl(cardPublicUrl(card.slug), { staff: staffCode, table: tableCode }) : '';

  const templateParams = new URLSearchParams({ card_id: card?.id || '', lang });
  if (staffCode) templateParams.set('staff', staffCode);
  if (tableCode) templateParams.set('meja', tableCode);
  const templateQuery = templateParams.toString();

  const [previewQuery, setPreviewQuery] = useState(templateQuery);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    if (!targetUrl) return undefined;
    let cancelled = false;
    Promise.all([
      QRCode.toDataURL(targetUrl, { ...QR_OPTIONS, width: 1024 }),
      QRCode.toString(targetUrl, { ...QR_OPTIONS, type: 'svg' }),
    ])
      .then(([png, svg]) => {
        if (!cancelled) {
          setQr({ url: targetUrl, png, svg: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` });
        }
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUrl]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewFailed(false);
      setPreviewQuery(templateQuery);
    }, 600);
    return () => clearTimeout(timer);
  }, [templateQuery]);

  if (!card) return null;

  const fileBase = ['qr', card.slug, tableCode && `meja-${tableCode.toLowerCase()}`, staffCode].filter(Boolean).join('-');

  return (
    <section className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs space-y-5">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <QrCode className="size-4 text-brand-600 dark:text-brand-400" />
          QR Code & Template Akrilik
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Template A6 (10,5 × 14,8 cm, 300 dpi) siap kirim ke percetakan akrilik. Isi meja/staf untuk QR khusus per meja.
        </p>
      </div>

      <CardSwitcher cards={cards} selectedId={card.id} onSelect={setCardId} />

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          aria-label="Nomor meja"
          value={table}
          onChange={(event) => setTable(event.target.value)}
          className={fieldClass}
          placeholder="Meja (opsional), mis. 12"
          maxLength={20}
        />
        <input
          aria-label="Nama staf"
          value={staff}
          onChange={(event) => setStaff(event.target.value)}
          className={fieldClass}
          placeholder="Staf (opsional), mis. Andi"
          maxLength={40}
        />
        <select aria-label="Bahasa template" value={lang} onChange={(event) => setLang(event.target.value)} className={fieldClass}>
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4">
            <div className="flex size-36 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-inner">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.png} alt={`QR code ${card.store_name}`} className="size-full object-contain" />
              ) : (
                <Loader2 className="size-5 animate-spin text-zinc-400" />
              )}
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-medium text-zinc-500">QR mengarah ke:</p>
              <code className="block text-xs text-brand-600 dark:text-brand-400 font-mono break-all">{targetUrl}</code>
              <div className="flex flex-wrap gap-2 pt-1">
                <a href={qr?.png} download={`${fileBase}.png`} aria-disabled={!qr} className={buttonClass}>
                  <Download className="size-3.5" />
                  PNG
                </a>
                <a href={qr?.svg} download={`${fileBase}.svg`} aria-disabled={!qr} className={buttonClass}>
                  <Download className="size-3.5" />
                  SVG
                </a>
              </div>
            </div>
          </div>

          <a
            href={`/api/dashboard/qr-template?${templateQuery}&download=1`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 shadow-xs"
          >
            <Printer className="size-4" />
            Download Template Akrilik (PNG)
          </a>
          <p className="text-[11px] text-zinc-500">
            Tips: minta percetakan menanam stiker NFC di belakang logo NFC pada akrilik, lalu tulis link di atas ke stiker tersebut.
          </p>
        </div>

        <div className="relative mx-auto w-[220px] overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-sm aspect-[1240/1748]">
          {previewFailed ? (
            <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-[11px] text-rose-500">
              Preview gagal dimuat. Coba download langsung.
            </p>
          ) : (
            <>
              <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-brand-500" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={previewQuery}
                src={`/api/dashboard/qr-template?${previewQuery}`}
                alt="Preview template akrilik"
                className="relative size-full object-cover"
                onError={() => setPreviewFailed(true)}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
