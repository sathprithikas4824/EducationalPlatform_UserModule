-- Notes table: one note per user per topic
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic_id INTEGER NOT NULL,
  topic_name TEXT NOT NULL,
  module_id INTEGER,
  module_name TEXT,
  content TEXT NOT NULL DEFAULT '',
  notion_page_id TEXT,
  synced_to_notion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT notes_user_topic_unique UNIQUE (user_id, topic_id)
);

-- Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notes" ON notes
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own notes" ON notes
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (user_id = auth.uid()::text);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notes_updated_at_trigger
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_notes_updated_at();
