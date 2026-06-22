-- Migration: add accessibility_preferences column to profiles
-- Stores user accessibility settings so they persist across devices/browsers.
-- Shape: { highContrast: boolean, reducedMotion: boolean, fontSize: "normal"|"large"|"xl" }

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accessibility_preferences JSONB
    NOT NULL
    DEFAULT '{"highContrast": false, "reducedMotion": false, "fontSize": "normal"}'::jsonb;

COMMENT ON COLUMN profiles.accessibility_preferences IS
  'User accessibility settings: highContrast, reducedMotion, fontSize ("normal"|"large"|"xl")';
