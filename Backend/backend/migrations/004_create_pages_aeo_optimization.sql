-- Migration: Create pages_aeo_optimization table for Answer Engine Optimization
-- Description: Stores AEO data for voice search, AI summaries, and featured snippets

CREATE TABLE IF NOT EXISTS pages_aeo_optimization (
    id SERIAL PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL UNIQUE,

    -- Featured Snippet Optimization
    featured_snippet_target TEXT,
    snippet_format VARCHAR(50) CHECK (snippet_format IN ('paragraph', 'list', 'table', 'video')),

    -- People Also Ask (PAA) Fields
    paa_questions JSONB DEFAULT '[]',
    paa_answers JSONB DEFAULT '[]',

    -- Voice Search Optimization
    conversational_query TEXT,
    voice_answer TEXT,

    -- AI Engine Optimization (ChatGPT, Perplexity, Google AI Overviews)
    ai_summary TEXT,

    -- Structured Data
    key_facts JSONB DEFAULT '[]',
    primary_entities JSONB DEFAULT '[]',
    related_topics JSONB DEFAULT '[]',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key to SEO meta table
    CONSTRAINT fk_page_id FOREIGN KEY (page_id) REFERENCES pages_seo_meta(page_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX idx_aeo_page_id ON pages_aeo_optimization(page_id);
CREATE INDEX idx_aeo_snippet_format ON pages_aeo_optimization(snippet_format);
CREATE INDEX idx_aeo_updated_at ON pages_aeo_optimization(updated_at);

-- Add comments
COMMENT ON TABLE pages_aeo_optimization IS 'Answer Engine Optimization data for AI and voice search';
COMMENT ON COLUMN pages_aeo_optimization.featured_snippet_target IS 'Concise answer (40-60 words) for featured snippet';
COMMENT ON COLUMN pages_aeo_optimization.snippet_format IS 'Type of featured snippet to target';
COMMENT ON COLUMN pages_aeo_optimization.paa_questions IS 'JSON array of People Also Ask questions';
COMMENT ON COLUMN pages_aeo_optimization.paa_answers IS 'JSON array of corresponding concise answers (30-50 words each)';
COMMENT ON COLUMN pages_aeo_optimization.conversational_query IS 'Natural language question for voice search';
COMMENT ON COLUMN pages_aeo_optimization.voice_answer IS 'Direct spoken-style answer (20-30 words)';
COMMENT ON COLUMN pages_aeo_optimization.ai_summary IS 'Summary for AI engines like ChatGPT (100-150 words)';
COMMENT ON COLUMN pages_aeo_optimization.key_facts IS 'JSON array of 3-5 bullet-point facts';
COMMENT ON COLUMN pages_aeo_optimization.primary_entities IS 'JSON array of main topics/subjects';
COMMENT ON COLUMN pages_aeo_optimization.related_topics IS 'JSON array of connected subjects';

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_aeo_optimization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_aeo_optimization_timestamp
    BEFORE UPDATE ON pages_aeo_optimization
    FOR EACH ROW
    EXECUTE FUNCTION update_aeo_optimization_updated_at();
