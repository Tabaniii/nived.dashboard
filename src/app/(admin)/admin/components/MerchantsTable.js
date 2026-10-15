'use client';

import { useState, useTransition } from 'react';
import { Search, Building, User, Mail, CreditCard } from 'lucide-react';
import { updateMerchantStatusAction } from '../actions';

export default function MerchantsTable({ merchants = [] }) {
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState('');

  const filtered = (merchants || []).filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return (
      m.business_name?.toLowerCase().includes(q) ||
      m.owner_name?.toLowerCase().includes(q) ||
      profile?.email?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-400';
      case 'suspended':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400';
      case 'trial':
      default:
        return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
            <Search className="size-3.5" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari toko, nama pemilik, atau email..."
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 py-2 pl-8 pr-3 text-xs text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 transition-all"
          />
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {filtered.length} merchant ditemukan
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-8 text-center shadow-xs">
          <Building className="size-8 text-zinc-400 dark:text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {search ? 'Tidak ada merchant yang cocok dengan pencarian.' : 'Belum ada merchant terdaftar.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card List (< 768px) */}
          <div className="space-y-3 md:hidden">
            {filtered.map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              const cardCount = Array.isArray(m.cards) ? m.cards.length : 0;

              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/50 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{m.business_name}</h3>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                        m.status
                      )}`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <User className="size-3 text-zinc-400 dark:text-zinc-500" />
                      <span>{m.owner_name}</span>
                    </div>
                    {profile?.email && (
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Mail className="size-3 text-zinc-400 dark:text-zinc-500" />
                        <span className="text-zinc-800 dark:text-zinc-300">{profile.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <CreditCard className="size-3 text-zinc-400 dark:text-zinc-500" />
                      <span>{cardCount} Kartu NFC diterbitkan</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-zinc-500">Ubah Status:</span>
                    <select
                      disabled={pending}
                      value={m.status}
                      onChange={(e) =>
                        startTransition(() =>
                          updateMerchantStatusAction(m.id, e.target.value)
                        )
                      }
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-brand-500 cursor-pointer shadow-xs"
                    >
                      <option value="trial">trial</option>
                      <option value="active">active</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 shadow-xs">
            <table className="min-w-full text-left text-sm" aria-label="Daftar Semua Merchant">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/90 dark:bg-zinc-900/90 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-4 py-3.5">Bisnis & Kontak</th>
                  <th scope="col" className="px-4 py-3.5">Pemilik & Akun</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Kartu NFC</th>
                  <th scope="col" className="px-4 py-3.5">Status Langganan</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Ubah Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
                {filtered.map((m) => {
                  const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                  const cardCount = Array.isArray(m.cards) ? m.cards.length : 0;

                  return (
                    <tr key={m.id} className="transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{m.business_name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">{m.contact || '—'}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-zinc-800 dark:text-zinc-200">{m.owner_name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-0.5">
                          {profile?.email || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-zinc-700 dark:text-zinc-300">
                        {cardCount}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${getStatusBadge(
                            m.status
                          )}`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <select
                          disabled={pending}
                          value={m.status}
                          onChange={(e) =>
                            startTransition(() =>
                              updateMerchantStatusAction(m.id, e.target.value)
                            )
                          }
                          className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/90 px-2.5 py-1 text-xs text-zinc-800 dark:text-zinc-200 outline-none focus:border-brand-500 cursor-pointer shadow-xs"
                        >
                          <option value="trial">trial</option>
                          <option value="active">active</option>
                          <option value="suspended">suspended</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
