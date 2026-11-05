'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { refreshWeeklySummaryAction } from '../actions';

export default function RefreshSummaryButton({ storeId }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function refresh() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await refreshWeeklySummaryAction(storeId);
        if (result?.error) setError(result.error);
      } catch {
        setError('Gagal membuat ringkasan. Coba lagi nanti.');
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={refresh}
        disabled={pending}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-wait disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        <RefreshCw aria-hidden="true" className={`size-3.5 shrink-0 ${pending ? 'motion-safe:animate-spin' : ''}`} />
        <span>{pending ? 'Menganalisis…' : 'Generate / Refresh AI Summary'}</span>
      </button>
      {error && <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">{error}</p>}
    </div>
  );
}
