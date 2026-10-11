export default function FallbackView({ slug }) {
  return (
    <main className="max-w-md mx-auto min-h-screen px-4 py-8 flex flex-col justify-center items-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="w-full p-6 sm:p-8 bg-white dark:bg-zinc-900 rounded-3xl shadow-sm border border-zinc-200/80 dark:border-zinc-800 text-center">
        {/* Friendly Reassurance Icon */}
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
          <svg
            className="w-8 h-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 mb-2">
          Card Not Found or Inactive
        </h1>

        {/* Reassuring Description */}
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
          This physical card {slug ? `(${slug})` : ''} is currently not registered or has been deactivated.
          Please ask the store staff for assistance.
        </p>

        {/* Footer info */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400 dark:text-zinc-500">
          NFC Reputation Shield
        </div>
      </div>
    </main>
  );
}
