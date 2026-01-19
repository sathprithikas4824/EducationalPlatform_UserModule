-- Migration: Add description field to topics table
-- This migration adds a rich text description field to store formatted descriptions

-- Add description to topics
ALTER TABLE topics
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment for documentation
COMMENT ON COLUMN topics.description IS 'Rich text formatted description for display purposes';
