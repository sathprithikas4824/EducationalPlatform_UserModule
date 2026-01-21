-- =============================================
-- ANNOTATION SYSTEM - SUPABASE SQL SCHEMA
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. USERS TABLE (if not using Supabase Auth)
-- Skip this if you're using Supabase Auth - it creates auth.users automatically
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);


-- 2. HIGHLIGHTS TABLE
-- Stores user annotations/highlights
-- =============================================
CREATE TABLE IF NOT EXISTS public.highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    page_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    color VARCHAR(20) DEFAULT '#fef08a',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON public.highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_page_id ON public.highlights(page_id);
CREATE INDEX IF NOT EXISTS idx_highlights_user_page ON public.highlights(user_id, page_id);


-- 3. IF USING SUPABASE AUTH (Recommended)
-- Use this version instead - references auth.users
-- =============================================
/*
CREATE TABLE IF NOT EXISTS public.highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    page_id VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    color VARCHAR(20) DEFAULT '#fef08a',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_highlights_user_id ON public.highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_highlights_page_id ON public.highlights(page_id);
CREATE INDEX IF NOT EXISTS idx_highlights_user_page ON public.highlights(user_id, page_id);
*/


-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Users can only access their own highlights
-- =============================================
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own highlights
CREATE POLICY "Users can view own highlights"
ON public.highlights
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own highlights
CREATE POLICY "Users can insert own highlights"
ON public.highlights
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own highlights
CREATE POLICY "Users can update own highlights"
ON public.highlights
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own highlights
CREATE POLICY "Users can delete own highlights"
ON public.highlights
FOR DELETE
USING (auth.uid() = user_id);


-- 5. UPDATED_AT TRIGGER FUNCTION
-- Automatically updates the updated_at column
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to highlights table
DROP TRIGGER IF EXISTS set_highlights_updated_at ON public.highlights;
CREATE TRIGGER set_highlights_updated_at
    BEFORE UPDATE ON public.highlights
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- 6. OPTIONAL: USER PROFILES TABLE (extends auth.users)
-- For storing additional user data
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();


-- 7. AUTO-CREATE PROFILE ON USER SIGNUP
-- Creates a profile when a new user signs up
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- 8. HELPER VIEWS
-- =============================================

-- View: User highlights with profile info
CREATE OR REPLACE VIEW public.user_highlights_view AS
SELECT
    h.id,
    h.user_id,
    h.page_id,
    h.text,
    h.start_offset,
    h.end_offset,
    h.color,
    h.created_at,
    p.full_name as user_name,
    p.email as user_email
FROM public.highlights h
LEFT JOIN public.profiles p ON h.user_id = p.id;


-- 9. USEFUL QUERIES FOR YOUR APP
-- =============================================

-- Get all highlights for a user on a specific page
-- SELECT * FROM highlights WHERE user_id = 'user-uuid' AND page_id = 'python-basics';

-- Get highlight count per user
-- SELECT user_id, COUNT(*) as highlight_count FROM highlights GROUP BY user_id;

-- Get most highlighted pages
-- SELECT page_id, COUNT(*) as highlight_count FROM highlights GROUP BY page_id ORDER BY highlight_count DESC;

-- Delete all highlights for a user on a page
-- DELETE FROM highlights WHERE user_id = 'user-uuid' AND page_id = 'python-basics';


-- 10. SAMPLE DATA (for testing)
-- =============================================
/*
-- Insert test user (if not using Supabase Auth)
INSERT INTO public.users (id, email, name) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test User');

-- Insert test highlights
INSERT INTO public.highlights (user_id, page_id, text, start_offset, end_offset, color) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'python-basics', 'Python is the #1 Language', 0, 25, '#fef08a'),
('550e8400-e29b-41d4-a716-446655440000', 'python-basics', 'building intelligent systems', 100, 128, '#bbf7d0');
*/


-- =============================================
-- DONE! Your annotation system is ready.
-- =============================================
