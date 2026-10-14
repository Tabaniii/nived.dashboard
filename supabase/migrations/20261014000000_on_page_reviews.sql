-- Store every submitted review before optionally offering a Google review link.
-- Retain internal_feedbacks so existing merchant/admin reporting keeps working.
BEGIN;

ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.internal_feedbacks
  DROP CONSTRAINT IF EXISTS internal_feedbacks_rating_check;

ALTER TABLE public.internal_feedbacks
  ADD CONSTRAINT internal_feedbacks_rating_check CHECK (rating BETWEEN 1 AND 5);

COMMENT ON TABLE public.internal_feedbacks IS
  'Private submissions for all 1-5 star ratings; card_id links each review to cards.merchant_id.';
COMMENT ON TABLE public.tap_logs IS
  'Card page visits with timestamp and device metadata; card_id links each visit to cards.merchant_id.';

COMMIT;
