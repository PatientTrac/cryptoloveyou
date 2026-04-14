-- ============================================================
-- CryptoLoveYou — Affiliate Partners Seed
-- Run in Supabase SQL Editor (or via migration)
-- Populates all 7 platforms with their affiliate program
-- application URLs. Replace placeholder affiliate_url values
-- with your actual referral links once approved.
-- ============================================================

INSERT INTO affiliate_partners (
  platform_key,
  affiliate_url,
  label,
  active,
  commission_model,
  rate,
  payment_method,
  threshold,
  payment_contact,
  notes
) VALUES

-- EXCHANGES ---------------------------------------------------

(
  'binance',
  'https://www.binance.com/en/activity/referral-entry/CPA',
  'Binance',
  false,
  'revshare',
  'Up to 50% trading fee commission',
  'crypto',
  '$10',
  'affiliates@binance.com',
  'APPLICATION PENDING — Apply at https://www.binance.com/en/activity/referral-entry/CPA. Replace affiliate_url with your referral link once approved.'
),

(
  'coinbase',
  'https://www.coinbase.com/partners',
  'Coinbase',
  false,
  'cpa',
  '$10 per verified signup (varies by region)',
  'bank',
  '$50',
  'partnerships@coinbase.com',
  'APPLICATION PENDING — Apply at https://www.coinbase.com/partners. Coinbase One regions pay higher CPA. Replace affiliate_url once approved.'
),

(
  'bybit',
  'https://partner.bybit.com/',
  'Bybit',
  false,
  'revshare',
  '30% trading fee commission',
  'crypto',
  '$10',
  'partner@bybit.com',
  'APPLICATION PENDING — Apply at https://partner.bybit.com/. High-volume sites can negotiate tiered rates. Replace affiliate_url once approved.'
),

(
  'okx',
  'https://www.okx.com/affiliate',
  'OKX',
  false,
  'revshare',
  'Up to 60% commission (tiered by volume)',
  'crypto',
  '$10',
  'affiliate@okx.com',
  'APPLICATION PENDING — Apply at https://www.okx.com/affiliate. One of the highest revshare rates. Replace affiliate_url once approved.'
),

(
  'kraken',
  'https://www.kraken.com/affiliate',
  'Kraken',
  false,
  'revshare',
  '20% trading fee commission',
  'crypto',
  '$50',
  'affiliate@kraken.com',
  'APPLICATION PENDING — Apply at https://www.kraken.com/affiliate. Strong for US/EU audiences. Replace affiliate_url once approved.'
),

-- WALLETS -----------------------------------------------------

(
  'ledger',
  'https://affiliate.ledger.com/',
  'Ledger',
  false,
  'cpa',
  '10% of referred sales (cookie: 30 days)',
  'bank',
  '$100',
  'affiliates@ledger.com',
  'APPLICATION PENDING — Apply at https://affiliate.ledger.com/ (runs on Impact). Hardware wallet — evergreen content asset. Replace affiliate_url once approved.'
),

(
  'trezor',
  'https://trezor.io/resellers',
  'Trezor',
  false,
  'cpa',
  '12–15% of referred sales',
  'bank',
  '$100',
  'partners@trezor.io',
  'APPLICATION PENDING — Apply at https://trezor.io/resellers. Runs on affiliate network. Replace affiliate_url once approved.'
)

ON CONFLICT (platform_key) DO UPDATE SET
  label           = EXCLUDED.label,
  commission_model= EXCLUDED.commission_model,
  rate            = EXCLUDED.rate,
  payment_method  = EXCLUDED.payment_method,
  threshold       = EXCLUDED.threshold,
  payment_contact = EXCLUDED.payment_contact,
  notes           = EXCLUDED.notes,
  updated_at      = NOW();

-- Verify insert
SELECT
  platform_key,
  label,
  active,
  commission_model,
  rate,
  LEFT(notes, 60) AS notes_preview
FROM affiliate_partners
ORDER BY
  CASE
    WHEN platform_key IN ('binance','coinbase','bybit','okx','kraken') THEN 1
    ELSE 2
  END,
  platform_key;
