begin;

-- Keep the tap and dashboard card fields available on existing POS-backed projects.
alter table public.cards
  add column if not exists deleted_at timestamptz,
  add column if not exists logo_url text,
  add column if not exists is_active boolean not null default true;
alter table public.internal_feedbacks
  add column if not exists customer_whatsapp varchar(30);

-- Merchant access is derived from profiles. Leave existing grants on safe
-- profile columns in place, and disallow client-side membership changes.
alter table public.profiles add column if not exists is_active boolean not null default true;
revoke update on public.profiles from public, anon, authenticated;
revoke update (id, merchant_id, role, is_active) on public.profiles from public, anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- Upgrade the original signup trigger without replacing the POS project's
-- newer trigger, which already reads access assignments from app metadata.
do $migration$
declare
  definition text := pg_get_functiondef(to_regprocedure('public.handle_new_user()'));
begin
  if position('raw_user_meta_data->>''role''' in definition) > 0 then
    execute replace(
      replace(definition, 'raw_user_meta_data->>''role''', 'raw_app_meta_data->>''role'''),
      'raw_user_meta_data->>''merchant_id''', 'raw_app_meta_data->>''merchant_id'''
    );
  end if;
end;
$migration$;

-- Some installations give only the original merchant owner access to cards.
-- Permit the assigned client to configure their card without allowing reassignment.
grant select on public.cards, public.merchants, public.profiles to authenticated;
grant select on public.cards, public.merchants to service_role;
revoke update on public.cards from public, anon, authenticated;
grant update (
  store_name, logo_url, google_review_url, whatsapp_number,
  card_mode, mode_until, promo_title, promo_message, promo_image_url, promo_cta_label, promo_url,
  alerts_enabled, alert_whatsapp, alert_telegram_chat_id
) on public.cards to authenticated;

create policy tabletop_cards_client_select on public.cards
  for select to authenticated
  using (deleted_at is null and merchant_id in (
    select p.merchant_id from public.profiles p
    join public.merchants m on m.id = p.merchant_id
    where p.id = (select auth.uid()) and p.role = 'client' and p.is_active
      and m.status in ('trial', 'active')
  ));

create policy tabletop_cards_client_update on public.cards
  for update to authenticated
  using (deleted_at is null and merchant_id in (
    select p.merchant_id from public.profiles p
    join public.merchants m on m.id = p.merchant_id
    where p.id = (select auth.uid()) and p.role = 'client' and p.is_active
      and m.status in ('trial', 'active')
  ));

create table public.customer_feedback (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.merchants(id) on delete cascade,
  table_number text check (char_length(table_number) <= 20),
  category text not null check (category in (
    'Rasa Makanan / Minuman', 'Kecepatan Pelayanan', 'Kebersihan', 'Suasana / Fasilitas', 'Lainnya'
  )),
  feedback_text text not null check (
    char_length(feedback_text) <= 2000 and feedback_text ~ '[^[:space:]]'
  ),
  customer_contact text check (char_length(customer_contact) <= 30),
  created_at timestamptz not null default now(),
  sentiment_tag text default 'neutral' check (sentiment_tag in ('positive', 'neutral', 'negative')),
  resolved_status boolean not null default false
);

create index customer_feedback_store_created_idx
  on public.customer_feedback (store_id, created_at desc, id desc);

alter table public.customer_feedback enable row level security;
revoke all on public.customer_feedback from public, anon, authenticated;
grant insert (store_id, table_number, category, feedback_text, customer_contact)
  on public.customer_feedback to anon, authenticated;
grant select, update (resolved_status) on public.customer_feedback to authenticated;
grant select, insert on public.customer_feedback to service_role;

create policy customer_feedback_public_insert on public.customer_feedback
  for insert to anon, authenticated
  with check (true);

create policy customer_feedback_owner_select on public.customer_feedback
  for select to authenticated
  using (store_id in (
    select p.merchant_id from public.profiles p
    join public.merchants m on m.id = p.merchant_id
    where p.id = (select auth.uid()) and p.role = 'client' and p.is_active
      and m.status in ('trial', 'active')
  ));

create policy customer_feedback_owner_resolve on public.customer_feedback
  for update to authenticated
  using (store_id in (
    select p.merchant_id from public.profiles p
    join public.merchants m on m.id = p.merchant_id
    where p.id = (select auth.uid()) and p.role = 'client' and p.is_active
      and m.status in ('trial', 'active')
  ))
  with check (store_id in (
    select p.merchant_id from public.profiles p
    join public.merchants m on m.id = p.merchant_id
    where p.id = (select auth.uid()) and p.role = 'client' and p.is_active
      and m.status in ('trial', 'active')
  ));

-- Import written submissions from the old private path. Keep the legacy records
-- intact for historical rating metrics and exclude text intended for Google.
insert into public.customer_feedback (
  store_id, table_number, category, feedback_text, customer_contact, created_at
)
select c.merchant_id, f.table_code, 'Lainnya', left(f.feedback_text, 2000),
  f.customer_whatsapp, f.created_at
from public.internal_feedbacks f
join public.cards c on c.id = f.card_id
where c.merchant_id is not null
  and f.rating between 1 and 3
  and left(f.feedback_text, 2000) ~ '[^[:space:]]';

create table public.review_click_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.merchants(id) on delete cascade,
  table_number text check (char_length(table_number) <= 20),
  created_at timestamptz not null default now()
);

create index review_click_events_store_created_idx
  on public.review_click_events (store_id, created_at desc);

alter table public.review_click_events enable row level security;
revoke all on public.review_click_events from public, anon, authenticated;
grant insert (store_id, table_number) on public.review_click_events to anon, authenticated;
grant select on public.review_click_events to authenticated;
grant insert on public.review_click_events to service_role;

create policy review_click_events_public_insert on public.review_click_events
  for insert to anon, authenticated
  with check (true);

create policy review_click_events_owner_select on public.review_click_events
  for select to authenticated
  using (store_id in (
    select p.merchant_id from public.profiles p
    join public.merchants m on m.id = p.merchant_id
    where p.id = (select auth.uid()) and p.role = 'client' and p.is_active
      and m.status in ('trial', 'active')
  ));

alter table public.feedback_summaries add column private_feedback_only boolean not null default false;
create index feedback_summaries_private_latest_idx
  on public.feedback_summaries (merchant_id, period_end desc, created_at desc)
  where private_feedback_only;

grant select on public.feedback_summaries to authenticated;
grant select, insert on public.feedback_summaries to service_role;
grant usage on sequence public.feedback_summaries_id_seq to service_role;

-- Retain legacy report access and apply the same membership rule as the hub
-- to new private reports, even on projects with older permissive policies.
create policy private_feedback_summaries_select on public.feedback_summaries
  for select to authenticated
  using (private_feedback_only);

create policy private_feedback_summaries_require_membership on public.feedback_summaries
  as restrictive for select to authenticated
  using (not private_feedback_only or merchant_id in (
    select p.merchant_id from public.profiles p
    join public.merchants m on m.id = p.merchant_id
    where p.id = (select auth.uid()) and p.role = 'client' and p.is_active
      and m.status in ('trial', 'active')
  ));

commit;
