import { redirect } from 'next/navigation';
import SettingsForm from '../components/SettingsForm';
import { getClientContext, getClientCards } from '../queries';
import { getNotifyStatus } from '@/lib/notify';

export const metadata = {
  title: 'Pengaturan Toko — Dashboard Nived',
};

export const instant = false;

export default async function DashboardSettingsPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect('/login');
  if (!ctx.merchant) return null;
  const cards = await getClientCards(ctx.merchant.id);

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          Pengaturan Toko
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Kelola informasi toko, logo, dan pengiriman ringkasan mingguan untuk kartu NFC Anda.
        </p>
      </div>

      <SettingsForm cards={cards} notifyStatus={getNotifyStatus()} />
    </div>
  );
}
