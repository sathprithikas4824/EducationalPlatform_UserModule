-- ============================================================================
-- IMAJIIN E-LEARNING PLATFORM - INDEXES AND TRIGGERS
-- Migration: 002_create_indexes_triggers.sql
-- Version: 1.0.0
-- Description: Performance indexes, full-text search, and automated triggers
-- ============================================================================

-- ============================================================================
-- TOPICS TABLE INDEXES
-- ============================================================================

-- Primary query indexes
CREATE INDEX IF NOT EXISTS idx_topics_module_id
    ON public.topics(module_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_topics_submodule_id
    ON public.topics(submodule_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_topics_slug
    ON public.topics(slug)
    WHERE deleted_at IS NULL;

-- Status and filtering indexes
CREATE INDEX IF NOT EXISTS idx_topics_status
    ON public.topics(status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_topics_status_published
    ON public.topics(status, published_at DESC)
    WHERE status = 'published' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_topics_featured
    ON public.topics(featured, display_order)
    WHERE featured = TRUE AND deleted_at IS NULL;

-- Sorting indexes
CREATE INDEX IF NOT EXISTS idx_topics_created_at
    ON public.topics(created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_topics_updated_at
    ON public.topics(updated_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_topics_published_at
    ON public.topics(published_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_topics_display_order
    ON public.topics(display_order ASC);

-- Soft delete index
CREATE INDEX IF NOT EXISTS idx_topics_deleted_at
    ON public.topics(deleted_at)
    WHERE deleted_at IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_topics_parent_status
    ON public.topics(module_id, submodule_id, status)
    WHERE deleted_at IS NULL;

-- Full-text search index (PostgreSQL specific)
CREATE INDEX IF NOT EXISTS idx_topics_search_vector
    ON public.topics
    USING gin(to_tsvector('english', name || ' ' || COALESCE(content, '') || ' ' || COALESCE(excerpt, '')));

-- ============================================================================
-- SEO META TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topics_seo_topic_id
    ON public.topics_seo_meta(topic_id);

CREATE INDEX IF NOT EXISTS idx_topics_seo_focus_keyword
    ON public.topics_seo_meta(focus_keyword)
    WHERE focus_keyword IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_topics_seo_health_status
    ON public.topics_seo_meta(seo_health_status);

CREATE INDEX IF NOT EXISTS idx_topics_seo_score
    ON public.topics_seo_meta(seo_score DESC)
    WHERE seo_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_topics_seo_canonical
    ON public.topics_seo_meta(canonical_url);

-- ============================================================================
-- AEO TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topics_aeo_topic_id
    ON public.topics_aeo_optimization(topic_id);

-- Full-text search on questions
CREATE INDEX IF NOT EXISTS idx_topics_aeo_questions
    ON public.topics_aeo_optimization
    USING gin(to_tsvector('english', COALESCE(primary_question, '')));

-- JSONB indexes for array searches
CREATE INDEX IF NOT EXISTS idx_topics_aeo_entities
    ON public.topics_aeo_optimization
    USING gin(primary_entities);

CREATE INDEX IF NOT EXISTS idx_topics_aeo_faq
    ON public.topics_aeo_optimization
    USING gin(faq_items);

-- ============================================================================
-- GEO TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topics_geo_topic_id
    ON public.topics_geo_optimization(topic_id);

CREATE INDEX IF NOT EXISTS idx_topics_geo_quality_score
    ON public.topics_geo_optimization(content_quality_score DESC)
    WHERE content_quality_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_topics_geo_review_date
    ON public.topics_geo_optimization(next_review_date)
    WHERE next_review_date IS NOT NULL;

-- ============================================================================
-- ANALYTICS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topics_analytics_topic_id
    ON public.topics_analytics(topic_id);

CREATE INDEX IF NOT EXISTS idx_topics_analytics_views
    ON public.topics_analytics(view_count DESC);

CREATE INDEX IF NOT EXISTS idx_topics_analytics_organic_traffic
    ON public.topics_analytics(organic_traffic DESC);

CREATE INDEX IF NOT EXISTS idx_topics_analytics_search_position
    ON public.topics_analytics(avg_search_position ASC)
    WHERE avg_search_position IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_topics_analytics_performance
    ON public.topics_analytics(overall_performance_score DESC)
    WHERE overall_performance_score IS NOT NULL;

-- Composite index for performance dashboard
CREATE INDEX IF NOT EXISTS idx_topics_analytics_dashboard
    ON public.topics_analytics(topic_id, view_count, organic_traffic, avg_search_position);

-- ============================================================================
-- TAGS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topic_tags_slug
    ON public.topic_tags(slug);

CREATE INDEX IF NOT EXISTS idx_topic_tags_type
    ON public.topic_tags(tag_type);

CREATE INDEX IF NOT EXISTS idx_topic_tags_featured
    ON public.topic_tags(is_featured)
    WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_topic_tags_usage
    ON public.topic_tags(usage_count DESC);

-- ============================================================================
-- TAG RELATIONS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topic_tag_relations_topic
    ON public.topic_tag_relations(topic_id);

CREATE INDEX IF NOT EXISTS idx_topic_tag_relations_tag
    ON public.topic_tag_relations(tag_id);

-- ============================================================================
-- REVISIONS TABLE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topic_revisions_topic_id
    ON public.topic_revisions(topic_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_topic_revisions_created_at
    ON public.topic_revisions(created_at DESC);

-- ============================================================================
-- AUTOMATED TRIGGERS
-- ============================================================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER topics_updated_at_trigger
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER topics_seo_meta_updated_at_trigger
    BEFORE UPDATE ON public.topics_seo_meta
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER topics_aeo_updated_at_trigger
    BEFORE UPDATE ON public.topics_aeo_optimization
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER topics_geo_updated_at_trigger
    BEFORE UPDATE ON public.topics_geo_optimization
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER topics_analytics_updated_at_trigger
    BEFORE UPDATE ON public.topics_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER topic_tags_updated_at_trigger
    BEFORE UPDATE ON public.topic_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Function: Auto-generate slug from name
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_topic_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Only generate slug if not provided or if name changed
    IF (TG_OP = 'INSERT' AND (NEW.slug IS NULL OR NEW.slug = '')) OR
       (TG_OP = 'UPDATE' AND NEW.name != OLD.name AND (NEW.slug = OLD.slug OR NEW.slug IS NULL)) THEN

        -- Generate base slug: lowercase, replace spaces and special chars with hyphens
        base_slug := LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9\s-]', '', 'g'),
                '\s+', '-', 'g'
            )
        );

        -- Remove leading/trailing hyphens
        base_slug := TRIM(BOTH '-' FROM base_slug);

        -- Ensure uniqueness
        final_slug := base_slug;
        WHILE EXISTS (
            SELECT 1 FROM public.topics
            WHERE slug = final_slug
            AND topic_id != COALESCE(NEW.topic_id, 0)
            AND deleted_at IS NULL
        ) LOOP
            counter := counter + 1;
            final_slug := base_slug || '-' || counter;
        END LOOP;

        NEW.slug := final_slug;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topics_slug_trigger
    BEFORE INSERT OR UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION generate_topic_slug();

-- ============================================================================
-- Function: Auto-update published_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_published_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Set published_at when status changes to 'published'
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        NEW.published_at := CURRENT_TIMESTAMP;
    END IF;

    -- Clear published_at when unpublished
    IF NEW.status != 'published' AND OLD.status = 'published' THEN
        NEW.published_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topics_published_at_trigger
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION update_published_at();

-- ============================================================================
-- Function: Create analytics record when topic is created
-- ============================================================================
CREATE OR REPLACE FUNCTION create_topic_analytics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.topics_analytics (topic_id)
    VALUES (NEW.topic_id)
    ON CONFLICT (topic_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topics_create_analytics_trigger
    AFTER INSERT ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION create_topic_analytics();

-- ============================================================================
-- Function: Update tag usage count
-- ============================================================================
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.topic_tags
        SET usage_count = usage_count + 1
        WHERE tag_id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.topic_tags
        SET usage_count = GREATEST(0, usage_count - 1)
        WHERE tag_id = OLD.tag_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topic_tag_relations_usage_trigger
    AFTER INSERT OR DELETE ON public.topic_tag_relations
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_usage_count();

-- ============================================================================
-- Function: Create revision on topic update
-- ============================================================================
CREATE OR REPLACE FUNCTION create_topic_revision()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create revision if content, name, or excerpt changed
    IF (OLD.content IS DISTINCT FROM NEW.content) OR
       (OLD.name IS DISTINCT FROM NEW.name) OR
       (OLD.excerpt IS DISTINCT FROM NEW.excerpt) THEN

        INSERT INTO public.topic_revisions (
            topic_id,
            version,
            name,
            content,
            excerpt,
            change_type,
            change_summary,
            snapshot_data
        ) VALUES (
            NEW.topic_id,
            NEW.version,
            NEW.name,
            NEW.content,
            NEW.excerpt,
            'updated',
            'Content updated',
            jsonb_build_object(
                'name', NEW.name,
                'content', NEW.content,
                'excerpt', NEW.excerpt,
                'status', NEW.status,
                'difficulty_level', NEW.difficulty_level
            )
        );

        -- Increment version
        NEW.version := NEW.version + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topics_revision_trigger
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION create_topic_revision();

-- ============================================================================
-- Function: Validate topic constraints
-- ============================================================================
CREATE OR REPLACE FUNCTION validate_topic_constraints()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure status is valid
    IF NEW.status NOT IN ('draft', 'published', 'archived', 'review') THEN
        RAISE EXCEPTION 'Invalid status: %. Must be draft, published, archived, or review', NEW.status;
    END IF;

    -- Ensure difficulty level is valid
    IF NEW.difficulty_level IS NOT NULL AND
       NEW.difficulty_level NOT IN ('beginner', 'intermediate', 'advanced', 'expert') THEN
        RAISE EXCEPTION 'Invalid difficulty_level: %', NEW.difficulty_level;
    END IF;

    -- Ensure display_order is not negative
    IF NEW.display_order < 0 THEN
        NEW.display_order := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER topics_validate_trigger
    BEFORE INSERT OR UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION validate_topic_constraints();

-- ============================================================================
-- UTILITY FUNCTIONS FOR SEO SCORING
-- ============================================================================

-- Function: Calculate basic SEO score
CREATE OR REPLACE FUNCTION calculate_seo_score(topic_id_param INTEGER)
RETURNS DECIMAL AS $$
DECLARE
    score DECIMAL := 0;
    topic_rec RECORD;
    seo_rec RECORD;
BEGIN
    -- Get topic data
    SELECT * INTO topic_rec FROM public.topics WHERE topic_id = topic_id_param;
    SELECT * INTO seo_rec FROM public.topics_seo_meta WHERE topic_id = topic_id_param;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Title exists and length is good (15 points)
    IF seo_rec.meta_title IS NOT NULL AND LENGTH(seo_rec.meta_title) BETWEEN 30 AND 60 THEN
        score := score + 15;
    ELSIF seo_rec.meta_title IS NOT NULL THEN
        score := score + 5;
    END IF;

    -- Description exists and length is good (15 points)
    IF seo_rec.meta_description IS NOT NULL AND LENGTH(seo_rec.meta_description) BETWEEN 120 AND 155 THEN
        score := score + 15;
    ELSIF seo_rec.meta_description IS NOT NULL THEN
        score := score + 5;
    END IF;

    -- Focus keyword exists (10 points)
    IF seo_rec.focus_keyword IS NOT NULL AND LENGTH(seo_rec.focus_keyword) > 0 THEN
        score := score + 10;
    END IF;

    -- Content length (20 points)
    IF LENGTH(topic_rec.content) > 1500 THEN
        score := score + 20;
    ELSIF LENGTH(topic_rec.content) > 500 THEN
        score := score + 10;
    END IF;

    -- Has excerpt (10 points)
    IF topic_rec.excerpt IS NOT NULL AND LENGTH(topic_rec.excerpt) > 50 THEN
        score := score + 10;
    END IF;

    -- Open Graph data (10 points)
    IF seo_rec.og_title IS NOT NULL AND seo_rec.og_description IS NOT NULL THEN
        score := score + 10;
    END IF;

    -- Twitter Card data (10 points)
    IF seo_rec.twitter_title IS NOT NULL AND seo_rec.twitter_description IS NOT NULL THEN
        score := score + 10;
    END IF;

    -- Canonical URL (5 points)
    IF seo_rec.canonical_url IS NOT NULL THEN
        score := score + 5;
    END IF;

    -- Schema markup (5 points)
    IF seo_rec.schema_json IS NOT NULL THEN
        score := score + 5;
    END IF;

    RETURN LEAST(100, score);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETED: Indexes and triggers creation
-- Performance optimizations applied
-- ============================================================================
