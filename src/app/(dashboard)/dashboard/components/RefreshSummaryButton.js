'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshWeeklySummaryAction } from '../actions';

export default function RefreshSummaryButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function refresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshWeeklySummaryAction();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <span role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-60 cursor-pointer shadow-xs"
      >
        <RefreshCw className={`size-3.5 ${pending ? 'animate-spin' : ''}`} />
        <span>{pending ? 'Menganalisis…' : 'Perbarui'}</span>
      </button>
    </div>
  );
}
