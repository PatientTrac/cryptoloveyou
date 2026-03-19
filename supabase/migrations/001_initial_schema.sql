-- Migration: Initial Schema Setup for CryptoLoveYou
-- Description: Creates tables for contacts, leads, and affiliate tracking
-- Author: Phase 1 Implementation
-- Date: 2026-03-18

-- ============================================
-- CONTACTS TABLE
-- ============================================
-- Update existing contacts table with new field
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS hubspot_contact_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_hubspot_id ON contacts(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- Add trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),

    -- UTM tracking
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    utm_term VARCHAR(255),
    utm_content VARCHAR(255),

    -- Lead scoring & status
    lead_score INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'new',
    tags TEXT[], -- Array of tags

    -- HubSpot integration
    hubspot_contact_id VARCHAR(255),
    hubspot_deal_id VARCHAR(255),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for leads table
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_hubspot_contact_id ON leads(hubspot_contact_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);

-- Trigger for leads updated_at
DROP TRIGGER IF NOT EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AFFILIATE TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_tracking (
    id BIGSERIAL PRIMARY KEY,

    -- Program details
    program_name VARCHAR(255) NOT NULL,
    program_slug VARCHAR(255) NOT NULL,
    affiliate_link TEXT NOT NULL,
    original_url TEXT NOT NULL,

    -- Tracking
    click_count INTEGER DEFAULT 0,
    unique_click_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'USD',

    -- Metadata
    category VARCHAR(100),
    tags TEXT[],
    notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_clicked_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for affiliate_tracking
CREATE INDEX IF NOT EXISTS idx_affiliate_program_slug ON affiliate_tracking(program_slug);
CREATE INDEX IF NOT EXISTS idx_affiliate_is_active ON affiliate_tracking(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_created_at ON affiliate_tracking(created_at DESC);

-- Trigger for affiliate_tracking updated_at
DROP TRIGGER IF NOT EXISTS update_affiliate_tracking_updated_at ON affiliate_tracking;
CREATE TRIGGER update_affiliate_tracking_updated_at
    BEFORE UPDATE ON affiliate_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- AFFILIATE CLICKS TABLE (for detailed tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id BIGSERIAL PRIMARY KEY,
    affiliate_id BIGINT REFERENCES affiliate_tracking(id) ON DELETE CASCADE,

    -- Visitor information
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,

    -- UTM parameters
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),

    -- Geo data (optional - can be enriched via IP lookup)
    country VARCHAR(100),
    city VARCHAR(100),

    -- Conversion tracking
    converted BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10, 2),

    -- Timestamp
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for affiliate_clicks
CREATE INDEX IF NOT EXISTS idx_clicks_affiliate_id ON affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_converted ON affiliate_clicks(converted);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Policies for contacts (read-only for authenticated users, full access for service role)
CREATE POLICY "Service role has full access to contacts" ON contacts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view contacts" ON contacts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for leads
CREATE POLICY "Service role has full access to leads" ON leads
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view leads" ON leads
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policies for affiliate_tracking
CREATE POLICY "Service role has full access to affiliate_tracking" ON affiliate_tracking
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view active affiliates" ON affiliate_tracking
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Policies for affiliate_clicks
CREATE POLICY "Service role has full access to affiliate_clicks" ON affiliate_clicks
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can view affiliate_clicks" ON affiliate_clicks
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment click count
CREATE OR REPLACE FUNCTION increment_affiliate_clicks(affiliate_slug VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE affiliate_tracking
    SET click_count = click_count + 1,
        last_clicked_at = NOW()
    WHERE program_slug = affiliate_slug AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to record conversion
CREATE OR REPLACE FUNCTION record_affiliate_conversion(
    affiliate_slug VARCHAR,
    conversion_amount DECIMAL DEFAULT 0.00
)
RETURNS void AS $$
BEGIN
    UPDATE affiliate_tracking
    SET conversion_count = conversion_count + 1,
        revenue = revenue + conversion_amount
    WHERE program_slug = affiliate_slug AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE contacts IS 'Contact form submissions from website';
COMMENT ON TABLE leads IS 'Marketing leads with UTM tracking and HubSpot sync';
COMMENT ON TABLE affiliate_tracking IS 'Affiliate program links and performance tracking';
COMMENT ON TABLE affiliate_clicks IS 'Individual click events for affiliate links';
