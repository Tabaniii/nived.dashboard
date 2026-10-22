'use client';
import { useActionState, useState } from 'react';
import { saveOutlet, saveEmployee } from './actions';
import { POS_ROLES } from '@/lib/pos/validation';
export const inputClass = 'w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm';
function Field({ label, children }) { return <label className="grid gap-1 text-sm">{label}{children}</label>; }
function Result({ state, pending }) { return <><button disabled={pending} className="rounded-lg bg-brand-600 px-4 py-2 text-white disabled:opacity-50">{pending ? 'Saving…' : 'Save'}</button><p role="status" className={state?.error ? 'text-red-600' : 'text-green-700'}>{state?.error || state?.success}</p></>; }
export function OutletForm({ merchants, outlet = {} }) {
  const [state, action, pending] = useActionState(saveOutlet, null);
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="id" value={outlet.id || ''}/>
    <Field label="Merchant"><select required className={inputClass} name="merchant_id" defaultValue={outlet.merchant_id || ''}><option value="">Select merchant</option>{merchants.filter(m => !outlet.id || m.id === outlet.merchant_id).map(m => <option key={m.id} value={m.id}>{m.business_name}</option>)}</select></Field>
    <Field label="Outlet name"><input required className={inputClass} name="name" defaultValue={outlet.name} maxLength={200}/></Field>
    <Field label="Address"><input className={inputClass} name="address" defaultValue={outlet.address}/></Field>
    <Field label="Phone"><input className={inputClass} name="phone" defaultValue={outlet.phone}/></Field>
    <Field label="Tax (%)"><input required className={inputClass} name="tax_rate" type="number" min="0" max="100" step="0.01" defaultValue={outlet.id ? Number(outlet.tax_rate)*100 : 10}/></Field>
    <Field label="Service charge (%)"><input required className={inputClass} name="service_charge_rate" type="number" min="0" max="100" step="0.01" defaultValue={outlet.id ? Number(outlet.service_charge_rate)*100 : 5}/></Field>
    <Result state={state} pending={pending}/>
  </form>;
}
export function EmployeeForm({ merchants, outlets, employee = {} }) {
  const [state, action, pending] = useActionState(saveEmployee, null);
  const [merchant, setMerchant] = useState(employee.merchant_id || '');
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="id" value={employee.id || ''}/>
    <Field label="Full name"><input required className={inputClass} name="full_name" defaultValue={employee.full_name} maxLength={200}/></Field>
    {!employee.id && <><Field label="Login email"><input required className={inputClass} name="email" type="email" autoComplete="off"/></Field><Field label="Initial password (12+ characters)"><input required className={inputClass} name="password" type="password" minLength={12} autoComplete="new-password"/></Field></>}
    <Field label="Role"><select name="role" className={inputClass} defaultValue={employee.role || 'cashier'}>{POS_ROLES.map(r => <option key={r}>{r}</option>)}</select></Field>
    <Field label="Merchant"><select required name="merchant_id" className={inputClass} value={merchant} onChange={e=>setMerchant(e.target.value)}><option value="">Select merchant</option>{merchants.map(m=><option key={m.id} value={m.id}>{m.business_name}</option>)}</select></Field>
    <Field label="Outlet"><select key={merchant} name="outlet_id" className={inputClass} defaultValue={merchant === employee.merchant_id ? employee.outlet_id || '' : ''}><option value="">No outlet access</option>{outlets.filter(o=>o.merchant_id === merchant).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
    <label className="flex items-center gap-2"><input type="checkbox" name="is_active" defaultChecked={employee.id ? employee.is_active : true}/>Active account</label>
    <Result state={state} pending={pending}/>
  </form>;
}
