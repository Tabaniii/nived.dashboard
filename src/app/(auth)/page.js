import LoginForm from './LoginForm';
import ThemeToggle from '@/components/theme/ThemeToggle';

/** Blocking route: reads searchParams for suspended/error banners (cacheComponents). */
export const instant = false;

export const metadata = {
  title: 'Masuk — Nived NFC',
  description: 'Portal autentikasi Nived Reputation Shield',
};

export default async function AuthPortalPage({ searchParams }) {
  const params = await searchParams;
  let bannerError = null;
  if (params?.error === 'suspended') {
    bannerError = 'Akses merchant ditangguhkan. Hubungi Nived.';
  }

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-950 px-4 py-16 transition-colors duration-150">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(42,83,231,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(244,244,245,0.8),_transparent)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(42,83,231,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(39,39,42,0.9),_#09090b)]"
      />
      
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/80 p-8 shadow-xl shadow-zinc-200/50 dark:shadow-2xl dark:shadow-black/40 backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
          Nived
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Reputation Shield
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Masuk dengan akun yang diberikan tim Nived. Tidak ada pendaftaran mandiri.
        </p>
        <LoginForm bannerError={bannerError} />
      </div>
    </div>
  );
}
