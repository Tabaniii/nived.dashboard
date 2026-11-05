begin;

-- The legacy POS owner field is required on the linked project. The demo
-- remains unassigned in dashboard RBAC, so only superadmins can view it.
insert into public.merchants (id, name, business_name, owner_name, owner_user_id, slug, google_place_id, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'Kopi Titik Temu', 'Kopi Titik Temu', 'Nived Demo',
  (select id from public.profiles where dashboard_role = 'superadmin' and is_active order by id limit 1),
  'kopi-titik-temu', 'ChIJN1t_tDeuEmsRUsoyG83frY4', 'active'
)
on conflict (id) do nothing;

-- Do not write sample records if the reserved store ID belongs to another store.
do $$
begin
  if not exists (
    select 1 from public.merchants
    where id = '11111111-1111-1111-1111-111111111111' and slug = 'kopi-titik-temu' and owner_id is null
  ) then
    raise exception 'Reserved demo store ID is already in use';
  end if;
end;
$$;

insert into public.review_click_events (id, store_id, table_number, created_at)
select click.id::uuid, '11111111-1111-1111-1111-111111111111', click.table_number,
  now() - make_interval(days => click.days_ago, hours => click.hours_ago)
from (values
  ('11111111-1111-4111-8111-111111111101', '02', 1, 0),
  ('11111111-1111-4111-8111-111111111102', '05', 2, 0),
  ('11111111-1111-4111-8111-111111111103', '01', 3, 0),
  ('11111111-1111-4111-8111-111111111104', '08', 3, 2),
  ('11111111-1111-4111-8111-111111111105', '04', 5, 0)
) as click(id, table_number, days_ago, hours_ago)
on conflict (id) do nothing;

insert into public.customer_feedback (
  id, store_id, table_number, category, feedback_text, customer_contact, sentiment_tag, resolved_status, created_at
)
select feedback.id::uuid, '11111111-1111-1111-1111-111111111111',
  feedback.table_number, feedback.category, feedback.feedback_text, feedback.customer_contact,
  feedback.sentiment_tag, feedback.resolved_status, now() - make_interval(days => feedback.days_ago)
from (values
  ('11111111-1111-4111-8111-111111111201', '03', 'Suasana / Fasilitas',
    'AC di lantai 2 pas di atas meja 3 agak netes air kak, jadinya agak terganggu pas buka laptop.',
    '081288990011', 'negative', false, 1),
  ('11111111-1111-4111-8111-111111111202', '07', 'Rasa Makanan / Minuman',
    'Es Kopi Susunya mantap banget gurihnya pas, tapi kentang gorengnya agak kurang garam sedikit.',
    null, 'neutral', false, 2),
  ('11111111-1111-4111-8111-111111111203', '02', 'Kecepatan Pelayanan',
    'Pelayanan baristanya ramah banget! Cuma pas jam makan siang tadi pesanan croissant sempet kelupaan 20 menit.',
    '087712345678', 'neutral', true, 4),
  ('11111111-1111-4111-8111-111111111204', '06', 'Kebersihan',
    'Ashtray di area smoking belum sempat dibersihkan waktu kami baru duduk.',
    null, 'negative', true, 6)
) as feedback(id, table_number, category, feedback_text, customer_contact, sentiment_tag, resolved_status, days_ago)
on conflict (id) do nothing;

insert into public.feedback_summaries (
  merchant_id, period_start, period_end, feedback_count, complaint_count, summary, source, private_feedback_only
)
select
  '11111111-1111-1111-1111-111111111111', now() - interval '7 days', now(), 4, 2,
  'Masukan minggu ini mencatat AC menetes, keterlambatan pesanan saat makan siang, dan asbak yang belum dibersihkan. Es kopi susu dipuji, sementara kentang goreng dinilai kurang asin. Minggu depan, tugaskan satu staf untuk memeriksa meja dan area merokok sebelum jam makan siang.',
  'rules', true
where not exists (
  select 1 from public.feedback_summaries
  where merchant_id = '11111111-1111-1111-1111-111111111111' and private_feedback_only
);

commit;
