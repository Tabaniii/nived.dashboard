import 'server-only';
import { requireRole } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { uuid, businessDates } from './validation';
import { staffPerformance } from './performance';

export async function adminContext() {
  const session = await requireRole('admin');
  if (!session) throw new Error('Active super admin access required.');
  return { db: createAdminClient(), session };
}
// Never silently report a truncated total at Supabase's row limit.
export async function allRows(build) {
  const rows = [];
  for (let offset = 0; offset < 100000; offset += 500) {
    const { data, error } = await build().order('id').range(offset, offset + 499);
    if (error) throw new Error('Unable to read POS records. Please retry.');
    rows.push(...data);
    if (data.length < 500) return rows;
  }
  throw new Error('Too many records. Narrow the report period.');
}
export async function setupData() {
  const { db } = await adminContext();
  const [merchants, outlets, employees] = await Promise.all([
    allRows(() => db.from('merchants').select('id,business_name,status')),
    allRows(() => db.from('outlets').select('*')),
    allRows(() => db.from('profiles').select('id,email,full_name,role,merchant_id,outlet_id,is_active')),
  ]);
  return { merchants, outlets, employees };
}
export async function reportData(filters) {
  const { db } = await adminContext();
  const { merchant, outlet, employee } = filters;
  if (!uuid(merchant) || (outlet && !uuid(outlet)) || (employee && employee !== 'unattributed' && !uuid(employee))) throw new Error('Invalid report scope.');
  const { from, to } = businessDates(filters.from, filters.through);
  const { data: m } = await db.from('merchants').select('id').eq('id', merchant).maybeSingle();
  if (!m) throw new Error('Merchant not found.');
  if (outlet) {
    const { data } = await db.from('outlets').select('id').eq('id', outlet).eq('merchant_id', merchant).maybeSingle();
    if (!data) throw new Error('Outlet does not belong to this merchant.');
  }
  const scope = q => outlet ? q.eq('merchant_id', merchant).eq('outlet_id', outlet) : q.eq('merchant_id', merchant);
  const actor = q => !employee ? q : employee === 'unattributed' ? q.is('user_id', null) : q.eq('user_id', employee);
  const period = (q, col) => q.gte(col, from).lt(col, to);
  const [profiles, payments, shifts, movements, audits, orders] = await Promise.all([
    allRows(() => scope(db.from('profiles').select('id,full_name,role,is_active')).neq('role','client')),
    allRows(() => {
      let q = db.from('payments').select('*,orders!inner(outlet_id,merchant_id,order_number,user_id)').eq('merchant_id', merchant).eq('orders.merchant_id', merchant);
      if (outlet) q = q.eq('orders.outlet_id', outlet);
      return period(actor(q), 'paid_at');
    }),
    allRows(() => actor(scope(db.from('shifts').select('*'))).lt('opened_at', to).or(`closed_at.is.null,closed_at.gte.${from}`)),
    allRows(() => period(actor(scope(db.from('cash_movements').select('*'))), 'created_at')),
    allRows(() => period(actor(scope(db.from('audit_logs').select('id,user_id,action,entity,entity_id,reason,before_state,after_state,created_at,outlet_id,merchant_id'))), 'created_at')),
    allRows(() => period(actor(scope(db.from('orders').select('*'))), 'created_at')),
  ]);
  const rows = staffPerformance({ profiles: profiles.filter(p => !employee || p.id === employee), payments, shifts }, from, to);
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, amount: 0, receipts: 0 }));
  for (const p of payments) if (p.status === 'success') {
    const hour = (new Date(p.paid_at).getUTCHours() + 7) % 24;
    hourly[hour].amount += Number(p.amount); hourly[hour].receipts++;
  }
  return { rows, payments, shifts, movements, audits, orders, hourly, from, to };
}
export async function orderDetail(merchant, outlet, id) {
  const { db } = await adminContext();
  if (!uuid(merchant) || !uuid(id) || (outlet && !uuid(outlet))) throw new Error('Invalid transaction scope.');
  let query = db.from('orders').select('*').eq('id', id).eq('merchant_id', merchant);
  if (outlet) query = query.eq('outlet_id', outlet);
  const { data: order, error } = await query.maybeSingle();
  if (error || !order) throw new Error('Transaction not found in this scope.');
  const [items, bills, payments] = await Promise.all([
    allRows(() => db.from('order_items').select('*,order_item_modifiers(*)').eq('order_id', order.id)),
    allRows(() => db.from('bills').select('*').eq('order_id', order.id)),
    allRows(() => db.from('payments').select('*').eq('order_id', order.id).eq('merchant_id', merchant)),
  ]);
  return { order, items, bills, payments };
}
