import { redirect } from 'next/navigation';
import CardModeForm from '../components/CardModeForm';
import MigrationNotice from '../components/MigrationNotice';
import { getClientContext, getClientCards } from '../queries';

export const metadata = {
  title: 'Mode Kartu — Dashboard Nived',
};

export const instant = false;

export default async function CardModePage() {
  const ctx = await getClientContext();
  if (!ctx) redirect('/');

  const cards = await getClientCards(ctx.profile.merchant_id);
  const needsMigration = cards.length > 0 && !Object.hasOwn(cards[0], 'card_mode');

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          Mode Kartu
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Ganti fungsi kartu NFC & QR kapan saja. Link yang sudah ditempel di meja tidak perlu diubah.
        </p>
      </div>

      {needsMigration && <MigrationNotice feature="Mode Kartu" />}
      <CardModeForm cards={cards} needsMigration={needsMigration} />
    </div>
  );
}
