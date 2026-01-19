-- Migration: Create pages_seo_meta table for SEO metadata
-- Description: Stores SEO meta information for each topic page

CREATE TABLE IF NOT EXISTS pages_seo_meta (
    id SERIAL PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL UNIQUE,
    page_type VARCHAR(50) NOT NULL CHECK (page_type IN ('homepage', 'course', 'article', 'pathway', 'category', 'about', 'contact', 'topic')),
    page_url VARCHAR(500) NOT NULL,

    -- Core SEO Fields
    meta_title VARCHAR(60) NOT NULL,
    meta_description VARCHAR(160) NOT NULL,
    meta_keywords TEXT,

    -- Open Graph Fields (Facebook, LinkedIn)
    og_title VARCHAR(95),
    og_description VARCHAR(200),
    og_image_url VARCHAR(500),
    og_type VARCHAR(50) DEFAULT 'website' CHECK (og_type IN ('website', 'article', 'profile')),

    -- Twitter Card Fields
    twitter_card VARCHAR(50) DEFAULT 'summary_large_image' CHECK (twitter_card IN ('summary', 'summary_large_image', 'app', 'player')),
    twitter_title VARCHAR(70),
    twitter_description VARCHAR(200),
    twitter_image_url VARCHAR(500),

    -- Technical SEO Fields
    canonical_url VARCHAR(500),
    robots_directive VARCHAR(100) DEFAULT 'index, follow',
    hreflang_tags JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_crawled_at TIMESTAMP WITH TIME ZONE,

    -- Indexes for performance
    CONSTRAINT unique_page_id UNIQUE(page_id)
);

-- Create indexes
CREATE INDEX idx_seo_page_type ON pages_seo_meta(page_type);
CREATE INDEX idx_seo_page_url ON pages_seo_meta(page_url);
CREATE INDEX idx_seo_updated_at ON pages_seo_meta(updated_at);

-- Add comment
COMMENT ON TABLE pages_seo_meta IS 'SEO metadata for all pages including topics';
COMMENT ON COLUMN pages_seo_meta.meta_title IS 'SEO title tag - Maximum 60 characters';
COMMENT ON COLUMN pages_seo_meta.meta_description IS 'SEO meta description - Maximum 160 characters';
COMMENT ON COLUMN pages_seo_meta.og_title IS 'Open Graph title for social media - Maximum 95 characters';
COMMENT ON COLUMN pages_seo_meta.twitter_card IS 'Twitter card type - Most common: summary_large_image';
COMMENT ON COLUMN pages_seo_meta.robots_directive IS 'Instructions for search engine crawlers';
COMMENT ON COLUMN pages_seo_meta.hreflang_tags IS 'JSON object for multi-language versions';

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_seo_meta_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_seo_meta_timestamp
    BEFORE UPDATE ON pages_seo_meta
    FOR EACH ROW
    EXECUTE FUNCTION update_seo_meta_updated_at();
