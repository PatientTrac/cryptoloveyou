-- Phase 2: AI Articles System
-- Migration: 002_ai_articles_schema
-- Created: 2026-03-23
-- Purpose: Add tables for AI-generated content and affiliate tracking

-- ============================================================================
-- 1. AI ARTICLES TABLE
-- ============================================================================
-- Stores all AI-generated articles (NEW pages only, doesn't replace existing)
CREATE TABLE IF NOT EXISTS ai_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown format
  summary TEXT,

  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,

  -- Organization
  category TEXT, -- 'yield', 'exchange-review', 'wallet-review', 'defi', 'trending'
  tags TEXT[],

  -- Media
  featured_image_url TEXT,

  -- Data source (stored for reference)
  lunar_crush_data JSONB,

  -- Affiliate opportunities
  affiliate_links JSONB, -- [{text:"Get Started", url:"/aff/binance", platform:"binance"}]

  -- Publishing workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  scheduled_publish_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. AFFILIATE CLICKS TABLE
-- ============================================================================
-- Track all affiliate link clicks for revenue analytics
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference
  article_id UUID REFERENCES ai_articles(id) ON DELETE SET NULL,
  article_slug TEXT, -- Denormalized for easier queries

  -- Affiliate info
  affiliate_platform TEXT NOT NULL, -- 'binance', 'coinbase', 'ledger', etc.
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

-- ============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_articles_status ON ai_articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published ON ai_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_slug ON ai_articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON ai_articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_scheduled ON ai_articles(scheduled_publish_at) WHERE status = 'review';

CREATE INDEX IF NOT EXISTS idx_clicks_article ON affiliate_clicks(article_id);
CREATE INDEX IF NOT EXISTS idx_clicks_platform ON affiliate_clicks(affiliate_platform);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_converted ON affiliate_clicks(converted) WHERE converted = true;

-- ============================================================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_articles_updated_at
  BEFORE UPDATE ON ai_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Check if slug already exists (used by n8n to avoid duplicates)
CREATE OR REPLACE FUNCTION slug_exists(check_slug TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM ai_articles WHERE slug = check_slug);
END;
$$ LANGUAGE plpgsql;

-- Get article performance stats
CREATE OR REPLACE FUNCTION article_performance(article_slug TEXT)
RETURNS TABLE (
  total_clicks BIGINT,
  total_conversions BIGINT,
  conversion_rate DECIMAL,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_clicks,
    COUNT(*) FILTER (WHERE converted = true)::BIGINT as total_conversions,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE converted = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
      ELSE 0
    END as conversion_rate,
    COALESCE(SUM(conversion_value), 0) as total_revenue
  FROM affiliate_clicks
  WHERE affiliate_clicks.article_slug = article_slug;
END;
$$ LANGUAGE plpgsql;

-- Get top performing platforms
CREATE OR REPLACE FUNCTION top_affiliate_platforms(days INTEGER DEFAULT 30)
RETURNS TABLE (
  platform TEXT,
  click_count BIGINT,
  conversion_count BIGINT,
  conversion_rate DECIMAL,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    affiliate_platform as platform,
    COUNT(*)::BIGINT as click_count,
    COUNT(*) FILTER (WHERE converted = true)::BIGINT as conversion_count,
    CASE
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE converted = true)::DECIMAL / COUNT(*)::DECIMAL) * 100, 2)
      ELSE 0
    END as conversion_rate,
    COALESCE(SUM(conversion_value), 0) as total_revenue
  FROM affiliate_clicks
  WHERE clicked_at > NOW() - (days || ' days')::INTERVAL
  GROUP BY affiliate_platform
  ORDER BY total_revenue DESC, click_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on both tables
ALTER TABLE ai_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access to ai_articles"
  ON ai_articles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to affiliate_clicks"
  ON affiliate_clicks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Public can read published articles (for future API if needed)
CREATE POLICY "Public can read published articles"
  ON ai_articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Policy: Public can insert affiliate clicks (anonymous tracking)
CREATE POLICY "Public can insert affiliate clicks"
  ON affiliate_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================================
-- 7. SAMPLE DATA (for testing)
-- ============================================================================
-- Insert a sample article (optional - comment out for production)
/*
INSERT INTO ai_articles (
  slug,
  title,
  content,
  summary,
  meta_title,
  meta_description,
  focus_keyword,
  category,
  tags,
  featured_image_url,
  status,
  published_at
) VALUES (
  'test-article-sample',
  'Test Article: Best Crypto Yield Platforms 2026',
  '# Introduction\n\nThis is a sample article...\n\n## Section 1\n\nContent here...',
  'A comprehensive guide to crypto yield platforms.',
  'Best Crypto Yield Platforms 2026 | CryptoLoveYou',
  'Discover the top crypto yield platforms in 2026. Compare APYs, safety, and features.',
  'best crypto yield platforms',
  'yield',
  ARRAY['yield', 'defi', 'staking', 'crypto'],
  'https://via.placeholder.com/1200x630',
  'published',
  NOW()
);
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify tables created: SELECT * FROM ai_articles;
-- 3. Test helper functions: SELECT slug_exists('test-slug');
-- 4. Check RLS policies: SELECT * FROM pg_policies WHERE tablename = 'ai_articles';
