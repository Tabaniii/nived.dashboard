export default function StatCard({ label, value, hint, icon: Icon, badge }) {
  const formattedValue =
    typeof value === 'number' ? value.toLocaleString('id-ID') : value ?? '0';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 shadow-sm transition hover:border-zinc-700/80 hover:bg-zinc-900/70">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        {Icon ? (
          <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition-colors">
            <Icon className="size-4" />
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
          {formattedValue}
        </p>
        {badge ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            {badge}
          </span>
        ) : null}
      </div>

      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
