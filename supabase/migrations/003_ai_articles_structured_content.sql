-- Phase 2: Structured content + content types
-- Migration: 003_ai_articles_structured_content
-- Created: 2026-03-26
-- Purpose: Extend ai_articles for money/review/seo structured JSON rendering.

-- ============================================================================
-- 1. EXTEND AI ARTICLES TABLE
-- ============================================================================

ALTER TABLE ai_articles
  ADD COLUMN IF NOT EXISTS content_type TEXT,
  ADD COLUMN IF NOT EXISTS sections JSONB,
  ADD COLUMN IF NOT EXISTS comparison_table JSONB,
  ADD COLUMN IF NOT EXISTS faqs JSONB,
  ADD COLUMN IF NOT EXISTS ctas JSONB,
  ADD COLUMN IF NOT EXISTS internal_links JSONB,
  ADD COLUMN IF NOT EXISTS topic_key TEXT,
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_interval_days INTEGER;

-- Backfill defaults where possible
UPDATE ai_articles
SET content_type = COALESCE(content_type, 'seo_article')
WHERE content_type IS NULL;

UPDATE ai_articles
SET last_updated_at = COALESCE(last_updated_at, updated_at, created_at, NOW())
WHERE last_updated_at IS NULL;

-- ============================================================================
-- 2. STATUS LIFECYCLE UPDATE
-- ============================================================================
-- Previous 002 used: ('draft','review','published','archived')
-- New lifecycle (plan): draft → pending_review → approved → published (+ rejected) (+ archived)

DO $$
BEGIN
  -- Replace old CHECK constraint if it exists (name may vary)
  -- This block safely drops any CHECK constraint referencing status on ai_articles.
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'ai_articles'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE ai_articles DROP CONSTRAINT ' || quote_ident(c.conname) || ';'
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'ai_articles'
        AND c.contype = 'c'
        AND pg_get_constraintdef(c.oid) ILIKE '%status%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE ai_articles
  ADD CONSTRAINT ai_articles_status_check
  CHECK (status IN ('draft', 'pending_review', 'approved', 'published', 'rejected', 'archived'));

-- Map legacy status values, if present
UPDATE ai_articles
SET status = 'pending_review'
WHERE status = 'review';

-- ============================================================================
-- 3. CONTENT TYPE CHECK
-- ============================================================================

ALTER TABLE ai_articles
  ADD CONSTRAINT ai_articles_content_type_check
  CHECK (content_type IN ('seo_article', 'review_page', 'money_page'));

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_articles_content_type ON ai_articles(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_articles_topic_key ON ai_articles(topic_key);
CREATE INDEX IF NOT EXISTS idx_ai_articles_last_updated_at ON ai_articles(last_updated_at DESC);

-- Optional: enforce topic_key uniqueness if you decide to use it for dedupe
-- (Keep this commented if you want duplicates during early experimentation.)
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_articles_topic_key ON ai_articles(topic_key) WHERE topic_key IS NOT NULL;

-- ============================================================================
-- 5. OPTIONAL: AFFILIATE REGISTRY TABLE
-- ============================================================================
-- Repo-file registry (`data/affiliate-registry.json`) is the primary runtime source today.
-- This table is optional but enables “edit without redeploy” later.

CREATE TABLE IF NOT EXISTS affiliate_registry (
  key TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  tags TEXT[],
  priority INTEGER DEFAULT 0,
  env_key TEXT,
  default_cta TEXT,
  risk_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_registry_category ON affiliate_registry(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_registry_priority ON affiliate_registry(priority DESC);

-- Enable RLS (service role manages; optional public read)
ALTER TABLE affiliate_registry ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'affiliate_registry' AND policyname = 'Service role has full access to affiliate_registry'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role has full access to affiliate_registry"
      ON affiliate_registry
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    $p$;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

