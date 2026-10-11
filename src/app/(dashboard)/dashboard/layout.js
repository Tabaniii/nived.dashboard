import { redirect } from 'next/navigation';
import AppShell from '@/components/shell/AppShell';
import { getClientContext } from './queries';

const nav = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export const instant = false;

export default async function DashboardLayout({ children }) {
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
