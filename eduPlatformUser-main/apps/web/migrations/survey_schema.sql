-- =============================================
-- SURVEY / ONBOARDING SCHEMA
-- Run this in your Supabase SQL editor
-- =============================================

-- 1. Add survey_completed flag and role to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS survey_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';

-- 2. Create user_surveys table
CREATE TABLE IF NOT EXISTS public.user_surveys (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  email            VARCHAR(255),
  profession       VARCHAR(100),

  -- Student fields
  education_level  VARCHAR(100),
  career_goal      VARCHAR(255),
  field_of_study   VARCHAR(255),

  -- Teacher fields
  subject_taught   VARCHAR(255),
  teaching_level   VARCHAR(100),
  experience_years VARCHAR(50),

  -- Professional fields
  industry         VARCHAR(100),
  job_role         VARCHAR(255),
  platform_use     VARCHAR(255),

  -- Job seeker fields
  target_role      VARCHAR(255),

  -- Other
  other_description TEXT,

  -- Common
  topics_interested TEXT[],
  weekly_hours      VARCHAR(50),
  primary_goal      VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.user_surveys ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can submit their own survey
CREATE POLICY "Users can insert own survey"
  ON public.user_surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own survey
CREATE POLICY "Users can view own survey"
  ON public.user_surveys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins (role = 'admin' in profiles) can view all surveys
CREATE POLICY "Admins can view all surveys"
  ON public.user_surveys FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_surveys_user_id ON public.user_surveys(user_id);

-- =============================================
-- To make a user an admin, run:
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- =============================================
