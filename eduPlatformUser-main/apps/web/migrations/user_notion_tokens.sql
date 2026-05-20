-- Per-user Notion OAuth tokens
CREATE TABLE IF NOT EXISTS user_notion_tokens (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token       TEXT NOT NULL,
  workspace_id       TEXT,
  workspace_name     TEXT,
  workspace_icon     TEXT,
  notion_database_id TEXT,   -- cached after first push (so we don't recreate it)
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_notion_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_notion_token"
  ON user_notion_tokens FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_notion_tokens_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_user_notion_tokens_updated_at
  BEFORE UPDATE ON user_notion_tokens
  FOR EACH ROW EXECUTE FUNCTION update_user_notion_tokens_updated_at();
