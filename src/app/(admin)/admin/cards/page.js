import ProvisionCardForm from '../components/ProvisionCardForm';
import CardsTable from '../components/CardsTable';
import { listCards, listMerchants } from '../queries';

export const metadata = {
  title: 'Manajemen Kartu NFC — Admin Nived',
};

export default async function AdminCardsPage() {
  const [cards, merchants] = await Promise.all([listCards(), listMerchants()]);

  return (
    <div className="space-y-8">
      <div className="border-b border-zinc-800/80 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          Manajemen Kartu Fisik NFC
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Provision slug kartu baru, generate QR code untuk pencetakan, dan atur mode Shield vs Direct per kartu.
        </p>
      </div>

      <ProvisionCardForm merchants={merchants} />

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-100">Daftar Kartu Terdaftar</h3>
        <CardsTable cards={cards} />
      </section>
    </div>
  );
}
