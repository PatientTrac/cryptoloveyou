-- Editable affiliate destination URLs (optional; env + registry remain fallbacks)
-- Migration: 005_affiliate_partners

CREATE TABLE IF NOT EXISTS affiliate_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_key TEXT NOT NULL UNIQUE,
  affiliate_url TEXT NOT NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_partners_active ON affiliate_partners (active) WHERE active = true;

ALTER TABLE affiliate_partners ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: only service_role (serverless) can access.
-- Admin UI uses Netlify Functions with SUPABASE_SERVICE_KEY.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'affiliate_partners' AND policyname = 'Service role has full access to affiliate_partners'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role has full access to affiliate_partners"
      ON affiliate_partners
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    $p$;
  END IF;
END $$;
