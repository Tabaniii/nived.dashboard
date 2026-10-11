-- ==============================================================================
-- Multi-tenant Auth + Dashboard + Admin
-- profiles, merchants, cards evolve, RLS (admin | client)
-- ==============================================================================

-- 1. Merchants
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    contact VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'trial'
        CHECK (status IN ('trial', 'active', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);

-- 2. Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'client')),
    full_name VARCHAR(255),
    merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_merchant_id ON profiles(merchant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Evolve cards
ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_cards_merchant_id ON cards(merchant_id);
CREATE INDEX IF NOT EXISTS idx_cards_deleted_at ON cards(deleted_at);

-- 4. Evolve internal_feedbacks
ALTER TABLE internal_feedbacks
    ADD COLUMN IF NOT EXISTS customer_whatsapp VARCHAR(30);

-- 5. Demo merchant + link existing seed cards
INSERT INTO merchants (id, business_name, owner_name, contact, status)
VALUES (
    'b11deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    'Kopi Senja Group',
    'Demo Owner',
    '6281111111111',
    'active'
)
ON CONFLICT (id) DO NOTHING;

UPDATE cards
SET merchant_id = 'b11deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
WHERE slug IN ('demo-card', 'direct-card')
  AND merchant_id IS NULL;

-- 6. Helpers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.client_merchant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.merchant_id FROM profiles p WHERE p.id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_merchant_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    LEFT JOIN merchants m ON m.id = p.merchant_id
    WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR (p.role = 'client' AND m.status IN ('trial', 'active'))
      )
  );
$$;

-- Auto-create profile from auth.users metadata when present
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

-- 7. Enable RLS on new tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 8. Drop overly-open policies from init migration
DROP POLICY IF EXISTS "Public read access for cards" ON cards;
DROP POLICY IF EXISTS "Public insert access for tap_logs" ON tap_logs;
DROP POLICY IF EXISTS "Public select access for tap_logs" ON tap_logs;
DROP POLICY IF EXISTS "Public update access for tap_logs" ON tap_logs;
DROP POLICY IF EXISTS "Public insert access for internal_feedbacks" ON internal_feedbacks;
DROP POLICY IF EXISTS "Public select access for internal_feedbacks" ON internal_feedbacks;

-- 9. Profiles policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_insert" ON profiles;
CREATE POLICY "profiles_admin_insert"
ON profiles FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_delete" ON profiles;
CREATE POLICY "profiles_admin_delete"
ON profiles FOR DELETE TO authenticated
USING (public.is_admin());

-- 10. Merchants policies
DROP POLICY IF EXISTS "merchants_select_own_or_admin" ON merchants;
CREATE POLICY "merchants_select_own_or_admin"
ON merchants FOR SELECT TO authenticated
USING (id = public.client_merchant_id() OR public.is_admin());

DROP POLICY IF EXISTS "merchants_admin_write" ON merchants;
CREATE POLICY "merchants_admin_all"
ON merchants FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 11. Cards policies
DROP POLICY IF EXISTS "cards_anon_read_active" ON cards;
CREATE POLICY "cards_anon_read_active"
ON cards FOR SELECT TO anon
USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "cards_auth_select" ON cards;
CREATE POLICY "cards_auth_select"
ON cards FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (merchant_id = public.client_merchant_id() AND deleted_at IS NULL)
);

DROP POLICY IF EXISTS "cards_client_update_settings" ON cards;
CREATE POLICY "cards_client_update_settings"
ON cards FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS "cards_admin_insert" ON cards;
CREATE POLICY "cards_admin_insert"
ON cards FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cards_admin_delete" ON cards;
CREATE POLICY "cards_admin_delete"
ON cards FOR DELETE TO authenticated
USING (public.is_admin());

-- 12. Tap logs — no broad anon SELECT; inserts for public NFC path via anon or service role
DROP POLICY IF EXISTS "tap_logs_anon_insert" ON tap_logs;
CREATE POLICY "tap_logs_anon_insert"
ON tap_logs FOR INSERT TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "tap_logs_anon_update" ON tap_logs;
CREATE POLICY "tap_logs_anon_update"
ON tap_logs FOR UPDATE TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "tap_logs_auth_select" ON tap_logs;
CREATE POLICY "tap_logs_auth_select"
ON tap_logs FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR card_id IN (
    SELECT c.id FROM cards c
    WHERE c.merchant_id = public.client_merchant_id()
  )
);

DROP POLICY IF EXISTS "tap_logs_admin_write" ON tap_logs;
CREATE POLICY "tap_logs_admin_write"
ON tap_logs FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 13. Internal feedbacks
DROP POLICY IF EXISTS "feedbacks_anon_insert" ON internal_feedbacks;
CREATE POLICY "feedbacks_anon_insert"
ON internal_feedbacks FOR INSERT TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "feedbacks_auth_select" ON internal_feedbacks;
CREATE POLICY "feedbacks_auth_select"
ON internal_feedbacks FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR card_id IN (
    SELECT c.id FROM cards c
    WHERE c.merchant_id = public.client_merchant_id()
  )
);

DROP POLICY IF EXISTS "feedbacks_admin_write" ON internal_feedbacks;
CREATE POLICY "feedbacks_admin_write"
ON internal_feedbacks FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 14. Realtime for live audit feed (admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tap_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tap_logs;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- publication may not exist outside Supabase
END $$;

-- 15. Clients may update settings fields only (not slug / shield / merchant)
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

DROP TRIGGER IF EXISTS trg_enforce_client_card_update ON cards;
CREATE TRIGGER trg_enforce_client_card_update
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_client_card_update();

COMMENT ON TABLE profiles IS 'Create the first admin via Supabase Auth (Dashboard or scripts/seed-admin.mjs) with user_metadata.role=admin';
