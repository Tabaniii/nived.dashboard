'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LogOut, Menu, X, User } from 'lucide-react';
import { logoutAction } from '@/app/(auth)/actions';

/**
 * @param {{
 *   title: string,
 *   nav: Array<{ href: string, label: string }>,
 *   email?: string,
 *   children: import('react').ReactNode
 * }} props
 */
export default function AppShell({ title, nav, email, children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          {/* Brand & Page Context */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-xs">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Nived
                </span>
                <span className="text-zinc-600">/</span>
                <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
                  {title}
                </h1>
              </div>
            </div>
          </div>

          {/* Desktop Navigation & Actions */}
          <div className="hidden md:flex md:items-center md:gap-4">
            <nav className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1" aria-label="Primary Navigation">
              {nav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300 shadow-xs'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="h-4 w-px bg-zinc-800" aria-hidden="true" />

            {email ? (
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <User className="size-3.5 text-zinc-500" />
                <span className="max-w-[160px] truncate">{email}</span>
              </div>
            ) : null}

            <form action={logoutAction}>
              <button
                type="submit"
                title="Keluar dari akun"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                <span>Keluar</span>
              </button>
            </form>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex size-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
              aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu navigasi'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen ? (
          <div className="border-t border-zinc-800/80 bg-zinc-950/95 px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1 pb-3" aria-label="Mobile Navigation">
              {nav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-zinc-800/80 pt-3 flex items-center justify-between gap-3">
              {email ? (
                <div className="flex items-center gap-2 text-xs text-zinc-400 truncate">
                  <User className="size-3.5 shrink-0 text-zinc-500" />
                  <span className="truncate">{email}</span>
                </div>
              ) : null}

              <form action={logoutAction} className="shrink-0">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <LogOut className="size-3.5" />
                  <span>Keluar</span>
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>

      {/* Reassuring Footer */}
      <footer className="mt-auto border-t border-zinc-900 py-4 text-center text-xs text-zinc-600">
        Nived NFC Reputation Shield &middot; Enterprise Grade Review Management
      </footer>
    </div>
  );
}
