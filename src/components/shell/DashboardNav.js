'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLinkStatus } from 'next/link';

function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={`inline-block size-1.5 rounded-full bg-brand-500 transition-opacity ${pending ? 'opacity-100 animate-pulse' : 'opacity-0'}`}
    />
  );
}

/**
 * @param {{ nav: Array<{ href: string, label: string }>, variant?: 'desktop' | 'mobile', onNavigate?: () => void }} props
 */
export default function DashboardNav({ nav, variant = 'desktop', onNavigate }) {
  const pathname = usePathname();

  if (variant === 'mobile') {
    return (
      <nav className="flex flex-col gap-1 pb-3" aria-label="Mobile Navigation">
        {nav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <span>{item.label}</span>
              <PendingHint />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className="flex items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/90 dark:bg-zinc-900/60 p-1"
      aria-label="Primary Navigation"
    >
      {nav.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              isActive
                ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300 font-semibold shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200'
            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500`}
          >
            <span>{item.label}</span>
            <PendingHint />
          </Link>
        );
      })}
    </nav>
  );
}
