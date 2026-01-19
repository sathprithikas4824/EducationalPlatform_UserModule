-- Migration: Add image_url column to submodules table
-- Purpose: Allow submodules to have an image/thumbnail URL

-- Add image_url column to submodules table
ALTER TABLE public.submodules
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Note:
-- - image_url is optional (nullable) and can store URLs up to 500 characters
-- - This allows submodules to have images/thumbnails similar to topics and modules
