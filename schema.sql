-- ==============================================================================
-- Schema Migration: NFC Public Web (filter-rating)
-- Tables: cards, tap_logs, internal_feedbacks
-- ==============================================================================

-- 1. Cards Table (Stores physical card identity and configuration)
CREATE TABLE IF NOT EXISTS cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    -- Destination field: Google Business Profile direct review intent URL
    -- Examples: https://g.page/r/XXXXX/review or https://search.google.com/local/writereview?placeid=XXXXX
    google_review_url TEXT NOT NULL,
    whatsapp_number VARCHAR(30),
    is_shield_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON COLUMN cards.google_review_url IS 'Provide your Google Business Profile direct review intent URL so customers see the rating modal immediately upon opening.';

CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug);

-- 2. Tap Logs Table (Stores analytics data for every physical tap/scan)
CREATE TABLE IF NOT EXISTS tap_logs (
    id BIGSERIAL PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    device_os VARCHAR(30) NOT NULL, -- 'iOS', 'Android', 'Other'
    user_agent TEXT NOT NULL,
    selected_stars INT CHECK (selected_stars BETWEEN 1 AND 5),
    ip_hash VARCHAR(64),           -- Anonymized IP hash for debouncing
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_tap_logs_card_id ON tap_logs(card_id);
CREATE INDEX IF NOT EXISTS idx_tap_logs_created_at ON tap_logs(created_at DESC);

-- 3. Internal Feedbacks Table (Stores all submitted 1-5 star reviews privately)
CREATE TABLE IF NOT EXISTS internal_feedbacks (
    id BIGSERIAL PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    customer_whatsapp VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_internal_feedbacks_card_id ON internal_feedbacks(card_id);

-- 4. Sample Seed Data for Local Verification & Demo
INSERT INTO cards (id, slug, store_name, google_review_url, whatsapp_number, is_shield_active)
VALUES
    ('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d', 'demo-card', 'Kopi Senja Utama', 'https://maps.app.goo.gl/demo-review', '6281234567890', true),
    ('a23deb4d-4b7d-4bad-9bdd-2b0d7b3dcb6e', 'direct-card', 'Warung Langsung Direct', 'https://maps.app.goo.gl/direct-review', '6289876543210', false)
ON CONFLICT (slug) DO NOTHING;
