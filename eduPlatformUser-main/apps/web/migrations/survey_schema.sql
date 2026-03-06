-- =============================================
-- SURVEY / ONBOARDING SCHEMA (Optimised)
-- Run this in your Supabase SQL editor
-- =============================================
-- Optimised approach: instead of one column per question (sparse, mostly NULL),
-- all conditional answers are stored in a single JSONB column `answers`.
-- Only `profession` and `email` are top-level for fast filtering/indexing.

-- 1. Add survey_completed flag and role to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS survey_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 2. Create user_surveys table (optimised)
CREATE TABLE IF NOT EXISTS public.user_surveys (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  email      VARCHAR(255),
  profession VARCHAR(100),   -- top-level: used for filtering/stats
  answers    JSONB NOT NULL DEFAULT '{}',  -- all other fields in one column
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.user_surveys ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can insert own survey"
  ON public.user_surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own survey"
  ON public.user_surveys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all surveys"
  ON public.user_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_user_surveys_user_id  ON public.user_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_surveys_profession ON public.user_surveys(profession);
-- GIN index lets you query inside the JSONB answers (e.g. filter by topic)
CREATE INDEX IF NOT EXISTS idx_user_surveys_answers   ON public.user_surveys USING gin(answers);

-- =============================================
-- Example answers JSONB structure:
-- {
--   "education_level":  "Undergraduate",
--   "career_goal":      "Software Engineering",
--   "field_of_study":   "Computer Science",
--   "topics_interested": ["Programming & Development", "Data Science & AI"],
--   "weekly_hours":     "1–3 hours",
--   "primary_goal":     "Get a job / land my first role"
-- }
--
-- To make a user an admin, run:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- =============================================
