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
