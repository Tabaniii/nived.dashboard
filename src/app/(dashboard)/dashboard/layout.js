import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/shell/AppShell';
import { getClientContext } from './queries';

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/mode', label: 'Mode Kartu' },
  { href: '/dashboard/staff', label: 'Staff & Meja' },
  { href: '/dashboard/promo', label: 'Promosi' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export const instant = false;

export default async function DashboardLayout({ children }) {
  await connection();
  const ctx = await getClientContext();
  if (!ctx) {
    redirect('/');
  }

  if (ctx.merchant?.status === 'suspended') {
    redirect('/?error=suspended');
  }

  return (
    <AppShell
      title={ctx.merchant?.business_name || 'Client Dashboard'}
      nav={nav}
      email={ctx.profile.email}
    >
      {children}
    </AppShell>
  );
}
