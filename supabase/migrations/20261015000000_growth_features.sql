-- ==============================================================================
-- Growth features: staff/table attribution, instant low-rating alerts,
-- smart card modes, and weekly feedback summaries.
-- Additive only: no existing data is modified or removed.
-- ==============================================================================
BEGIN;

-- 1. Staff / table attribution (?staff=andi&meja=12 on the card URL)
ALTER TABLE public.tap_logs
  ADD COLUMN IF NOT EXISTS staff_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS table_code VARCHAR(20);

ALTER TABLE public.internal_feedbacks
  ADD COLUMN IF NOT EXISTS staff_code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS table_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tap_logs_card_staff
  ON public.tap_logs(card_id, staff_code) WHERE staff_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_internal_feedbacks_card_staff
  ON public.internal_feedbacks(card_id, staff_code) WHERE staff_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_internal_feedbacks_created_at
  ON public.internal_feedbacks(created_at DESC);

-- 2. Instant low-rating alerts (WhatsApp via Fonnte + Telegram bot)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS alert_whatsapp VARCHAR(30),
  ADD COLUMN IF NOT EXISTS alert_telegram_chat_id VARCHAR(64);

COMMENT ON COLUMN public.cards.alert_whatsapp IS
  'WhatsApp number that receives 1-3 star alerts. Falls back to whatsapp_number when empty.';

-- 3. Smart mode switcher (same NFC link, different destination)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS card_mode VARCHAR(20) NOT NULL DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS mode_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promo_title VARCHAR(120),
  ADD COLUMN IF NOT EXISTS promo_message TEXT,
  ADD COLUMN IF NOT EXISTS promo_image_url TEXT,
  ADD COLUMN IF NOT EXISTS promo_cta_label VARCHAR(60),
  ADD COLUMN IF NOT EXISTS promo_url TEXT;

ALTER TABLE public.cards DROP CONSTRAINT IF EXISTS cards_card_mode_check;
ALTER TABLE public.cards
  ADD CONSTRAINT cards_card_mode_check CHECK (card_mode IN ('review', 'promo', 'redirect'));

COMMENT ON COLUMN public.cards.mode_until IS
  'When set, promo/redirect mode automatically falls back to review mode after this time.';

-- 4. Weekly feedback summaries (Gemini AI or keyword fallback)
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

CREATE INDEX IF NOT EXISTS idx_feedback_summaries_merchant
  ON public.feedback_summaries(merchant_id, created_at DESC);

ALTER TABLE public.feedback_summaries ENABLE ROW LEVEL SECURITY;

-- Owners read their own summaries; writes happen server-side with the service role.
DROP POLICY IF EXISTS "summaries_select_own_or_admin" ON public.feedback_summaries;
CREATE POLICY "summaries_select_own_or_admin"
ON public.feedback_summaries FOR SELECT TO authenticated
USING (public.is_admin() OR merchant_id = public.client_merchant_id());

COMMIT;
