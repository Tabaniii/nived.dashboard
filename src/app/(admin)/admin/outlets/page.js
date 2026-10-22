import { setupData } from '@/lib/pos/data';
import { OutletForm } from '../pos/ManagementForms';
export const instant = false;
export default async function Page() {
  const { merchants, outlets } = await setupData();
  return <div className="space-y-6"><h2 className="text-2xl font-bold">Outlet management</h2><p>Set up a real outlet before assigning POS employees. Tax and service rates apply to the outlet.</p><section className="rounded-xl border p-5 space-y-4"><h3 className="font-semibold">Create outlet</h3><OutletForm merchants={merchants}/></section>{outlets.length === 0 && <p>No outlets configured yet.</p>}{outlets.map(outlet=><details className="rounded-xl border p-5" key={outlet.id}><summary className="cursor-pointer font-semibold">{outlet.name} · {merchants.find(m=>m.id===outlet.merchant_id)?.business_name}</summary><div className="pt-4"><OutletForm merchants={merchants} outlet={outlet}/></div></details>)}</div>;
}
