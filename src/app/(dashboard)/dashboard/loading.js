export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Memuat dashboard">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5 space-y-2">
        <div className="h-7 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-3 w-72 max-w-full rounded bg-zinc-100 dark:bg-zinc-800/60" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40"
          />
        ))}
      </div>

      <div className="h-28 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40" />
      <div className="h-72 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40" />
      <div className="h-64 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40" />
    </div>
  );
}
