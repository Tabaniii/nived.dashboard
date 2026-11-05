'use client';

import { useActionState } from 'react';
import { selectDashboardStoreAction } from '../actions';

export default function StoreSwitcher({ stores, selectedStoreId }) {
  const [state, action, pending] = useActionState(selectDashboardStoreAction, null);

  return (
    <form action={action} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      <label htmlFor="dashboard-store" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        Toko
      </label>
      <select
        id="dashboard-store"
        name="store_id"
        defaultValue={selectedStoreId || ''}
        required
        disabled={pending || stores.length === 0}
        className="min-h-11 max-w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-brand-500 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <option value="" disabled>{stores.length ? 'Pilih toko' : 'Belum ada toko'}</option>
        {stores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.business_name}{store.status === 'suspended' ? ' (ditangguhkan)' : ''}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || stores.length === 0}
        className="min-h-11 cursor-pointer rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-default disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? 'Memuat…' : 'Buka toko'}
      </button>
      {state?.error && <p role="alert" className="basis-full text-xs text-rose-700 dark:text-rose-400">{state.error}</p>}
    </form>
  );
}
