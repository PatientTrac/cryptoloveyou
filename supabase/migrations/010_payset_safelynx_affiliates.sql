-- ============================================================
-- CryptoLoveYou — Partner Affiliates: Payset & Safelynx
-- Migration: 010_payset_safelynx_affiliates
--
-- NEGOTIATED TERMS (different from public rates):
--   Payset   — monthly account fee WAIVED (normally charged)
--              for clients referred via CryptoLoveYou link
--   Safelynx — crypto transaction fee starts at 0.75%
--              (normally 1% for the €0–€100k tier)
--
-- Both use custom_affiliates table (created in migration 009).
-- Set active = true and replace affiliate_url with your real
-- referral link once Payset/Safelynx send you the partner URLs.
-- ============================================================

INSERT INTO custom_affiliates (
  platform_key,
  label,
  affiliate_url,
  category,
  description,
  logo_url,
  cta_text,
  commission_model,
  rate,
  cookie_days,
  payment_method,
  threshold,
  notes,
  active,
  priority
) VALUES

-- ── PAYSET ──────────────────────────────────────────────────
(
  'payset',
  'Payset',
  'https://signup.payset.io/sign-up?utm=Sl_vFlp',
  'fintech',

  'FCA-regulated multi-currency IBAN accounts (UK, EU, US). '
  'Supports SWIFT, SEPA, CHAPS, Fedwire, Krono. Send/receive '
  'in 34 currencies across 180+ countries. Onboarding within '
  '48 hours. Crypto-friendly via regulated partner. '
  'Eligible jurisdictions: EEA, UK, UAE, Singapore, Hong Kong, '
  'Israel, Australia, Canada, Ukraine, Marshall Islands, '
  'Cayman Islands, BVI, Belize, Seychelles, South Africa.',

  'https://payset.io/favicon.ico',
  'Open a Payset Account — Monthly Fee Waived →',

  'cpa',

  -- NEGOTIATED: Monthly account fee FREE for CryptoLoveYou referrals
  -- (standard clients pay a monthly fee based on risk profile).
  -- Commission structure TBC with Payset — contact sales@payset.io
  -- or +44 (0)748 205 9285 to confirm rev-share/CPA terms for partner.
  'Monthly fee WAIVED for referred clients (negotiated). '
  'Commission TBC — confirm CPA/revshare with Payset on call.',

  60,   -- 60-day cookie (confirm with Payset)
  'bank',
  NULL,

  'LIVE PARTNER: Clients referred via CryptoLoveYou '
  'receive monthly account fee FREE (standard rate normally applies). '
  'Pricing otherwise based on client risk profile per Payset policy. '
  'FCA-registered EMI (Electronic Money Institution). '
  'Crypto services via regulated Payset partner — NOT available for US clients. '
  'Contact: sales@payset.io | +44 (0)748 205 9285. '
  'Referral URL: https://signup.payset.io/sign-up?utm=Sl_vFlp. '
  'Commission structure: confirm rev-share % with Payset. '
  'Best content placement: crypto-tax-guide (IBAN for international filers), '
  'best-crypto-exchanges (banking alternative), make-money guide.',

  true,   -- LIVE: referral URL confirmed
  1
),

-- ── SAFELYNX ────────────────────────────────────────────────
(
  'safelynx',
  'Safelynx',
  'https://signup.payset.io/sign-up?utm=Sl_vFlp',
  'exchange',

  'Danish FSA-registered crypto OTC broker (FTID 17514). '
  'Buy and sell top cryptocurrencies with transparent flat fees. '
  'Regulated VASP (Virtual Asset Service Provider). '
  'Transfer via SWIFT (€35) and SEPA (€18). '
  'Support Mon–Fri 10:00–18:00 CEST.',

  'https://safelynx.io/favicon.ico',
  'Buy Crypto via Safelynx — Lower Fees →',

  'revshare',

  -- NEGOTIATED: CryptoLoveYou referrals start at 0.75% transaction fee
  -- instead of the public 1% rate for the €0–€100,000 tier.
  -- Full public fee schedule:
  --   €0–€100,000      → 1.00%  (referred clients pay 0.75%)
  --   €100,001–€500k   → 0.75%
  --   €500,001–€1M     → 0.50%
  --   €1,000,001+      → 0.43%
  -- Affiliate commission rate (% of transaction fees earned) TBC with Safelynx.
  'Referred clients: 0.75% flat fee (normally 1% for €0–€100k tier). '
  'Affiliate rev-share % on transaction fees TBC.',

  30,
  'bank',
  NULL,

  'LIVE PARTNER: CryptoLoveYou referrals get preferential '
  '0.75% transaction rate instead of standard 1% for the entry tier. '
  'Significant saving for clients trading €50k–€100k (saves up to €250/trade). '
  'FSA-registered VASP: SafeLynx Technologies ApS, Kålundsvej 18, 3520 Farum, Denmark. '
  'Contact: support@safelynx.io | +45 52 519902 | Telegram: @SafeLynx_OTC_Irina. '
  'Referral URL: https://signup.payset.io/sign-up?utm=Sl_vFlp (shared link). '
  'Confirm individual Safelynx rev-share % with support@safelynx.io. '
  'Best content placement: best-crypto-exchanges page (OTC angle for larger buyers), '
  'how-to-buy-crypto (European regulated option), make-money guide (OTC exit ramp).',

  true,   -- LIVE: referral URL confirmed
  2
)

ON CONFLICT (platform_key) DO UPDATE SET
  label            = EXCLUDED.label,
  affiliate_url    = EXCLUDED.affiliate_url,
  category         = EXCLUDED.category,
  description      = EXCLUDED.description,
  cta_text         = EXCLUDED.cta_text,
  commission_model = EXCLUDED.commission_model,
  rate             = EXCLUDED.rate,
  cookie_days      = EXCLUDED.cookie_days,
  payment_method   = EXCLUDED.payment_method,
  notes            = EXCLUDED.notes,
  updated_at       = NOW();

-- Verify
SELECT
  platform_key,
  label,
  category,
  commission_model,
  rate,
  active,
  LEFT(notes, 120) AS notes_preview
FROM custom_affiliates
WHERE platform_key IN ('payset', 'safelynx');
