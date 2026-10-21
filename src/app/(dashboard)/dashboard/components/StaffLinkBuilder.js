'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Copy, Check, QrCode, Link2 } from 'lucide-react';
import { cardPublicUrl } from '@/lib/slug';
import { buildAttributedUrl, sanitizeStaffCode, sanitizeTableCode } from '@/lib/attribution';

const fieldClass =
  'w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950/80 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all';

export default function StaffLinkBuilder({ cards = [] }) {
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [staff, setStaff] = useState('');
  const [table, setTable] = useState('');
  const [copied, setCopied] = useState(false);

  const card = cards.find((c) => c.id === cardId) || cards[0];
  if (!card) return null;

  const staffCode = sanitizeStaffCode(staff);
  const tableCode = sanitizeTableCode(table);
  const url = buildAttributedUrl(cardPublicUrl(card.slug), { staff: staffCode, table: tableCode });

  const qrParams = new URLSearchParams({ card: card.id });
  if (staffCode) qrParams.set('staff', staffCode);
  if (tableCode) qrParams.set('meja', tableCode);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-5 sm:p-6 shadow-xs space-y-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Link2 className="size-4 text-brand-600 dark:text-brand-400" />
          Buat link per staf / meja
        </h3>
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Tulis link ini ke stiker NFC (misalnya pakai aplikasi NFC Tools) atau cetak QR-nya. Setiap tap akan tercatat atas nama staf/meja tersebut.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.length > 1 && (
          <select
            aria-label="Kartu toko"
            value={card.id}
            onChange={(event) => setCardId(event.target.value)}
            className={fieldClass}
          >
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.store_name}
              </option>
            ))}
          </select>
        )}
        <input
          aria-label="Nama staf"
          value={staff}
          onChange={(event) => setStaff(event.target.value)}
          className={fieldClass}
          placeholder="Nama staf, mis. Andi"
          maxLength={40}
        />
        <input
          aria-label="Nomor meja"
          value={table}
          onChange={(event) => setTable(event.target.value)}
          className={fieldClass}
          placeholder="Meja, mis. 12"
          maxLength={20}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/80 p-3">
        <code className="text-xs text-brand-600 dark:text-brand-400 font-mono break-all">{url}</code>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer shadow-xs"
          >
            {copied ? <Check className="size-3.5 text-brand-600 dark:text-brand-400" /> : <Copy className="size-3.5" />}
            <span>{copied ? 'Tersalin' : 'Salin'}</span>
          </button>
          <Link
            href={`/dashboard/promo?${qrParams.toString()}`}
            className="flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
          >
            <QrCode className="size-3.5" />
            <span>Buat QR</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
