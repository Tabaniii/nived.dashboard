-- ==============================================================================
-- NIVED REPUTATION SHIELD & DASHBOARD - FULL CONSOLIDATED SCHEMA
-- Digunakan untuk proyek Supabase baru yang masih kosong.
-- Menggabungkan seluruh tabel, fungsi RLS, trigger, dan seed demo.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABEL UTAMA (TENANCY & DATA)
-- ==============================================================================

-- 2.1 Merchants (Penyewa / Pemilik Usaha)
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'trial'
        CHECK (status IN ('trial', 'active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);

-- 2.2 Profiles (Ekstensi profil dari auth.users Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client')),
    full_name VARCHAR(255),
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_merchant_id ON public.profiles(merchant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2.3 Cards (Kartu NFC / QR Meja Fisik)
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    google_review_url TEXT NOT NULL,
    whatsapp_number VARCHAR(30),
    is_shield_active BOOLEAN NOT NULL DEFAULT true,
    card_mode VARCHAR(20) NOT NULL DEFAULT 'review' CHECK (card_mode IN ('review', 'promo', 'redirect')),
    mode_until TIMESTAMPTZ,
    promo_title VARCHAR(120),
    promo_message TEXT,
    promo_image_url TEXT,
    promo_cta_label VARCHAR(60),
    promo_url TEXT,
    alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    alert_whatsapp VARCHAR(30),
    alert_telegram_chat_id VARCHAR(64),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cards_slug ON public.cards(slug);
CREATE INDEX IF NOT EXISTS idx_cards_merchant_id ON public.cards(merchant_id);
CREATE INDEX IF NOT EXISTS idx_cards_deleted_at ON public.cards(deleted_at);

-- 2.4 Tap Logs (Log setiap tap NFC / scan QR oleh pelanggan)
CREATE TABLE IF NOT EXISTS public.tap_logs (
    id BIGSERIAL PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    staff_code VARCHAR(40),
    table_code VARCHAR(20),
    device_os VARCHAR(30) NOT NULL, -- 'iOS', 'Android', 'Other'
    user_agent TEXT NOT NULL,
    selected_stars INT CHECK (selected_stars BETWEEN 1 AND 5),
    ip_hash VARCHAR(64),           -- Anonymized IP hash untuk debounce
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tap_logs_card_id ON public.tap_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_tap_logs_created_at ON public.tap_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tap_logs_card_staff ON public.tap_logs(card_id, staff_code) WHERE staff_code IS NOT NULL;

-- 2.5 Internal Feedbacks (Ulasan / masukan komplain dari pelanggan)
CREATE TABLE IF NOT EXISTS public.internal_feedbacks (
    id BIGSERIAL PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    staff_code VARCHAR(40),
    table_code VARCHAR(20),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    customer_whatsapp VARCHAR(30),
    alert_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_internal_feedbacks_card_id ON public.internal_feedbacks(card_id);
CREATE INDEX IF NOT EXISTS idx_internal_feedbacks_created_at ON public.internal_feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_internal_feedbacks_card_staff ON public.internal_feedbacks(card_id, staff_code) WHERE staff_code IS NOT NULL;

-- 2.6 Feedback Summaries (Ringkasan AI mingguan / fallback rules)
CREATE TABLE IF NOT EXISTS public.feedback_summaries (
    id BIGSERIAL PRIMARY KEY,
    merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    feedback_count INT NOT NULL DEFAULT 0,
    complaint_count INT NOT NULL DEFAULT 0,
    avg_rating NUMERIC(3,2),
    summary TEXT NOT NULL,
    themes JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    source VARCHAR(10) NOT NULL DEFAULT 'rules' CHECK (source IN ('ai', 'rules')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_feedback_summaries_merchant ON public.feedback_summaries(merchant_id, created_at DESC);

-- ==============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS (AUTH & KEAMANAN)
-- ==============================================================================

-- 3.1 Cek apakah user adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

-- 3.2 Ambil merchant_id dari profile user yang sedang login
CREATE OR REPLACE FUNCTION public.client_merchant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.merchant_id FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1;
$$;

-- 3.3 Cek apakah merchant aktif
CREATE OR REPLACE FUNCTION public.is_merchant_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.merchants m ON m.id = p.merchant_id
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR (p.role = 'client' AND m.status IN ('trial', 'active'))
      )
  );
$$;

-- 3.4 Auto-create profile saat user mendaftar di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name, merchant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(NEW.raw_user_meta_data->>'merchant_id', '')::uuid
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, profiles.role),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    merchant_id = COALESCE(EXCLUDED.merchant_id, profiles.merchant_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.5 Batasi client agar tidak bisa mengubah field kritis pada kartu (slug, shield, merchant)
CREATE OR REPLACE FUNCTION public.enforce_client_card_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.is_shield_active IS DISTINCT FROM OLD.is_shield_active
     OR NEW.merchant_id IS DISTINCT FROM OLD.merchant_id
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Clients cannot modify slug, shield mode, merchant, or deletion state';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_client_card_update ON public.cards;
CREATE TRIGGER trg_enforce_client_card_update
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_client_card_update();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tap_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_summaries ENABLE ROW LEVEL SECURITY;

-- 4.1 Profiles Policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
CREATE POLICY "profiles_admin_insert"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;
CREATE POLICY "profiles_admin_delete"
ON public.profiles FOR DELETE TO authenticated
USING (public.is_admin());

-- 4.2 Merchants Policies
DROP POLICY IF EXISTS "merchants_select_own_or_admin" ON public.merchants;
CREATE POLICY "merchants_select_own_or_admin"
ON public.merchants FOR SELECT TO authenticated
USING (id = public.client_merchant_id() OR public.is_admin());

DROP POLICY IF EXISTS "merchants_admin_all" ON public.merchants;
CREATE POLICY "merchants_admin_all"
ON public.merchants FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4.3 Cards Policies
DROP POLICY IF EXISTS "cards_anon_read_active" ON public.cards;
CREATE POLICY "cards_anon_read_active"
ON public.cards FOR SELECT TO anon
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "cards_auth_select" ON public.cards;
CREATE POLICY "cards_auth_select"
ON public.cards FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (merchant_id = public.client_merchant_id() AND deleted_at IS NULL)
);

DROP POLICY IF EXISTS "cards_client_update_settings" ON public.cards;
CREATE POLICY "cards_client_update_settings"
ON public.cards FOR UPDATE TO authenticated
USING (
  public.is_admin()
  OR (
    merchant_id = public.client_merchant_id()
    AND public.is_merchant_active()
    AND deleted_at IS NULL
  )
)
WITH CHECK (
  public.is_admin()
  OR (
    merchant_id = public.client_merchant_id()
    AND public.is_merchant_active()
    AND deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "cards_admin_insert" ON public.cards;
CREATE POLICY "cards_admin_insert"
ON public.cards FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cards_admin_delete" ON public.cards;
CREATE POLICY "cards_admin_delete"
ON public.cards FOR DELETE TO authenticated
USING (public.is_admin());

-- 4.4 Tap Logs Policies
DROP POLICY IF EXISTS "tap_logs_anon_insert" ON public.tap_logs;
CREATE POLICY "tap_logs_anon_insert"
ON public.tap_logs FOR INSERT TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "tap_logs_anon_update" ON public.tap_logs;
CREATE POLICY "tap_logs_anon_update"
ON public.tap_logs FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "tap_logs_auth_select" ON public.tap_logs;
CREATE POLICY "tap_logs_auth_select"
ON public.tap_logs FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR card_id IN (
    SELECT c.id FROM public.cards c
    WHERE c.merchant_id = public.client_merchant_id()
  )
);

DROP POLICY IF EXISTS "tap_logs_admin_write" ON public.tap_logs;
CREATE POLICY "tap_logs_admin_write"
ON public.tap_logs FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4.5 Internal Feedbacks Policies
DROP POLICY IF EXISTS "feedbacks_anon_insert" ON public.internal_feedbacks;
CREATE POLICY "feedbacks_anon_insert"
ON public.internal_feedbacks FOR INSERT TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "feedbacks_auth_select" ON public.internal_feedbacks;
CREATE POLICY "feedbacks_auth_select"
ON public.internal_feedbacks FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR card_id IN (
    SELECT c.id FROM public.cards c
    WHERE c.merchant_id = public.client_merchant_id()
  )
);

DROP POLICY IF EXISTS "feedbacks_admin_write" ON public.internal_feedbacks;
CREATE POLICY "feedbacks_admin_write"
ON public.internal_feedbacks FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4.6 Feedback Summaries Policies
DROP POLICY IF EXISTS "summaries_select_own_or_admin" ON public.feedback_summaries;
CREATE POLICY "summaries_select_own_or_admin"
ON public.feedback_summaries FOR SELECT TO authenticated
USING (public.is_admin() OR merchant_id = public.client_merchant_id());

-- ==============================================================================
-- 5. REALTIME PUBLICATION
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tap_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tap_logs;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Publication mungkin belum ada jika di luar Supabase cloud
END $$;

-- ==============================================================================
-- 6. SEED DATA AWAL (DEMO MERCHANT & KARTU)
-- ==============================================================================

-- 6.1 Demo Merchant
INSERT INTO public.merchants (id, business_name, owner_name, contact, status)
VALUES (
    'b11deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    'Kopi Senja Group',
    'Demo Owner',
    '6281111111111',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- 6.2 Demo Cards
INSERT INTO public.cards (id, merchant_id, slug, store_name, google_review_url, whatsapp_number, is_shield_active, card_mode)
VALUES
    (
        '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        'b11deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        'demo-card',
        'Kopi Senja Utama',
        'https://maps.app.goo.gl/demo-review',
        '6281234567890',
        true,
        'review'
    ),
    (
        'a23deb4d-4b7d-4bad-9bdd-2b0d7b3dcb6e',
        'b11deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        'direct-card',
        'Warung Langsung Direct',
        'https://maps.app.goo.gl/direct-review',
        '6289876543210',
        false,
        'review'
    )
ON CONFLICT (slug) DO UPDATE
SET
    merchant_id = EXCLUDED.merchant_id,
    store_name = EXCLUDED.store_name,
    google_review_url = EXCLUDED.google_review_url,
    whatsapp_number = EXCLUDED.whatsapp_number,
    is_shield_active = EXCLUDED.is_shield_active;

-- Reputation & Feedback Hub
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
grant select, insert on public.review_click_events to service_role;

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

-- Dashboard RBAC
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
