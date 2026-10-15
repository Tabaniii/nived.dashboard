import { Store } from 'lucide-react';

export default function CardSwitcher({ cards = [], selectedId, onSelect, label = 'Pilih Kartu Toko' }) {
  if (cards.length <= 1) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      <div className="flex flex-wrap gap-2">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={selectedId === c.id}
            onClick={() => onSelect(c.id)}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition cursor-pointer border ${
              selectedId === c.id
                ? 'border-brand-500/50 bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold'
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Store className="size-3.5" />
            <span>{c.store_name}</span>
            <span className="font-mono text-[10px] opacity-60">({c.slug})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
