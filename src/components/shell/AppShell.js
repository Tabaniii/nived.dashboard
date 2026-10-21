'use client';

import { useState } from 'react';
import { ShieldCheck, LogOut, Menu, X, User } from 'lucide-react';
import { logoutAction } from '@/app/(auth)/actions';
import ThemeToggle from '@/components/theme/ThemeToggle';
import DashboardNav from '@/components/shell/DashboardNav';

/**
 * @param {{
 *   title: string,
 *   nav: Array<{ href: string, label: string }>,
 *   email?: string,
 *   children: import('react').ReactNode
 * }} props
 */
export default function AppShell({ title, nav, email, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white transition-colors duration-150">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          {/* Brand & Page Context */}
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-xs">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                  Nived
                </span>
                <span className="text-zinc-400 dark:text-zinc-600">/</span>
                <h1 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {title}
                </h1>
              </div>
            </div>
          </div>

          {/* Desktop Navigation & Actions */}
          <div className="hidden lg:flex lg:items-center lg:gap-4">
            <DashboardNav nav={nav} variant="desktop" />

            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />

            {/* Theme Toggle Button */}
            <ThemeToggle />

            {email ? (
              <div className="hidden xl:flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <User className="size-3.5 text-zinc-400 dark:text-zinc-500" />
                <span className="max-w-[160px] truncate">{email}</span>
              </div>
            ) : null}

            <form action={logoutAction}>
              <button
                type="submit"
                title="Keluar dari akun"
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 cursor-pointer shadow-xs"
              >
                <LogOut className="size-3.5" />
                <span>Keluar</span>
              </button>
            </form>
          </div>

          {/* Mobile Menu & Theme Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex size-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
              aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu navigasi'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen ? (
          <div className="border-t border-zinc-200 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 px-4 py-4 lg:hidden shadow-lg">
            <DashboardNav nav={nav} variant="mobile" onNavigate={() => setMobileMenuOpen(false)} />

            <div className="border-t border-zinc-200 dark:border-zinc-800/80 pt-3 flex items-center justify-between gap-3">
              {email ? (
                <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  <User className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                  <span className="truncate">{email}</span>
                </div>
              ) : null}

              <form action={logoutAction} className="shrink-0">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
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
      <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-900 py-4 text-center text-xs text-zinc-500 dark:text-zinc-600">
        Nived NFC Reputation Shield &middot; Enterprise Grade Review Management
      </footer>
    </div>
  );
}
