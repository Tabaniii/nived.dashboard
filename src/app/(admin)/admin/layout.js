import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import AppShell from '@/components/shell/AppShell';
import { getAdminProfile } from './queries';

export const instant = false;

const nav = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/merchants', label: 'Merchants' },
  { href: '/admin/cards', label: 'Cards' },
  { href: '/admin/outlets', label: 'Outlets' },
  { href: '/admin/employees', label: 'Employees' },
  { href: '/admin/pos', label: 'POS performance' },
  { href: '/admin/telemetry', label: 'Telemetry' },
];

export default async function AdminLayout({ children }) {
  await connection();
  const profile = await getAdminProfile();
  if (!profile) {
    redirect('/');
  }

  return (
    <AppShell title="Admin Panel" nav={nav} email={profile.email}>
      {children}
    </AppShell>
  );
}
