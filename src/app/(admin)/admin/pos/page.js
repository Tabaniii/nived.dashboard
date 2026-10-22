import Link from 'next/link';
import { setupData, reportData, orderDetail } from '@/lib/pos/data';
import Refresh from './Refresh';
export const instant = false;
const money = v => v == null ? '—' : new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
const time = v => v ? new Date(v).toLocaleString('en-GB',{timeZone:'Asia/Jakarta'}) : 'Open';
const control = 'rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent p-2 text-sm w-full';
function Table({ headers, rows }) { return <div className="overflow-x-auto rounded-lg border"><table className="w-full text-left text-sm"><thead className="bg-zinc-100 dark:bg-zinc-900"><tr>{headers.map(h=><th key={h} className="p-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r,i)=><tr key={i} className="border-t">{r.map((c,j)=><td className="p-3 align-top" key={j}>{c}</td>)}</tr>) : <tr><td className="p-5 text-zinc-500" colSpan={headers.length}>No records for this scope and period.</td></tr>}</tbody></table></div>; }
export default async function Page({ searchParams }) {
  const params = await searchParams;
  const { merchants, outlets, employees } = await setupData();
  const today = new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
  const filters = { merchant: params.merchant || '', outlet: params.outlet || '', employee: params.employee || '', from: params.from || today, through: params.through || today };
  let report, detail, error;
  try { if (filters.merchant) { report = await reportData(filters); if (params.order) detail = await orderDetail(filters.merchant, filters.outlet, params.order); } } catch (e) { error = e.message; }
  const name = id => id ? employees.find(p=>p.id===id)?.full_name || `Historical employee ${id}` : 'Unattributed / system';
  const receiptLink = (id, label) => <Link className="text-brand-600 underline" href={`/admin/pos?${new URLSearchParams({...filters,order:id})}#transaction`}>{label || id}</Link>;
  const total = key => report.rows.reduce((sum,r)=>sum + r[key],0);
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-2xl font-bold">POS employee performance</h2><p className="text-sm text-zinc-500">Shared Supabase records · business time Asia/Jakarta</p></div><Refresh/></div>
    <form className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3 lg:grid-cols-6">
      <label>Merchant<select name="merchant" required className={control} defaultValue={filters.merchant}><option value="">Select merchant</option>{merchants.map(m=><option key={m.id} value={m.id}>{m.business_name}</option>)}</select></label>
      <label>Outlet<select name="outlet" className={control} defaultValue={filters.outlet}><option value="">All merchant outlets</option>{outlets.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
      <label>Employee<select name="employee" className={control} defaultValue={filters.employee}><option value="">All employees</option><option value="unattributed">Unattributed / system</option>{employees.filter(p=>p.role!=='client').map(p=><option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}</select></label>
      <label>From<input className={control} name="from" type="date" required defaultValue={filters.from}/></label><label>Through<input className={control} name="through" type="date" required defaultValue={filters.through}/></label><button className="self-end rounded-lg bg-brand-600 p-2 text-white">Apply filters</button>
    </form>
    {error && <p role="alert" className="rounded-lg border border-red-400 p-4 text-red-600">{error}</p>}
    {!filters.merchant && <p>Select a merchant to read its POS activity. No sample data is shown.</p>}
    {report && <>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">{[['Successful receipts',total('transactions')],['Collected',money(total('collected'))],['Average receipt',money(total('transactions') ? total('collected')/total('transactions') : 0)],['Shift hours',total('hours').toFixed(2)],['Collected/hour',money(total('hours') ? total('collected')/total('hours') : null)],['Cash difference',money(total('cash_variance'))]].map(([label,value])=><div key={label} className="rounded-xl border p-4"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}</div>
      <p className="text-sm text-zinc-500">{new Set(report.payments.filter(p=>p.status==='success').map(p=>p.order_id)).size} distinct paid orders. Split bills count as separate receipts. Refunded amounts use the original payment date; successful receipts alone count as collected sales. Hours are shift overlap with the selected period, capped at now. Collection is not a complete measure of waiter or kitchen performance.</p>
      <h3 className="text-lg font-semibold">Employees, including zero activity</h3>
      <Table headers={['Employee','Role','Receipts','Collected','Refunded','Average','Hours','Collected/hour','Cash difference']} rows={report.rows.map(r=>[name(r.staff_id),r.role || 'Historical',r.transactions,money(r.collected),money(r.refunds),money(r.average_payment),r.hours.toFixed(2),money(r.collected_per_hour),money(r.cash_variance)])}/>
      <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Hourly sales · Jakarta hour of day</summary><Table headers={['Hour','Successful receipts','Collected']} rows={report.hourly.map(h=>[`${String(h.hour).padStart(2,'0')}:00`,h.receipts,money(h.amount)])}/></details>
      <h3 className="text-lg font-semibold">Payments · attributed to collector</h3>
      <Table headers={['Paid at','Order / receipt','Collector','Collector shift','Method','Status','Amount']} rows={report.payments.map(p=>[time(p.paid_at),<span key={p.id}>{receiptLink(p.order_id,p.orders.order_number)}<small className="block">{p.id}</small></span>,name(p.user_id),p.shift_id || 'Unattributed',p.method,p.status,money(p.amount)])}/>
      <h3 className="text-lg font-semibold">Orders created in period · creator attribution</h3>
      <Table headers={['Order','Created','Originator','Status','Order total (not collected)']} rows={report.orders.map(o=>[receiptLink(o.id,o.order_number),time(o.created_at),name(o.user_id),o.status,money(o.total)])}/>
      <h3 className="text-lg font-semibold">Shift history & cash variance review</h3>
      <Table headers={['Shift / employee','Opened / closed','Status','Opening','Expected','Actual','Difference','Approval','Notes']} rows={report.shifts.map(s=>[<span key={s.id}>{name(s.user_id)}<small className="block">{s.id}</small></span>,`${time(s.opened_at)} → ${time(s.closed_at)}`,s.status,money(s.opening_cash),money(s.expected_cash),money(s.actual_cash),money(s.variance),s.approved_by ? name(s.approved_by) : 'Unapproved',s.notes || '—'])}/>
      <p className="text-sm text-zinc-500">Expected cash = opening cash + successful cash payments for that shift + cash in − cash out. KPI variance includes only shifts closed in the selected period.</p>
      <h3 className="text-lg font-semibold">Cash in / out</h3><Table headers={['When','Employee','Shift','Type','Amount','Reason']} rows={report.movements.map(m=>[time(m.created_at),name(m.user_id),m.shift_id,m.type,money(m.amount),m.reason])}/>
      <h3 className="text-lg font-semibold">Activity audits</h3><Table headers={['When','Actor','Action','Entity','Reason / changes']} rows={report.audits.map(a=>[time(a.created_at),name(a.user_id),a.action,`${a.entity} ${a.entity_id || ''}`,<details key={a.id}><summary>{a.reason || 'Inspect changes'}</summary><pre className="max-w-md overflow-auto text-xs">{JSON.stringify({before:a.before_state,after:a.after_state},null,2)}</pre></details>])}/>
    </>}
    {detail && <section id="transaction" className="space-y-4 rounded-xl border p-5"><h3 className="text-lg font-semibold">Transaction {detail.order.order_number}</h3><p>Originator: {name(detail.order.user_id)} · Originating shift: {detail.order.shift_id || 'Unattributed'} · {detail.order.type} / {detail.order.source} · {detail.order.status}</p><p>Subtotal {money(detail.order.subtotal)} · Discount {money(detail.order.discount)} · Tax {money(detail.order.tax)} · Service {money(detail.order.service)} · Total {money(detail.order.total)}</p><Table headers={['Item','Quantity','Price','Kitchen status','Modifiers']} rows={detail.items.map(i=>[i.name_snapshot,i.qty,money(i.price_snapshot),i.status,i.order_item_modifiers.map(m=>`${m.name_snapshot} (${money(m.price_delta)})`).join(', ')])}/><Table headers={['Bill','Split group','Amount','Status']} rows={detail.bills.map(b=>[b.id,b.split_group,money(b.amount),b.status])}/><Table headers={['Payment','Collector','Collector shift','Paid at','Method','Amount','Tendered','Change','Status']} rows={detail.payments.map(p=>[p.id,name(p.user_id),p.shift_id || 'Unattributed',time(p.paid_at),p.method,money(p.amount),money(p.tendered_amount),money(p.change_amount),p.status])}/></section>}
  </div>;
}
