-- Simple Admin Authentication System
-- Migration: 006_simple_admin_auth
-- Created: 2026-04-08
-- Purpose: Add username/password authentication for admin panel (no Supabase Auth)

-- Admin users table (simple username/password auth)
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- bcrypt hashed password
  role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  CONSTRAINT username_length CHECK (length(username) >= 3),
  CONSTRAINT username_format CHECK (username ~* '^[a-z0-9_]+$')
);

-- Index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(active) WHERE active = true;

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for Netlify Functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Service role has full access to admin_users'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Service role has full access to admin_users"
      ON admin_users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    $p$;
  END IF;
END $$;

-- No public access to admin_users (only via serverless functions)
-- This prevents direct table access from client

-- Helper function to validate login
CREATE OR REPLACE FUNCTION validate_admin_login(p_username TEXT, p_password_hash TEXT)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    admin_users.username,
    admin_users.role
  FROM admin_users
  WHERE
    admin_users.username = p_username
    AND admin_users.password_hash = p_password_hash
    AND admin_users.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to update last login
CREATE OR REPLACE FUNCTION update_last_login(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE admin_users
  SET last_login = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert initial admin user
-- Password: "changeme123" (hashed with bcrypt, 12 rounds)
-- IMPORTANT: Change this password immediately after first login!
INSERT INTO admin_users (username, password_hash, role, active)
VALUES (
  'admin',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIeWeCrHuG', -- changeme123
  'admin',
  true
)
ON CONFLICT (username) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE admin_users IS 'Admin users for affiliate dashboard - simple username/password auth';
COMMENT ON COLUMN admin_users.password_hash IS 'Bcrypt hashed password (12 rounds)';
COMMENT ON COLUMN admin_users.role IS 'admin = full access, viewer = read-only';
COMMENT ON COLUMN admin_users.active IS 'Inactive users cannot login';
