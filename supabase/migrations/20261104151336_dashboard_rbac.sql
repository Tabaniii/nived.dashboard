begin;

do $$
begin
  create type public.app_role as enum ('superadmin', 'owner', 'staff');
exception when duplicate_object then null;
end;
$$;

-- Keep the POS role and merchant membership independent from dashboard access.
alter table public.profiles
  add column dashboard_role public.app_role not null default 'staff';
alter table public.merchants
  add column owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists owner_user_id uuid references auth.users(id) on delete restrict,
  add column if not exists name text,
  add column if not exists contact varchar(100),
  add column slug text,
  add column google_place_id text;

create unique index merchants_dashboard_owner_idx on public.merchants(owner_id);
create unique index merchants_slug_idx on public.merchants(slug);

update public.profiles set dashboard_role = 'superadmin' where role = 'admin';

-- A legacy owner assignment wins among eligible owners of the same merchant.
-- Without a legacy match, only a single unambiguous assignment is promoted.
with candidates as (
  select m.id as store_id,
    coalesce(
      (array_agg(p.id) filter (where p.id = m.owner_user_id))[1],
      case when count(*) = 1 then (array_agg(p.id))[1] end
    ) as owner_id
  from public.merchants m
  join public.profiles p on p.merchant_id = m.id
    and p.role in ('owner', 'client') and p.is_active
  group by m.id
)
update public.merchants m set owner_id = c.owner_id
from candidates c where c.store_id = m.id and c.owner_id is not null;

update public.profiles p set dashboard_role = 'owner'
where exists (select 1 from public.merchants m where m.owner_id = p.id);

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;

-- Policy helpers resolve only the caller's privileges. Keep these functions
-- outside the Data API schemas and use a fixed, empty search path.
create schema if not exists dashboard_access;
revoke all on schema dashboard_access from public, anon, authenticated;
grant usage on schema dashboard_access to authenticated;

create function dashboard_access.current_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.dashboard_role from public.profiles p
  where p.id = (select auth.uid()) and p.is_active;
$$;

create function dashboard_access.is_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select dashboard_access.current_role()) = 'superadmin', false);
$$;

create function dashboard_access.owned_store_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.id from public.merchants m
  where m.owner_id = (select auth.uid())
    and (select dashboard_access.current_role()) = 'owner'
    and m.status in ('trial', 'active');
$$;

revoke execute on all functions in schema dashboard_access from public, anon, authenticated;
grant execute on all functions in schema dashboard_access to authenticated;

-- Existing POS clients can still edit their safe profile fields. Dashboard
-- role changes and store assignments are limited to trusted provisioning.
revoke insert, update, delete on public.profiles, public.merchants from public, anon, authenticated;
revoke update (dashboard_role) on public.profiles from public, anon, authenticated;
revoke update (owner_id) on public.merchants from public, anon, authenticated;
grant select on public.profiles, public.merchants to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.merchants to service_role;

create policy dashboard_profiles_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select dashboard_access.is_superadmin()));

create policy dashboard_profiles_scope on public.profiles
  as restrictive for select to authenticated
  using (id = (select auth.uid()) or (select dashboard_access.is_superadmin()));

create policy dashboard_merchants_read on public.merchants
  for select to authenticated
  using ((select dashboard_access.is_superadmin()) or id = (select dashboard_access.owned_store_id()));

-- POS staff still use the existing merchant read policies for their assigned
-- location. For owners, the new ownership relationship is authoritative.
create policy dashboard_merchants_scope on public.merchants
  as restrictive for select to authenticated
  using (
    (
      (select dashboard_access.current_role()) = 'staff'
      and id = (select p.merchant_id from public.profiles p where p.id = (select auth.uid()))
    )
    or (select dashboard_access.is_superadmin())
    or id = (select dashboard_access.owned_store_id())
  );

drop policy if exists tabletop_cards_client_select on public.cards;
drop policy if exists tabletop_cards_client_update on public.cards;
drop policy if exists cards_auth_select on public.cards;
drop policy if exists cards_client_update_settings on public.cards;
drop policy if exists card_owner_read on public.cards;

create policy dashboard_cards_read on public.cards
  for select to authenticated
  using ((select dashboard_access.is_superadmin()) or merchant_id = (select dashboard_access.owned_store_id()));

create policy dashboard_cards_scope on public.cards
  as restrictive for select to authenticated
  using ((select dashboard_access.is_superadmin()) or merchant_id = (select dashboard_access.owned_store_id()));

create policy dashboard_cards_update on public.cards
  for update to authenticated
  using (deleted_at is null and (
    (select dashboard_access.is_superadmin()) or merchant_id = (select dashboard_access.owned_store_id())
  ))
  with check (deleted_at is null and (
    (select dashboard_access.is_superadmin()) or merchant_id = (select dashboard_access.owned_store_id())
  ));

-- Column grants replace the legacy trigger's protection and let service-role
-- provisioning update card lifecycle fields. The tap route uses a server key.
drop trigger if exists trg_enforce_client_card_update on public.cards;
revoke select on public.cards from public, anon;
revoke insert, delete on public.cards from public, anon, authenticated;
revoke update (slug, merchant_id, is_active, is_shield_active, deleted_at)
  on public.cards from public, anon, authenticated;

-- The historical analytics tables reference cards. Restrict their existing
-- policies too, so legacy admin/client rules cannot bypass the dashboard scope.
grant select on public.tap_logs, public.internal_feedbacks to authenticated;
revoke insert, update, delete on public.tap_logs, public.internal_feedbacks from authenticated;

create policy dashboard_taps_read on public.tap_logs
  for select to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id));

create policy dashboard_taps_scope on public.tap_logs
  as restrictive for select to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id and (
    (select dashboard_access.is_superadmin()) or c.merchant_id = (select dashboard_access.owned_store_id())
  )));

create policy dashboard_legacy_feedback_read on public.internal_feedbacks
  for select to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id));

create policy dashboard_legacy_feedback_scope on public.internal_feedbacks
  as restrictive for select to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id and (
    (select dashboard_access.is_superadmin()) or c.merchant_id = (select dashboard_access.owned_store_id())
  )));

drop policy if exists private_feedback_summaries_select on public.feedback_summaries;
drop policy if exists private_feedback_summaries_require_membership on public.feedback_summaries;

create policy dashboard_summaries_read on public.feedback_summaries
  for select to authenticated
  using ((select dashboard_access.is_superadmin()) or merchant_id = (select dashboard_access.owned_store_id()));

create policy dashboard_summaries_scope on public.feedback_summaries
  as restrictive for select to authenticated
  using ((select dashboard_access.is_superadmin()) or merchant_id = (select dashboard_access.owned_store_id()));

drop policy if exists customer_feedback_owner_select on public.customer_feedback;
drop policy if exists customer_feedback_owner_resolve on public.customer_feedback;
drop policy if exists "Merchants can view their own store feedback" on public.customer_feedback;
drop policy if exists "Merchants can update resolved status of their store feedback" on public.customer_feedback;

create policy dashboard_feedback_read on public.customer_feedback
  for select to authenticated
  using ((select dashboard_access.is_superadmin()) or store_id = (select dashboard_access.owned_store_id()));

create policy dashboard_feedback_resolve on public.customer_feedback
  for update to authenticated
  using ((select dashboard_access.is_superadmin()) or store_id = (select dashboard_access.owned_store_id()))
  with check ((select dashboard_access.is_superadmin()) or store_id = (select dashboard_access.owned_store_id()));

drop policy if exists review_click_events_owner_select on public.review_click_events;
drop policy if exists "Merchants can view their own click events" on public.review_click_events;

create policy dashboard_clicks_read on public.review_click_events
  for select to authenticated
  using ((select dashboard_access.is_superadmin()) or store_id = (select dashboard_access.owned_store_id()));

commit;
