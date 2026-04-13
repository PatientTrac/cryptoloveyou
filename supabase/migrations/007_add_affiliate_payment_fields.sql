-- Add payment and commission tracking fields to affiliate_partners
-- Migration: 007_add_affiliate_payment_fields

ALTER TABLE affiliate_partners
  ADD COLUMN IF NOT EXISTS commission_model TEXT,
  ADD COLUMN IF NOT EXISTS rate TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS threshold TEXT,
  ADD COLUMN IF NOT EXISTS payment_contact TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for commission model for filtering
CREATE INDEX IF NOT EXISTS idx_affiliate_partners_commission_model
  ON affiliate_partners (commission_model)
  WHERE commission_model IS NOT NULL;

COMMENT ON COLUMN affiliate_partners.commission_model IS 'Type: cpa, revshare, hybrid, etc.';
COMMENT ON COLUMN affiliate_partners.rate IS 'Commission rate/terms (e.g., "30% rev share", "$20 per signup")';
COMMENT ON COLUMN affiliate_partners.payment_method IS 'How they pay: crypto, paypal, bank, etc.';
COMMENT ON COLUMN affiliate_partners.threshold IS 'Minimum payout threshold (e.g., "$100")';
COMMENT ON COLUMN affiliate_partners.payment_contact IS 'Email/contact for payments';
COMMENT ON COLUMN affiliate_partners.contact_name IS 'Name of affiliate contact person';
COMMENT ON COLUMN affiliate_partners.notes IS 'Internal notes about this affiliate partnership';
