-- =============================================
-- ADMIN QUERIES — USER LOGIN TYPE ANALYSIS
-- Run these in Supabase SQL Editor to see
-- how users are logging in
-- =============================================


-- =============================================
-- 1. SEE ALL USERS WITH THEIR LOGIN METHODS
-- =============================================
SELECT
  p.id,
  p.email,
  p.full_name,
  p.auth_providers,
  p.created_at AS joined_at,
  u.last_sign_in_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;


-- =============================================
-- 2. COUNT USERS BY EACH LOGIN TYPE
-- =============================================
SELECT
  provider,
  COUNT(*) AS total_users
FROM (
  SELECT unnest(auth_providers) AS provider
  FROM public.profiles
) AS providers
GROUP BY provider
ORDER BY total_users DESC;

-- Expected output:
-- provider | total_users
-- ---------|------------
-- email    | 45
-- google   | 30
-- notion   | 10


-- =============================================
-- 3. SEE ONLY EMAIL/PASSWORD USERS
-- =============================================
SELECT
  id,
  email,
  full_name,
  auth_providers,
  created_at
FROM public.profiles
WHERE 'email' = ANY(auth_providers)
ORDER BY created_at DESC;


-- =============================================
-- 4. SEE ONLY GOOGLE LOGIN USERS
-- =============================================
SELECT
  id,
  email,
  full_name,
  auth_providers,
  created_at
FROM public.profiles
WHERE 'google' = ANY(auth_providers)
ORDER BY created_at DESC;


-- =============================================
-- 5. SEE ONLY NOTION LOGIN USERS
-- =============================================
SELECT
  id,
  email,
  full_name,
  auth_providers,
  created_at
FROM public.profiles
WHERE 'notion' = ANY(auth_providers)
ORDER BY created_at DESC;


-- =============================================
-- 6. SEE USERS WHO LINKED MULTIPLE PROVIDERS
-- (same account used Google + Email etc.)
-- =============================================
SELECT
  id,
  email,
  full_name,
  auth_providers,
  array_length(auth_providers, 1) AS provider_count,
  created_at
FROM public.profiles
WHERE array_length(auth_providers, 1) > 1
ORDER BY provider_count DESC;


-- =============================================
-- 7. SEE USERS WHO SET PASSWORD AFTER GOOGLE LOGIN
-- (has both google and email providers)
-- =============================================
SELECT
  id,
  email,
  full_name,
  auth_providers
FROM public.profiles
WHERE 'google' = ANY(auth_providers)
  AND 'email' = ANY(auth_providers)
ORDER BY created_at DESC;


-- =============================================
-- 8. SEE USERS WHO SKIPPED PASSWORD SETUP
-- (only google, no email provider)
-- =============================================
SELECT
  id,
  email,
  full_name,
  auth_providers
FROM public.profiles
WHERE 'google' = ANY(auth_providers)
  AND NOT ('email' = ANY(auth_providers))
ORDER BY created_at DESC;


-- =============================================
-- 9. FULL ADMIN DASHBOARD SUMMARY
-- =============================================
SELECT
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE 'email'  = ANY(auth_providers)) AS email_users,
  COUNT(*) FILTER (WHERE 'google' = ANY(auth_providers)) AS google_users,
  COUNT(*) FILTER (WHERE 'notion' = ANY(auth_providers)) AS notion_users,
  COUNT(*) FILTER (WHERE array_length(auth_providers, 1) > 1) AS multi_provider_users
FROM public.profiles;

-- Expected output (single row):
-- total_users | email_users | google_users | notion_users | multi_provider_users
-- ------------|-------------|--------------|--------------|---------------------
-- 85          | 45          | 30           | 10           | 12


-- =============================================
-- 10. RECENT SIGN-INS WITH LOGIN METHOD
-- (uses auth.identities for real-time provider info)
-- =============================================
SELECT
  u.email,
  i.provider,
  i.created_at AS provider_linked_at,
  u.last_sign_in_at
FROM auth.users u
JOIN auth.identities i ON u.id = i.user_id
ORDER BY u.last_sign_in_at DESC
LIMIT 50;
