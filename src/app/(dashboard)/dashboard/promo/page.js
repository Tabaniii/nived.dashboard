import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getClientContext, getSocialProofCandidates } from '../queries';

const QrStudio = dynamic(() => import('../components/QrStudio'), {
  loading: () => (
    <div className="h-64 animate-pulse rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40" />
  ),
});

const SocialProofStudio = dynamic(() => import('../components/SocialProofStudio'), {
  loading: () => (
    <div className="h-72 animate-pulse rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40" />
  ),
});

export const metadata = {
  title: 'Promosi — Dashboard Nived',
};

export const instant = false;

function param(value) {
  return typeof value === 'string' ? value : '';
}

export default async function PromotionPage({ searchParams }) {
  const ctx = await getClientContext();
  if (!ctx) redirect('/');

  const [query, data] = await Promise.all([searchParams, getSocialProofCandidates(ctx.profile.merchant_id)]);
  const cards = data.cards.map(({ id, slug, store_name }) => ({ id, slug, store_name }));

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">Promosi</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Unduh QR kartu dan buat konten Instagram dari ulasan 5★ pelanggan.
        </p>
      </div>

      <QrStudio
        cards={cards}
        initialCardId={param(query.card)}
        initialStaff={param(query.staff)}
        initialTable={param(query.meja)}
      />
      <SocialProofStudio reviews={data.reviews} initialReviewId={param(query.review)} />
    </div>
  );
}
