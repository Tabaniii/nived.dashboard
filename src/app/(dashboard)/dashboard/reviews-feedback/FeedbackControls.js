'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { ExternalLink } from 'lucide-react';
import { updateFeedbackResolutionAction } from '../actions';

const focusClass = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';

export function ResolutionToggle({ id, storeId, resolved, tableNumber }) {
  const [pending, startTransition] = useTransition();
  const [shownResolved, setShownResolved] = useOptimistic(resolved);
  const [error, setError] = useState(false);

  function toggle() {
    setError(false);
    startTransition(async () => {
      const nextResolved = !shownResolved;
      setShownResolved(nextResolved);
      try {
        const result = await updateFeedbackResolutionAction(id, nextResolved, storeId);
        setError(!result.success);
      } catch {
        setError(true);
      }
    });
  }

  return (
    <div className="min-w-28">
      <button
        type="button"
        role="switch"
        aria-busy={pending}
        aria-checked={shownResolved}
        aria-label={tableNumber ? `Masukan Meja ${tableNumber} selesai` : 'Masukan selesai'}
        disabled={pending}
        onClick={toggle}
        className={`group inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg text-xs font-medium text-zinc-700 disabled:cursor-wait disabled:opacity-60 dark:text-zinc-300 ${focusClass}`}
      >
        <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full border ${shownResolved ? 'border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500' : 'border-zinc-500 bg-zinc-100 dark:bg-zinc-800'}`}>
          <span className={`absolute top-0.5 size-3.5 rounded-full motion-safe:transition-transform ${shownResolved ? 'left-0.5 translate-x-4 bg-white' : 'left-0.5 bg-zinc-500 dark:bg-zinc-300'}`} />
        </span>
        <span aria-hidden="true">{shownResolved ? 'Selesai' : 'Belum selesai'}</span>
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-rose-700 dark:text-rose-400">Status gagal disimpan.</p>}
    </div>
  );
}

export function CopySummaryButton({ text }) {
  const [status, setStatus] = useState('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Ringkasan disalin.');
    } catch {
      setStatus('Gagal menyalin. Ringkasan tersedia di WhatsApp.');
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={copy}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800 ${focusClass}`}
      >
        Salin ke WhatsApp <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>
      <span role="status" className={status ? 'w-full text-xs text-zinc-600 dark:text-zinc-400' : 'sr-only'}>{status}</span>
    </div>
  );
}
