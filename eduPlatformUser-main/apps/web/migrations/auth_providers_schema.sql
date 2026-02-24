-- =============================================
-- AUTH PROVIDERS TRACKING MIGRATION
-- Run this in your Supabase SQL Editor AFTER annotations_schema.sql
-- This adds provider tracking so the DB shows how each user logs in
-- (email, google, notion) and links same-email accounts together.
-- =============================================


-- 1. ADD auth_providers COLUMN TO profiles
-- Stores an array of all login methods this user has used
-- e.g. ['email'], ['google'], ['email', 'google', 'notion']
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_providers TEXT[] NOT NULL DEFAULT '{}';


-- 2. UPDATE handle_new_user TRIGGER
-- Captures the initial provider when the account is first created
-- Also handles the case where the same-email account already exists
-- (Supabase will upsert the identity, triggering this again with a new provider)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  initial_provider TEXT;
BEGIN
  -- Extract the provider that created this identity (email, google, notion, etc.)
  initial_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

  INSERT INTO public.profiles (id, email, full_name, avatar_url, auth_providers)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name'
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    ),
    ARRAY[initial_provider]
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Merge new provider into existing providers list (no duplicates)
    auth_providers = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(
          array_cat(public.profiles.auth_providers, ARRAY[initial_provider])
        )
        ORDER BY 1
      )
    ),
    -- Update avatar from OAuth provider if not already set
    avatar_url = COALESCE(
      public.profiles.avatar_url,
      EXCLUDED.avatar_url
    ),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger (replace existing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- 3. ALLOW PROFILE INSERT BY AUTHENTICATED USERS
-- Needed so the trigger can run via SECURITY DEFINER
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;


-- 4. USEFUL QUERIES
-- =============================================

-- See all users and their login methods:
-- SELECT id, email, full_name, auth_providers FROM profiles ORDER BY created_at DESC;

-- Find users who have linked multiple providers:
-- SELECT id, email, auth_providers FROM profiles WHERE array_length(auth_providers, 1) > 1;

-- Find all Google users:
-- SELECT id, email FROM profiles WHERE 'google' = ANY(auth_providers);

-- Find all Notion users:
-- SELECT id, email FROM profiles WHERE 'notion' = ANY(auth_providers);
