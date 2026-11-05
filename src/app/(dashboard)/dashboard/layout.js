import { connection } from 'next/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import AppShell from '@/components/shell/AppShell';
import { isPortalAdmin } from '@/lib/auth/portal';
import StoreSwitcher from './components/StoreSwitcher';
import { getClientContext, getDashboardStoreOptions } from './queries';

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/reviews-feedback', label: 'Reviews & Feedback' },
  { href: '/dashboard/review-link', label: 'Link Google Maps' },
  { href: '/dashboard/staff', label: 'Staff & Meja' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export const instant = false;

export default async function DashboardLayout({ children }) {
  await connection();
  const ctx = await getClientContext();
  if (!ctx) {
    redirect('/login');
  }

  const superadmin = ctx.profile.dashboard_role === 'superadmin';
  const stores = superadmin ? await getDashboardStoreOptions() : [];

  return (
    <AppShell
      title={ctx.merchant?.business_name || 'Dashboard Toko'}
      nav={nav}
      email={ctx.profile.email}
      toolbar={superadmin && (
        <div className="border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-2 sm:px-6">
            <StoreSwitcher key={ctx.merchant?.id} stores={stores} selectedStoreId={ctx.merchant?.id} />
            {isPortalAdmin(ctx.profile) && (
              <Link href="/admin" className="inline-flex min-h-11 items-center text-xs font-semibold text-brand-700 underline dark:text-brand-300">
                Panel admin
              </Link>
            )}
          </div>
        </div>
      )}
    >
      {ctx.merchant ? <div key={ctx.merchant.id}>{children}</div> : (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-base font-semibold">{stores.length ? 'Pilih toko' : 'Belum ada toko'}</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {stores.length ? 'Pilih toko di bilah atas untuk membuka dashboardnya.' : 'Toko yang dibuat dari panel admin akan tersedia di sini.'}
          </p>
        </section>
      )}
    </AppShell>
  );
}
