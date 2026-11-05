import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const storeId = '11111111-1111-1111-1111-111111111111';
const dashboardUrl = process.env.PILOT_DASHBOARD_URL || 'http://localhost:3000';
const posUrl = process.env.PILOT_POS_URL || 'http://127.0.0.1:3002';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(url).hostname, 'wpfvwmitkfmxpagykykn.supabase.co');
const client = key => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const service = client(process.env.SUPABASE_SERVICE_ROLE_KEY);
const guest = client(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
let passed = 0;
function pass(label) { console.log(`PASS ${label}`); passed++; }
async function read(db, table, field, value, columns = '*') {
  const { data, error } = await db.from(table).select(columns).eq(field, value);
  assert.ifError(error);
  return data;
}

const anonymousPage = await fetch(`${dashboardUrl}/dashboard/reviews-feedback`, { redirect: 'manual' });
assert([303, 307, 308].includes(anonymousPage.status));
assert(new URL(anonymousPage.headers.get('location'), dashboardUrl).pathname === '/login');
assert.equal((await fetch(`${dashboardUrl}/api/dashboard/overview`)).status, 401);
assert.equal((await fetch(`${posUrl}/api/pos/bootstrap`)).status, 401);
for (const table of ['profiles', 'orders', 'payments', 'customer_feedback']) {
  const { data, error } = await guest.from(table).select('id').limit(1);
  assert(error?.code === '42501' || data?.length === 0, `Guest disclosed ${table}`);
}
pass('anonymous dashboard/POS guards and private-table read denial');

const { data: stores, error: storeError } = await service.from('merchants').select('id');
assert.ifError(storeError);
const otherStore = stores.find(store => store.id !== storeId)?.id;
assert(otherStore, 'Cross-store isolation needs a second store');

for (const prefix of ['PILOT_OWNER', 'PILOT_ADMIN']) {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  assert(email && password, `Run seed-pilot-auth.mjs for ${prefix}`);
  const db = client(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: auth, error } = await db.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  const owner = prefix === 'PILOT_OWNER';
  for (const [table, column] of [['orders', 'merchant_id'], ['products', 'merchant_id'], ['customer_feedback', 'store_id'], ['review_click_events', 'store_id']]) {
    assert((await read(db, table, column, storeId, 'id')).length > 0, `${prefix} missing pilot ${table}`);
    if (owner) assert.equal((await read(db, table, column, otherStore, 'id')).length, 0, `Cross-store ${table} disclosed`);
  }
  if (!owner) assert((await read(db, 'merchants', 'id', otherStore, 'id')).length === 1);
  pass(`${owner ? 'owner isolation' : 'superadmin global reads'} across POS and feedback tables`);

  const login = await fetch(`${dashboardUrl}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  let cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  if (!owner) cookie += `; nived_dashboard_store=${storeId}`;
  const headers = { cookie };
  const overview = await fetch(`${dashboardUrl}/api/dashboard/overview?store_id=${storeId}`, { headers });
  assert.equal(overview.status, 200);
  const result = await overview.json();
  assert.equal(result.merchant.id, storeId);
  const payments = await read(service, 'payments', 'merchant_id', storeId);
  const clicks = await read(service, 'review_click_events', 'store_id', storeId);
  const feedback = await read(service, 'customer_feedback', 'store_id', storeId);
  const orders = await read(service, 'orders', 'merchant_id', storeId);
  const day = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const today = payments.filter(p => p.status === 'success' && new Date(Date.parse(p.paid_at) + 7 * 3600000).toISOString().slice(0, 10) === day);
  assert.equal(result.kpi.salesToday, today.reduce((sum, p) => sum + Number(p.amount), 0));
  assert.equal(result.kpi.privateFeedbacks, feedback.length);
  assert.equal(result.kpi.activeTableOrders, orders.filter(o => o.table_id && ['open', 'sent', 'ready'].includes(o.status)).length);
  assert.equal(result.kpi.reviewClicks, clicks.filter(c => Date.parse(c.created_at) >= Date.now() - 7 * 86400000).length);
  if (owner) {
    assert.equal((await fetch(`${dashboardUrl}/api/dashboard/overview?store_id=${otherStore}`, { headers })).status, 403);
    const bootstrap = await fetch(`${posUrl}/api/pos/bootstrap`, { headers: { authorization: `Bearer ${auth.session.access_token}` } });
    assert.equal(bootstrap.status, 200);
    const pos = await bootstrap.json();
    assert.equal(pos.outlet.merchant_id, storeId);
    assert.equal(pos.products.length, 6);
    assert.equal(pos.categories.length, 4);
    assert.equal(pos.tables.length, 10);
    assert(pos.orders.every(order => order.merchant_id === storeId));
    assert.equal(pos.payments.filter(p => p.status === 'success').reduce((sum, p) => sum + Number(p.amount), 0), payments.filter(p => p.status === 'success').reduce((sum, p) => sum + Number(p.amount), 0));
    pass('POS bootstrap and merchant dashboard reconcile to the same live ledger');
  } else {
    const switched = `${cookie.replace(`nived_dashboard_store=${storeId}`, `nived_dashboard_store=${otherStore}`)}`;
    assert.equal((await fetch(`${dashboardUrl}/api/dashboard/overview?store_id=${otherStore}`, { headers: { cookie: switched } })).status, 200);
    pass('superadmin store switching accepts both authorized stores');
  }
  await db.auth.signOut({ scope: 'local' });
}

const orders = (await read(service, 'orders', 'merchant_id', storeId)).filter(o => o.order_number.startsWith('PILOT-KTT-'));
assert.equal(orders.length, 15);
for (const order of orders) {
  const items = await read(service, 'order_items', 'order_id', order.id);
  assert.equal(items.reduce((sum, item) => sum + item.qty * Number(item.price_snapshot), 0), Number(order.subtotal));
  assert.equal(Number(order.tax), Math.round((Number(order.subtotal) - Number(order.discount) + Number(order.service)) * 0.10));
  assert.equal(Number(order.total), Number(order.subtotal) - Number(order.discount) + Number(order.service) + Number(order.tax));
  if (order.status === 'completed') {
    const payments = await read(service, 'payments', 'order_id', order.id);
    assert.equal(payments.filter(p => p.status === 'success').reduce((sum, p) => sum + Number(p.amount), 0), Number(order.total));
  }
  assert(order.shift_id, 'Seed orders must have a usable shift');
}
pass('all 15 seed orders reconcile quantities, service-before-tax, receipts and shifts');
console.log(`${passed} live integration groups passed`);
