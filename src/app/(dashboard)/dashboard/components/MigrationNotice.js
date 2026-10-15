import { Database } from 'lucide-react';

export default function MigrationNotice({ feature = 'Fitur ini' }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200"
    >
      <Database className="size-4 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold">{feature} butuh update database</p>
        <p className="leading-relaxed">
          Buka Supabase → SQL Editor, tempel isi file{' '}
          <code className="font-mono">supabase/migrations/20261015000000_growth_features.sql</code>, lalu klik
          Run. Setelah itu muat ulang halaman ini.
        </p>
      </div>
    </div>
  );
}
