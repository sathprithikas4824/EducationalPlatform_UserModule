-- Migration: Add image_url column to topics and modules tables
-- Purpose: Allow topics and modules to have an image/thumbnail URL

-- Step 1: Add image_url column to topics table
ALTER TABLE public.topics
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Step 2: Add image_url column to modules table
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Note:
-- - image_url is optional (nullable) and can store URLs up to 500 characters
-- - This allows both submodule-based topics and standalone module topics to have images
