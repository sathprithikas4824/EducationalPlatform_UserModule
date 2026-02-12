-- =============================================
-- MODULE PROGRESS TRACKING - SUPABASE SQL SCHEMA
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. USER_TOPIC_PROGRESS TABLE
-- Tracks which topics a user has completed
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, topic_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON public.user_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_module_id ON public.user_topic_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_module ON public.user_topic_progress(user_id, module_id);
CREATE INDEX IF NOT EXISTS idx_progress_user_topic ON public.user_topic_progress(user_id, topic_id);

-- 2. ROW LEVEL SECURITY (RLS)
-- Users can only access their own progress
-- =============================================
ALTER TABLE public.user_topic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
ON public.user_topic_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.user_topic_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.user_topic_progress
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress"
ON public.user_topic_progress
FOR DELETE
USING (auth.uid() = user_id);

-- 3. UPDATED_AT TRIGGER FUNCTION (create if not exists)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_topic_progress table
DROP TRIGGER IF EXISTS set_progress_updated_at ON public.user_topic_progress;
CREATE TRIGGER set_progress_updated_at
    BEFORE UPDATE ON public.user_topic_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- DONE! Run this in your Supabase SQL Editor.
-- =============================================
