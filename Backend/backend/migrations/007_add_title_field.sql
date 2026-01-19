-- Migration: Add title field to modules, submodules, and topics
-- This migration adds a rich text title field to store formatted titles

-- Add title to main_categories
ALTER TABLE main_categories
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add title to categories
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add title to modules
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add title to submodules
ALTER TABLE submodules
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add title to topics
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add comments for documentation
COMMENT ON COLUMN main_categories.title IS 'Rich text formatted title for display purposes';
COMMENT ON COLUMN categories.title IS 'Rich text formatted title for display purposes';
COMMENT ON COLUMN modules.title IS 'Rich text formatted title for display purposes';
COMMENT ON COLUMN submodules.title IS 'Rich text formatted title for display purposes';
COMMENT ON COLUMN topics.title IS 'Rich text formatted title for display purposes';
