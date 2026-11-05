begin;

-- Canonical shared POS tables: merchants = stores, categories = menu_categories,
-- products = menu_items; order open/sent/ready = pending/preparing/served.
do $$
begin
  if exists (select 1 from public.merchants where id = '11111111-1111-1111-1111-111111111111' and slug is distinct from 'kopi-titik-temu') then
    raise exception 'Reserved pilot merchant does not match Kopi Titik Temu';
  end if;
  if (select count(*) from public.profiles where email in ('kopi.titik.temu.owner@example.com', 'nived.pilot.superadmin@example.com') and is_active) <> 2 then
    raise exception 'Run seed-pilot-auth.mjs before the SQL seed';
  end if;
  if exists (select 1 from public.merchants where id = '11111111-1111-1111-1111-111111111111' and owner_id is not null and owner_id <> (select id from public.profiles where email = 'kopi.titik.temu.owner@example.com')) then
    raise exception 'Refusing to replace an existing owner';
  end if;
end;
$$;

insert into public.merchants (id,name,business_name,owner_name,owner_user_id,slug,status)
values ('11111111-1111-1111-1111-111111111111','Kopi Titik Temu','Kopi Titik Temu',
 'Owner Kopi Titik Temu (Pilot)',(select id from public.profiles where email='kopi.titik.temu.owner@example.com'),
 'kopi-titik-temu','active') on conflict(id) do nothing;

update public.merchants set owner_id = (select id from public.profiles where email = 'kopi.titik.temu.owner@example.com'),
 owner_name = 'Owner Kopi Titik Temu (Pilot)', email = 'kopi.titik.temu.owner@example.com'
where id = '11111111-1111-1111-1111-111111111111';

insert into public.outlets (id, merchant_id, name, address, tax_rate, service_charge_rate)
values ('11111111-1111-4111-8111-111111110001', '11111111-1111-1111-1111-111111111111', 'Kopi Titik Temu - Pilot', 'Jl. Senopati No. 24, Jakarta Selatan', 0.10, 0.05)
on conflict (id) do nothing;

update public.profiles set merchant_id = '11111111-1111-1111-1111-111111111111', outlet_id = '11111111-1111-4111-8111-111111110001'
where email = 'kopi.titik.temu.owner@example.com';

-- Active sample tickets need a real staff shift for the POS sync guard.
insert into public.shifts (merchant_id,outlet_id,user_id,opening_cash,status,notes)
select '11111111-1111-1111-1111-111111111111','11111111-1111-4111-8111-111111110001',p.id,500000,'open','Pilot active cashier shift'
from public.profiles p where p.email='kopi.titik.temu.owner@example.com'
 and not exists(select 1 from public.shifts s where s.outlet_id=p.outlet_id and s.user_id=p.id and s.status='open');

insert into public.shifts (id,merchant_id,outlet_id,user_id,opened_at,closed_at,opening_cash,expected_cash,actual_cash,variance,status,notes)
select md5('nived-pilot-shift-'||n)::uuid,'11111111-1111-1111-1111-111111111111','11111111-1111-4111-8111-111111110001',p.id,
 ((now() at time zone 'Asia/Jakarta')::date-n+time '08:00') at time zone 'Asia/Jakarta',
 least(((now() at time zone 'Asia/Jakarta')::date-n+time '18:00') at time zone 'Asia/Jakarta',
   (select min(opened_at)-interval '1 minute' from public.shifts where user_id=p.id and status='open')),
 200000,200000,200000,0,'closed','Pilot historical cashier shift'
from generate_series(0,6) n cross join public.profiles p
where p.email='kopi.titik.temu.owner@example.com'
on conflict(id) do nothing;

insert into public.areas (id, merchant_id, outlet_id, name)
values (md5('nived-pilot-area')::uuid, '11111111-1111-1111-1111-111111111111', '11111111-1111-4111-8111-111111110001', 'Ruang Utama')
on conflict (id) do nothing;

insert into public.tables (id, merchant_id, outlet_id, area_id, name, capacity, pos_x, pos_y, qr_token)
select md5('nived-pilot-table-' || n)::uuid, '11111111-1111-1111-1111-111111111111', '11111111-1111-4111-8111-111111110001', md5('nived-pilot-area')::uuid,
  'Meja ' || lpad(n::text, 2, '0'), case when n % 3 = 0 then 6 else 4 end, 70 + ((n-1)%5)*160, 80 + ((n-1)/5)*180, 'kopi-titik-temu-meja-' || lpad(n::text, 2, '0')
from generate_series(1,10) n on conflict (id) do nothing;

insert into public.cards (id, slug, merchant_id, store_name, google_review_url, is_active, activated_at, card_mode, alerts_enabled)
select md5('nived-pilot-card-' || n)::uuid, 'kopi-titik-temu-meja-' || lpad(n::text,2,'0'),
  '11111111-1111-1111-1111-111111111111', 'Kopi Titik Temu',
  'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4', true, now(), 'review', false
from generate_series(1,10) n on conflict (id) do nothing;

insert into public.categories (id, merchant_id, outlet_id, name, station, sort_order)
select md5('nived-pilot-category-' || n)::uuid, '11111111-1111-1111-1111-111111111111', '11111111-1111-4111-8111-111111110001', name, station, n
from (values (1,'Coffee','Bar'), (2,'Non-Coffee','Bar'), (3,'Pastry & Snacks','Kitchen'), (4,'Main Course','Kitchen')) v(n,name,station)
on conflict (id) do nothing;

insert into public.products (id, merchant_id, outlet_id, category_id, name, price, image_url, is_available, is_favorite, description)
select md5('nived-pilot-product-' || n)::uuid, '11111111-1111-1111-1111-111111111111', '11111111-1111-4111-8111-111111110001', md5('nived-pilot-category-' || category)::uuid,
  name, price, 'https://placehold.co/400x400/f5f0e8/41372b?text=' || replace(name,' ','+'), available, n = 1, 'Pilot dummy catalog - Kopi Titik Temu'
from (values
 (1,1,'Es Kopi Susu Titik Temu',24000,true), (2,1,'Iced Americano',22000,true),
 (3,2,'Matcha Latte',28000,true), (4,3,'Butter Croissant',25000,true),
 (5,3,'Truffle French Fries',30000,true), (6,4,'Nasi Goreng Kampung',38000,false)
) v(n,category,name,price,available) on conflict (id) do nothing;

insert into public.orders (id, merchant_id, outlet_id, order_number, table_id, user_id, shift_id, type, status, subtotal, tax, service, total, customer_name, notes, created_at, updated_at)
select md5('nived-pilot-order-' || n)::uuid, '11111111-1111-1111-1111-111111111111', '11111111-1111-4111-8111-111111110001',
 'PILOT-KTT-' || lpad(n::text,3,'0'), case when n % 4 = 0 then null else md5('nived-pilot-table-' || ((n-1)%10+1))::uuid end,
 (select id from public.profiles where email = 'kopi.titik.temu.owner@example.com'),
 case when n in (1,2,3) then (select id from public.shifts where user_id=(select id from public.profiles where email='kopi.titik.temu.owner@example.com') and status='open' and outlet_id='11111111-1111-4111-8111-111111110001') else md5('nived-pilot-shift-'||(n%7))::uuid end, case when n % 4 = 0 then 'takeaway' else 'dine_in' end,
 (array['open','sent','ready','completed','cancelled','completed','completed','completed','completed','completed','completed','completed','completed','completed','completed'])[n],
 p.price * (1+n%3) + p2.price, (p.price * (1+n%3)+p2.price)*1.05*0.10, (p.price * (1+n%3)+p2.price)*0.05, (p.price * (1+n%3)+p2.price)*1.155,
 (array['Ayu','Bima','Citra','Dimas','Eka'])[1+(n-1)%5], 'Pilot dummy order',
 ((now() at time zone 'Asia/Jakarta')::date - (n%7) + time '09:00' + make_interval(hours=>n%7)) at time zone 'Asia/Jakarta', now()
from generate_series(1,15) n
join public.products p on p.id = md5('nived-pilot-product-' || (1+(n-1)%5))::uuid
join public.products p2 on p2.id = md5('nived-pilot-product-' || (1+n%5))::uuid
on conflict (id) do nothing;

insert into public.order_items (id, order_id, product_id, table_id, name_snapshot, price_snapshot, qty, status, created_at)
select md5('nived-pilot-item-' || n || '-' || line)::uuid, o.id, p.id, o.table_id, p.name, p.price,
 case when line = 1 then 1+n%3 else 1 end,
 case o.status when 'open' then 'new' when 'sent' then 'preparing' when 'cancelled' then 'void' else 'served' end, o.created_at
from generate_series(1,15) n cross join generate_series(1,2) line
join public.orders o on o.id = md5('nived-pilot-order-' || n)::uuid
join public.products p on p.id = md5('nived-pilot-product-' || (1+(n-2+line)%5))::uuid
on conflict (id) do nothing;

insert into public.bills (id, merchant_id, order_id, subtotal, tax, service, discount, amount, status, created_at)
select md5('nived-pilot-bill-' || n)::uuid, o.merchant_id, o.id, o.subtotal, o.tax, o.service, o.discount, o.total,
 case o.status when 'completed' then 'paid' when 'cancelled' then 'cancelled' else 'pending' end, o.created_at
from generate_series(1,15) n join public.orders o on o.id = md5('nived-pilot-order-' || n)::uuid
on conflict (id) do nothing;

insert into public.payments (id, merchant_id, bill_id, order_id, user_id, shift_id, method, amount, tendered_amount, change_amount, reference, status, idempotency_key, paid_at, created_at)
select md5('nived-pilot-payment-' || n)::uuid, o.merchant_id, md5('nived-pilot-bill-' || n)::uuid, o.id, o.user_id, o.shift_id,
 (array['qris','cash','card'])[1+(n-1)%3], o.total,
 case when n%3=2 then ceil(o.total/50000)*50000 else o.total end,
 case when n%3=2 then ceil(o.total/50000)*50000-o.total else 0 end,
 'PILOT-' || case when n%3=0 then 'DEBIT-' else '' end || n, 'success', 'nived-pilot-payment-' || n, o.created_at + interval '35 minutes', o.created_at + interval '35 minutes'
from generate_series(1,15) n join public.orders o on o.id = md5('nived-pilot-order-' || n)::uuid
where o.status = 'completed' on conflict (id) do nothing;

insert into public.review_click_events (id, store_id, table_number, created_at)
select ('11111111-1111-4111-8111-' || lpad((111111111100+n)::text,12,'0'))::uuid,
 '11111111-1111-1111-1111-111111111111', lpad((1+(n-1)%10)::text,2,'0'),
 now() - make_interval(days => n%7, mins => n*3)
from generate_series(1,25) n on conflict (id) do nothing;

insert into public.customer_feedback (id,store_id,table_number,category,feedback_text,customer_contact,sentiment_tag,resolved_status,created_at)
select ('11111111-1111-4111-8111-' || lpad((111111111200+n)::text,12,'0'))::uuid,
 '11111111-1111-1111-1111-111111111111', lpad((1+(n-1)%10)::text,2,'0'), category, message, null, sentiment, resolved,
 now() - make_interval(days=>n%7, mins=>n*5)
from (values
 (1,'Suasana / Fasilitas','AC di lantai 2 menetes dekat meja, mohon diperiksa.','negative',false),
 (2,'Rasa Makanan / Minuman','Kopi susunya enak, kentang goreng perlu sedikit tambahan garam.','neutral',false),
 (3,'Kecepatan Pelayanan','Barista ramah, tetapi pesanan croissant menunggu 20 menit.','neutral',true),
 (4,'Kebersihan','Asbak di area merokok belum dibersihkan saat kami datang.','negative',true),
 (5,'Lainnya','Mohon tambahkan pilihan pembayaran debit di kasir.','neutral',false),
 (6,'Rasa Makanan / Minuman','Matcha latte lembut dan tidak terlalu manis, terima kasih!','positive',true),
 (7,'Kecepatan Pelayanan','Pesanan kopi datang cepat walaupun toko sedang ramai.','positive',true),
 (8,'Suasana / Fasilitas','Stopkontak meja 8 tidak berfungsi untuk mengisi laptop.','negative',false)
) v(n,category,message,sentiment,resolved) on conflict (id) do nothing;

update public.tables t set status = case when exists (
 select 1 from public.orders o where o.table_id=t.id and o.status not in ('completed','cancelled')
) then 'occupied' else 'available' end
where t.outlet_id = '11111111-1111-4111-8111-111111110001';

-- Match the POS: service is added before PB1 tax. Reconcile only reserved seed receipts.
update public.orders set
 tax = round((greatest(0,subtotal-discount)+service)*0.10),
 total = greatest(0,subtotal-discount)+service+round((greatest(0,subtotal-discount)+service)*0.10)
where id in (select md5('nived-pilot-order-' || n)::uuid from generate_series(1,15) n);
update public.bills b set tax=o.tax,service=o.service,subtotal=o.subtotal,discount=o.discount,amount=o.total
from public.orders o where b.order_id=o.id
 and b.id in (select md5('nived-pilot-bill-' || n)::uuid from generate_series(1,15) n);
update public.payments p set amount=o.total,
 tendered_amount=case when p.method='cash' then ceil(o.total/50000)*50000 else o.total end,
 change_amount=case when p.method='cash' then ceil(o.total/50000)*50000-o.total else 0 end
from public.orders o where p.order_id=o.id
 and p.id in (select md5('nived-pilot-payment-' || n)::uuid from generate_series(1,15) n);

-- Reconcile only reserved fixtures; leave browser-created tickets and shifts intact.
update public.orders o set shift_id=case when o.status in ('open','sent','ready') then (
 select s.id from public.shifts s where s.user_id=o.user_id and s.outlet_id=o.outlet_id and s.status='open'
) else md5('nived-pilot-shift-'||(n%7))::uuid end
from generate_series(1,15) n where o.id=md5('nived-pilot-order-'||n)::uuid;
update public.payments p set shift_id=o.shift_id,user_id=o.user_id from public.orders o
where p.order_id=o.id and p.id in(select md5('nived-pilot-payment-'||n)::uuid from generate_series(1,15) n);
update public.shifts s set expected_cash=s.opening_cash+coalesce((select sum(p.amount) from public.payments p where p.shift_id=s.id and p.method='cash' and p.status='success'),0),
 actual_cash=s.opening_cash+coalesce((select sum(p.amount) from public.payments p where p.shift_id=s.id and p.method='cash' and p.status='success'),0),variance=0
where s.id in(select md5('nived-pilot-shift-'||n)::uuid from generate_series(0,6) n);

-- Fail atomically if sample receipts or item quantities drift from their totals.
do $$
begin
 if (select count(*) from public.shifts where id in(select md5('nived-pilot-shift-'||n)::uuid from generate_series(0,6) n)) <> 7 then raise exception 'Expected 7 historical pilot shifts'; end if;
 if exists(select 1 from public.orders where order_number like 'PILOT-KTT-%' and shift_id is null) then raise exception 'Pilot order shift missing'; end if;
 if (select count(*) from public.orders where order_number like 'PILOT-KTT-%') <> 15 then raise exception 'Expected 15 pilot orders'; end if;
 if exists (
   select 1 from public.orders o join public.order_items i on i.order_id=o.id
   where o.order_number like 'PILOT-KTT-%'
   group by o.id having sum(i.price_snapshot*i.qty) <> o.subtotal or o.total <> o.subtotal+o.tax+o.service-o.discount
 ) then raise exception 'Pilot order totals do not reconcile'; end if;
 if exists (
   select 1 from public.orders o left join public.payments p on p.order_id=o.id and p.status='success'
   where o.order_number like 'PILOT-KTT-%' and o.status='completed'
   group by o.id having coalesce(sum(p.amount),0) <> o.total
 ) then raise exception 'Completed receipts do not reconcile'; end if;
end;
$$;
commit;
