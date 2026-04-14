-- ============================================================
-- QUICK ACTIVATE: Payset & Safelynx with live referral URL
-- Run this in Supabase SQL Editor to go live immediately.
-- Referral URL: https://signup.payset.io/sign-up?utm=Sl_vFlp
-- (single link covers both partners per agreement)
-- ============================================================

UPDATE custom_affiliates
SET
  affiliate_url = 'https://signup.payset.io/sign-up?utm=Sl_vFlp',
  active        = true,
  updated_at    = NOW()
WHERE platform_key IN ('payset', 'safelynx');

-- Confirm
SELECT platform_key, label, affiliate_url, active, updated_at
FROM custom_affiliates
WHERE platform_key IN ('payset', 'safelynx');
