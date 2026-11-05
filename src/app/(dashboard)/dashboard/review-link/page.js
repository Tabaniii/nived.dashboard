import { redirect } from 'next/navigation';
import ReviewLinkForm from '../components/ReviewLinkForm';
import { getClientContext, getClientCards } from '../queries';

export const metadata = { title: 'Link Google Maps — Dashboard Nived' };
export const instant = false;

export default async function ReviewLinkPage() {
  const ctx = await getClientContext();
  if (!ctx) redirect('/login');
  if (!ctx.merchant) return null;

  const cards = await getClientCards(ctx.merchant.id);
  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">Link Google Maps</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Atur tujuan tombol ulasan Google untuk semua kartu NFC dan QR toko Anda.
        </p>
      </div>
      <ReviewLinkForm cards={cards} storeId={ctx.merchant.id} />
    </div>
  );
}
