-- =============================================
-- DOWNLOADS SYSTEM - SUPABASE SQL SCHEMA
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. user_downloads — stores each downloaded topic's content per user
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_downloads (
    id           TEXT PRIMARY KEY,
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id     INTEGER NOT NULL,
    topic_name   TEXT NOT NULL,
    module_name  TEXT NOT NULL,
    submodule_id INTEGER,
    file_name    TEXT NOT NULL,
    file_type    TEXT NOT NULL,
    content      TEXT,
    downloaded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, topic_id, file_name)
);

-- If user_downloads already exists, add the submodule_id column:
ALTER TABLE public.user_downloads ADD COLUMN IF NOT EXISTS submodule_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_user_downloads_user ON public.user_downloads(user_id);

ALTER TABLE public.user_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own downloads"
    ON public.user_downloads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own downloads"
    ON public.user_downloads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can upsert own downloads"
    ON public.user_downloads FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own downloads"
    ON public.user_downloads FOR DELETE
    USING (auth.uid() = user_id);


-- 2. user_module_downloads — tracks which modules a user has fully downloaded
--    NO device_id: one row per (user, module) so all devices see the same state
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_module_downloads (
    id            BIGSERIAL PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submodule_id  INTEGER NOT NULL,
    downloaded_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, submodule_id)
);

CREATE INDEX IF NOT EXISTS idx_user_module_downloads_user ON public.user_module_downloads(user_id);

ALTER TABLE public.user_module_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own module downloads"
    ON public.user_module_downloads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own module downloads"
    ON public.user_module_downloads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can upsert own module downloads"
    ON public.user_module_downloads FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own module downloads"
    ON public.user_module_downloads FOR DELETE
    USING (auth.uid() = user_id);


-- 3. Enable Realtime on user_module_downloads so all devices get live "Downloaded" updates
--    REQUIRED for cross-device instant sync to work
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_module_downloads;

-- 3b. REPLICA IDENTITY FULL — makes DELETE events include the full old row (not just PK).
--     Without this, the user_id column is missing from DELETE payloads, so row-level
--     Realtime filters like `user_id=eq.xxx` never match on DELETE events.
--     Run this once in your Supabase SQL Editor:
ALTER TABLE public.user_module_downloads REPLICA IDENTITY FULL;


-- 4. If user_module_downloads already exists WITH device_id column, migrate it:
--    Run these only if you had the old schema with device_id.
--    (Skip if creating fresh)
-- =============================================
-- ALTER TABLE public.user_module_downloads DROP COLUMN IF EXISTS device_id;
-- ALTER TABLE public.user_module_downloads DROP CONSTRAINT IF EXISTS user_module_downloads_user_id_device_id_submodule_id_key;
-- ALTER TABLE public.user_module_downloads ADD CONSTRAINT user_module_downloads_user_id_submodule_id_key UNIQUE (user_id, submodule_id);
