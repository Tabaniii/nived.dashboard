'use client';

import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

function subscribe(callback) {
  window.addEventListener('theme-change', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('theme-change', callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

function getServerSnapshot() {
  return 'light';
}

export default function ThemeToggle({ className = '' }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {}

    window.dispatchEvent(new Event('theme-change'));
  };

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
      aria-label={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
      className={`relative inline-flex size-9 items-center justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-300 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 cursor-pointer shadow-xs ${className}`}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="size-4 text-brand-600 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}
