import ProvisionMerchantForm from '../components/ProvisionMerchantForm';
import MerchantsTable from '../components/MerchantsTable';
import { listMerchants } from '../queries';

export const metadata = {
  title: 'Manajemen Merchant — Admin Nived',
};

export default async function AdminMerchantsPage() {
  const merchants = await listMerchants();

  return (
    <div className="space-y-8">
      <div className="border-b border-zinc-800/80 pb-5">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          Manajemen Merchant
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Kelola profil toko, masa uji coba (trial), aktivasi langganan, dan pembuatan akun client baru.
        </p>
      </div>

      <ProvisionMerchantForm />

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-100">Daftar Merchant Terdaftar</h3>
        <MerchantsTable merchants={merchants} />
      </section>
    </div>
  );
}
