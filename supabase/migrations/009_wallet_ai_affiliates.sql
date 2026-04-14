-- ============================================================
-- CryptoLoveYou — High-Payout Wallet & AI App Affiliates
-- Migration: 009_wallet_ai_affiliates
--
-- PART A: Better wallet affiliates (higher payout than Ledger/Trezor)
-- PART B: AI app/tool affiliates with recurring commissions
-- PART C: custom_affiliates table for admin-added partners
--         (no code deploy needed — managed from Supabase/admin UI)
-- ============================================================


-- ============================================================
-- PART C FIRST: Add custom_affiliates table so the admin can
-- add any new partner without touching code or migrations again
-- ============================================================

CREATE TABLE IF NOT EXISTS custom_affiliates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_key    TEXT        NOT NULL UNIQUE,
  label           TEXT        NOT NULL,
  affiliate_url   TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'other',
    -- 'wallet' | 'exchange' | 'ai_tool' | 'tax' | 'education' | 'other'
  description     TEXT,
  logo_url        TEXT,
  cta_text        TEXT        DEFAULT 'Learn more →',
  commission_model TEXT,
    -- 'cpa' | 'revshare' | 'recurring' | 'hybrid'
  rate            TEXT,
  cookie_days     INTEGER,
  payment_method  TEXT,
  threshold       TEXT,
  notes           TEXT,
  active          BOOLEAN     NOT NULL DEFAULT false,
  priority        INTEGER     NOT NULL DEFAULT 10,
    -- lower = higher priority in display order
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_affiliates_active
  ON custom_affiliates (active, priority)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_custom_affiliates_category
  ON custom_affiliates (category)
  WHERE active = true;

ALTER TABLE custom_affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to custom_affiliates"
  ON custom_affiliates FOR ALL TO service_role USING (true);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_affiliates_updated_at ON custom_affiliates;
CREATE TRIGGER custom_affiliates_updated_at
  BEFORE UPDATE ON custom_affiliates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- PART A: Wallet Affiliates — Ranked by Payout
-- ============================================================
-- Payout comparison (all vs Ledger 10% / Trezor 12%):
--
-- Tangem         → 20-25% CPA per sale — BEST hardware wallet rate
-- SafePal        → 20% CPA per sale
-- Coldcard       → 15% CPA (niche but Bitcoin-maxi audience converts high)
-- Exodus         → 30% revenue share on swap fees — BEST software rate
-- Phantom        → No affiliate program (yet)
-- MetaMask       → No affiliate program
-- Trust Wallet   → No affiliate program (Binance-owned)
-- ============================================================

INSERT INTO custom_affiliates (
  platform_key, label, affiliate_url, category,
  description, cta_text,
  commission_model, rate, cookie_days,
  payment_method, threshold, notes,
  active, priority
) VALUES

(
  'tangem',
  'Tangem Wallet',
  'https://tangem.com/en/referral/',
  'wallet',
  'Card-form-factor hardware wallet. No seed phrase. NFC tap to transact. 6,000+ coins. The simplest hardware wallet experience.',
  'Get Tangem — Tap to Secure →',
  'cpa',
  '20–25% per sale (tiered: >$500/mo gets 25%)',
  30,
  'crypto',
  '$50',
  'Apply at tangem.com/en/referral/. Very high conversion rate — card form factor removes intimidation barrier. 3-card pack at $54 is a low price point that converts well. Top wallet affiliate program in 2026.',
  false,
  1
),

(
  'safepal',
  'SafePal',
  'https://www.safepal.com/en/affiliate',
  'wallet',
  'Air-gapped hardware wallet at $49. QR-code signing, no USB/Bluetooth. Backed by Binance Labs. Supports 30,000+ tokens.',
  'Get SafePal S1 Pro →',
  'cpa',
  '20% per sale',
  30,
  'crypto',
  '$20',
  'Apply at safepal.com/affiliate. Lower price point ($49) than Ledger means more volume. 20% on $49 = ~$10/sale. Good for audiences new to hardware wallets — budget-friendly angle converts well.',
  false,
  2
),

(
  'exodus',
  'Exodus Wallet',
  'https://www.exodus.com/referral/',
  'wallet',
  'Best-looking desktop + mobile wallet. 260+ assets, built-in exchange, staking. Revenue share on every swap your referrals make — forever.',
  'Download Exodus Free →',
  'revshare',
  '30% of swap fees (lifetime recurring per referral)',
  90,
  'crypto',
  '$10',
  'Apply at exodus.com/referral. The recurring model is the key advantage — every time a referred user swaps inside Exodus you earn 30%. Long cookie (90 days). Best long-term earnings of any software wallet affiliate.',
  false,
  3
),

(
  'coldcard',
  'Coldcard (Coinkite)',
  'https://coinkite.com/affiliates',
  'wallet',
  'The gold-standard Bitcoin-only hardware wallet. Air-gapped, open source, used by serious Bitcoiners. $149–$239.',
  'Buy Coldcard →',
  'cpa',
  '15% per sale',
  60,
  'crypto',
  '$50',
  'Apply at coinkite.com/affiliates. Lower rate than Tangem/SafePal but converts very high with Bitcoin-maxi and security-focused audiences. $149 price point means $22/sale at 15%. Niche but loyal audience.',
  false,
  4
),

(
  'ellipal',
  'Ellipal Titan',
  'https://www.ellipal.com/pages/affiliate-program',
  'wallet',
  'Air-gapped hardware wallet with large touchscreen. No USB, no Bluetooth, no WiFi. $99–$139.',
  'Get Ellipal Titan →',
  'cpa',
  '15% per sale',
  30,
  'crypto',
  '$50',
  'Apply at ellipal.com/pages/affiliate-program. 15% on $99–$139 = $15–$21/sale. Good alternative positioning to Ledger for privacy-conscious users who distrust Bluetooth.',
  false,
  5
),


-- ============================================================
-- PART B: AI App/Tool Affiliates — Ranked by Recurring Value
-- ============================================================
-- These are among the highest-paying affiliate programs in any
-- category. Recurring SaaS commissions compound fast.
--
-- Highest lifetime value programs for CryptoLoveYou audience:
-- 1. Koinly        → 30% recurring (tax software — perfect fit)
-- 2. NordVPN       → 40% recurring (crypto users care about VPN)
-- 3. CoinTracker   → 25% recurring (alt tax software)
-- 4. TradingView   → 30% recurring (chart tool every trader uses)
-- 5. 3Commas       → 30% recurring (AI trading bots)
-- 6. Pionex        → 30–40% rev share (AI trading bots, free)
-- 7. Bitsgap       → 30% recurring (AI grid/DCA bots)
-- 8. Coinstats     → 25% recurring (portfolio tracker)
-- 9. ZenLedger     → 30% recurring (tax software)
-- 10. Token Metrics → 30% recurring (AI crypto research)
-- ============================================================

(
  'koinly',
  'Koinly',
  'https://koinly.io/affiliates/',
  'tax',
  'Best crypto tax software. Auto-imports 300+ exchanges, generates IRS Form 8949, HMRC, ATO reports. Used by 400k+ crypto investors.',
  'Try Koinly Free — 20% Off →',
  'recurring',
  '30% lifetime recurring commission per referral',
  30,
  'paypal',
  '$50',
  'Best tax affiliate for CryptoLoveYou. Already in content. 30% recurring = if user pays $99/yr plan you earn $29.70/yr per referral forever. High intent — users searching crypto tax are ready to buy. Excellent fit for crypto-tax-guide-2026 page.',
  false,
  1
),

(
  'tradingview',
  'TradingView',
  'https://www.tradingview.com/gopro/',
  'ai_tool',
  'Industry-standard charting and market analysis platform. Used by 50M+ traders. Pro plans $14.95–$59.95/mo.',
  'Get TradingView Pro →',
  'recurring',
  '30% recurring for 12 months per referral',
  30,
  'paypal',
  '$10',
  'Apply at tradingview.com/affiliate/. Extremely high conversion — almost every active crypto trader already uses the free version. Upgrade CTAs convert well. 30% × $180/yr Pro = $54 per conversion. Massive volume potential.',
  false,
  2
),

(
  '3commas',
  '3Commas',
  'https://3commas.io/affiliate-program',
  'ai_tool',
  'AI-powered crypto trading bots. DCA bots, grid bots, smart trades. Integrates with 16+ exchanges. Plans $29–$99/mo.',
  'Try 3Commas Bots →',
  'recurring',
  '30% recurring commission',
  30,
  'crypto',
  '$50',
  'Apply at 3commas.io/affiliate-program. Trading bot software is high intent — users paying $29–99/mo are serious traders. 30% recurring = $8.70–$29.70/mo per active referral. High churn risk but strong monthly volume.',
  false,
  3
),

(
  'pionex',
  'Pionex',
  'https://www.pionex.com/en/sign-up?affiliate',
  'ai_tool',
  'AI trading bots built directly into a regulated exchange. 16 free bots including grid, DCA, and rebalancing. No subscription fee — earn on trading fees.',
  'Start Pionex Bots Free →',
  'revshare',
  '30–40% of trading fee revenue (lifetime)',
  30,
  'crypto',
  '$10',
  'Apply via Pionex partner program. Unique: bots are free so conversion is very easy (no payment barrier). Earn % of trading fees every time referred user runs a bot. Lifetime. Best for high-volume audiences — even small active traders generate ongoing rev share.',
  false,
  4
),

(
  'bitsgap',
  'Bitsgap',
  'https://bitsgap.com/referral',
  'ai_tool',
  'AI grid and DCA trading bots across 15+ exchanges. Unified portfolio view. Plans $23–$119/mo.',
  'Try Bitsgap Bots →',
  'recurring',
  '30% recurring for lifetime of subscription',
  30,
  'crypto',
  '$20',
  'Apply at bitsgap.com/referral. Competes with 3Commas. Good alternative to recommend for users who already tried 3Commas. Same 30% recurring rate.',
  false,
  5
),

(
  'token_metrics',
  'Token Metrics',
  'https://tokenmetrics.com/affiliate',
  'ai_tool',
  'AI-powered crypto research and investment intelligence. Price predictions, portfolio grading, market alerts. Plans $25–$125/mo.',
  'Try Token Metrics →',
  'recurring',
  '30% recurring commission',
  30,
  'paypal',
  '$50',
  'Apply at tokenmetrics.com/affiliate. AI + crypto research is perfect editorial fit for CryptoLoveYou. 30% × $25/mo entry plan = $7.50/mo per referral. Growing fast — early in the AI research tool category.',
  false,
  6
),

(
  'cointracker',
  'CoinTracker',
  'https://www.cointracker.io/affiliates',
  'tax',
  'Crypto tax software with TurboTax integration. Strong DeFi support. Free–$199/yr plans.',
  'Try CoinTracker →',
  'recurring',
  '25% recurring commission',
  30,
  'paypal',
  '$50',
  'Alternative to Koinly — promote both on the tax page to capture users who prefer TurboTax integration. 25% × $199/yr = $49.75 per conversion. Good volume if placed as #2 recommendation.',
  false,
  7
),

(
  'zenledger',
  'ZenLedger',
  'https://www.zenledger.io/affiliate',
  'tax',
  'Crypto tax software with CPA dashboard. 400+ exchange integrations. Plans free–$999/yr (high-volume traders pay top tier).',
  'Try ZenLedger →',
  'recurring',
  '30% recurring commission',
  30,
  'paypal',
  '$50',
  'High earner for high-net-worth crypto users who need CPA access. The $999/yr Pro plan pays $299.70 per conversion at 30%. Best positioned for the "active trader" and "DeFi power user" audience segments.',
  false,
  8
),

(
  'nordvpn',
  'NordVPN',
  'https://affiliate.nordvpn.com/',
  'other',
  'The most popular VPN. Essential for crypto users accessing exchanges from restricted regions. Plans $3–$15/mo.',
  'Get NordVPN — Stay Private →',
  'hybrid',
  '40% on new signups + 30% recurring on renewals',
  30,
  'paypal',
  '$10',
  'Apply at affiliate.nordvpn.com (runs on Impact). Crypto audiences are privacy-conscious — extremely high conversion. 40% on $99/yr 2-year plan = $39.60 per conversion. One of the highest-volume affiliate programs in tech. Non-crypto but perfect audience match.',
  false,
  9
),

(
  'coinstats',
  'CoinStats',
  'https://coinstats.app/affiliate',
  'ai_tool',
  'Crypto portfolio tracker with DeFi support, NFT tracking, and AI market insights. 1M+ users. Plans free–$15/mo.',
  'Track Portfolio on CoinStats →',
  'recurring',
  '25% recurring commission',
  30,
  'crypto',
  '$20',
  'Apply at coinstats.app/affiliate. Portfolio trackers are high-volume low-intent (free plan converts easily, paid plan converts for serious holders). 25% × $15/mo = $3.75/mo per paid referral. Volume game — embed in wallet and exchange content.',
  false,
  10
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
  threshold        = EXCLUDED.threshold,
  notes            = EXCLUDED.notes,
  updated_at       = NOW();


-- ============================================================
-- Summary view — easy to query from admin
-- ============================================================
CREATE OR REPLACE VIEW affiliate_overview AS
  SELECT
    platform_key,
    label,
    category,
    commission_model,
    rate,
    cookie_days,
    active,
    priority,
    LEFT(description, 80) AS description_preview,
    LEFT(notes, 100)       AS notes_preview,
    updated_at
  FROM custom_affiliates
  UNION ALL
  SELECT
    platform_key,
    label,
    'exchange_or_wallet'   AS category,
    commission_model,
    rate,
    NULL                   AS cookie_days,
    active,
    NULL                   AS priority,
    NULL                   AS description_preview,
    LEFT(notes, 100)       AS notes_preview,
    updated_at
  FROM affiliate_partners
  ORDER BY category, active DESC, priority;

-- Verify
SELECT platform_key, label, category, commission_model, rate, active
FROM custom_affiliates
ORDER BY category, priority;
