'use client';

import { useState, useTransition } from 'react';
import QRCode from 'qrcode';
import { Search, Copy, Check, QrCode, Shield, ExternalLink, Trash2, X, Download, AlertCircle, Loader2, Printer } from 'lucide-react';
import { softDeleteCardAction, toggleShieldAction } from '../actions';
import { cardPublicUrl } from '@/lib/slug';

export default function CardsTable({ cards = [] }) {
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [qrModal, setQrModal] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const filtered = (cards || []).filter((card) => {
    if (modeFilter === 'shield' && !card.is_shield_active) return false;
    if (modeFilter === 'direct' && card.is_shield_active) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      card.store_name?.toLowerCase().includes(q) ||
      card.slug?.toLowerCase().includes(q) ||
      card.merchants?.business_name?.toLowerCase().includes(q)
    );
  });

  const handleCopy = (id, url) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenQr = async (card) => {
    const url = cardPublicUrl(card.slug);
    const dataUrl = await QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: '#09090b', light: '#ffffff' },
    });
    setQrModal({
      id: card.id,
      slug: card.slug,
      store_name: card.store_name,
      url,
      qrDataUrl: dataUrl,
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Mode Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
            <Search className="size-3.5" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari toko, slug, atau merchant..."
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 py-2 pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>

        {/* Mode Filter Pills */}
        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-1 text-xs">
          <button
            type="button"
            onClick={() => setModeFilter('all')}
            className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
              modeFilter === 'all'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setModeFilter('shield')}
            className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
              modeFilter === 'shield'
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Shield
          </button>
          <button
            type="button"
            onClick={() => setModeFilter('direct')}
            className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
              modeFilter === 'direct'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Direct
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-8 text-center text-xs text-zinc-500 shadow-xs">
          {search ? 'Tidak ada kartu yang cocok dengan kueri pencarian.' : 'Belum ada kartu diterbitkan.'}
        </div>
      ) : (
        <>
          {/* Mobile Card List (< 768px) */}
          <div className="space-y-3 md:hidden">
            {filtered.map((card) => {
              const url = cardPublicUrl(card.slug);
              const isCopied = copiedId === card.id;

              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{card.store_name}</h3>
                      <p className="text-xs text-zinc-500">{card.merchants?.business_name || '—'}</p>
                    </div>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(() =>
                          toggleShieldAction(card.id, !card.is_shield_active)
                        )
                      }
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border transition cursor-pointer ${
                        card.is_shield_active
                          ? 'border-brand-500/30 bg-brand-500/15 text-brand-700 dark:text-brand-300'
                          : 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-300'
                      }`}
                    >
                      <Shield className="size-3" />
                      <span>{card.is_shield_active ? 'Shield' : 'Direct'}</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/70 p-2.5 font-mono text-xs flex items-center justify-between gap-2">
                    <span className="text-brand-600 dark:text-brand-400 font-bold truncate">{card.slug}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(card.id, url)}
                      className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer"
                    >
                      {isCopied ? <Check className="size-3 text-brand-600 dark:text-brand-400" /> : <Copy className="size-3" />}
                      <span>{isCopied ? 'Tersalin' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenQr(card)}
                        className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs cursor-pointer"
                      >
                        <QrCode className="size-3" />
                        <span>QR Code</span>
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
                      >
                        <ExternalLink className="size-3" />
                        <span>Buka</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => setDeleteConfirmId(card.id)}
                      className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-xs">
            <table className="min-w-full text-left text-sm" aria-label="Tabel Kartu NFC Aktif">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Store & Merchant</th>
                  <th scope="col" className="px-4 py-3.5">Slug & URL NFC</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Reputation Mode</th>
                  <th scope="col" className="px-4 py-3.5 text-center">QR Code</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {filtered.map((card) => {
                  const url = cardPublicUrl(card.slug);
                  const isCopied = copiedId === card.id;

                  return (
                    <tr key={card.id} className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{card.store_name}</div>
                        <div className="text-xs text-zinc-500 font-mono">
                          {card.merchants?.business_name || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-600 dark:text-brand-400">{card.slug}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(card.id, url)}
                            title="Salin URL publik"
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 cursor-pointer shadow-xs"
                          >
                            {isCopied ? <Check className="size-3 text-brand-600 dark:text-brand-400" /> : <Copy className="size-3" />}
                            <span>{isCopied ? 'Tersalin' : 'Copy'}</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 truncate max-w-xs mt-0.5">{url}</p>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(() =>
                              toggleShieldAction(card.id, !card.is_shield_active)
                            )
                          }
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition cursor-pointer shadow-xs ${
                            card.is_shield_active
                              ? 'border-brand-500/30 bg-brand-500/15 text-brand-700 dark:text-brand-300 hover:bg-brand-500/25'
                              : 'border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25'
                          }`}
                        >
                          <Shield className="size-3.5" />
                          <span>{card.is_shield_active ? 'Shield Mode' : 'Direct Mode'}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenQr(card)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white cursor-pointer shadow-xs"
                        >
                          <QrCode className="size-3.5" />
                          <span>Lihat QR</span>
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setDeleteConfirmId(card.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          <span>Soft Delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{qrModal.store_name}</h3>
                <p className="text-xs font-mono text-brand-600 dark:text-brand-400">slug: {qrModal.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => setQrModal(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl bg-zinc-50 dark:bg-white p-4 border border-zinc-200 dark:border-transparent shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrModal.qrDataUrl}
                alt={`QR code ${qrModal.slug}`}
                className="h-56 w-56 object-contain"
              />
              <span className="mt-1 text-xs font-mono font-bold text-zinc-900">
                {qrModal.url}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href={qrModal.qrDataUrl}
                download={`${qrModal.slug}-qr.png`}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white hover:bg-brand-600 transition shadow-xs"
              >
                <Download className="size-4" />
                <span>Download PNG</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrModal.url);
                  setQrModal(null);
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs cursor-pointer"
              >
                <Copy className="size-4" />
                <span>Copy URL</span>
              </button>
            </div>
            <a
              href={`/api/dashboard/qr-template?card_id=${qrModal.id}&download=1`}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 py-2.5 text-xs font-bold text-brand-700 dark:text-brand-300 hover:bg-brand-500/20 transition"
            >
              <Printer className="size-4" />
              <span>Download Template Akrilik A6</span>
            </a>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 shrink-0">
                <AlertCircle className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Konfirmasi Soft Delete</h3>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Kartu ini akan dinonaktifkan (`deleted_at` terisi). Taps fisik pada slug ini akan mengembalikan Fallback View ke pelanggan.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  startTransition(() => softDeleteCardAction(id));
                }}
                className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition shadow-xs cursor-pointer"
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                <span>Ya, Nonaktifkan Kartu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
