-- Phase 2 (static-only): Affiliate click tracking only
-- Migration: 004_affiliate_clicks_only
-- Created: 2026-03-26
-- Purpose: Create affiliate_clicks table without requiring ai_articles.

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optional attribution (works even if ai_articles is not used)
  article_id UUID,
  article_slug TEXT,

  -- Affiliate info
  affiliate_platform TEXT NOT NULL,
  affiliate_url TEXT,

  -- Tracking
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,

  -- Conversion tracking (to be updated by external systems)
  converted BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2),
  converted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_clicks_article_slug ON affiliate_clicks(article_slug);
CREATE INDEX IF NOT EXISTS idx_clicks_platform ON affiliate_clicks(affiliate_platform);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_converted ON affiliate_clicks(converted) WHERE converted = true;

ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'affiliate_clicks' AND policyname = 'Service role has full access to affiliate_clicks'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role has full access to affiliate_clicks"
      ON affiliate_clicks
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    $p$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'affiliate_clicks' AND policyname = 'Public can insert affiliate clicks'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Public can insert affiliate clicks"
      ON affiliate_clicks
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
    $p$;
  END IF;
END $$;

