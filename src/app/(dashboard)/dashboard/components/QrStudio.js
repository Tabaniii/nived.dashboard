'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2, QrCode } from 'lucide-react';
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
  const [qr, setQr] = useState(null);

  const card = cards.find((c) => c.id === cardId) || cards[0];
  const staffCode = sanitizeStaffCode(staff);
  const tableCode = sanitizeTableCode(table);
  const targetUrl = card ? buildAttributedUrl(cardPublicUrl(card.slug), { staff: staffCode, table: tableCode }) : '';

  useEffect(() => {
    if (!targetUrl) return undefined;
    let cancelled = false;

    const timer = setTimeout(() => {
      import('qrcode')
        .then((QRCode) =>
          Promise.all([
            QRCode.toDataURL(targetUrl, { ...QR_OPTIONS, width: 320 }),
            QRCode.toDataURL(targetUrl, { ...QR_OPTIONS, width: 1024 }),
          ])
        )
        .then(([preview, download]) => {
          if (!cancelled) {
            setQr({ url: targetUrl, png: preview, download });
          }
        })
        .catch(() => {
          if (!cancelled) setQr(null);
        });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [targetUrl]);

  if (!card) return null;

  const fileBase = ['qr', card.slug, tableCode && `meja-${tableCode.toLowerCase()}`, staffCode].filter(Boolean).join('-');

  return (
    <section className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs space-y-5">
      <div>
        <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <QrCode className="size-4 text-brand-600 dark:text-brand-400" />
          QR Code Kartu
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Unduh QR untuk dicetak atau ditempel. Isi meja/staf (opsional) agar setiap scan tercatat ke meja atau staf tersebut.
        </p>
      </div>

      <CardSwitcher cards={cards} selectedId={card.id} onSelect={setCardId} />

      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>

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
            <a href={qr?.download} download={`${fileBase}.png`} aria-disabled={!qr} className={buttonClass}>
              <Download className="size-3.5" />
              PNG
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
