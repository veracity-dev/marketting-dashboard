-- ============================================================
-- Chat Tables — AI Agent conversation persistence
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Chat sessions (one row per conversation thread)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    TEXT,                                         -- nullable now; future auth integration
  title      TEXT         NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated
  ON chat_sessions (user_id, updated_at DESC);

-- 2. Chat messages (one row per message in a session)
CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGSERIAL    PRIMARY KEY,
  session_id BIGINT       NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role       TEXT         NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT         NOT NULL,
  metadata   JSONB        NOT NULL DEFAULT '{}',           -- table data, chart config, SQL used
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages (session_id, created_at ASC);

-- ============================================================
-- Permissions (matches existing schema pattern)
-- ============================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

GRANT SELECT ON ALL TABLES    IN SCHEMA public TO anon, authenticated;
GRANT USAGE  ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read (no user auth yet — open dashboard)
CREATE POLICY "Allow anon read sessions"  ON chat_sessions FOR SELECT USING (true);
CREATE POLICY "Allow anon read messages"  ON chat_messages FOR SELECT USING (true);

-- Service role can do everything (the Python agent uses service_role key)
CREATE POLICY "Allow service role write sessions" ON chat_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write messages" ON chat_messages FOR ALL USING (auth.role() = 'service_role');

-- Anon can also insert/update/delete sessions and messages (open dashboard, no auth yet)
CREATE POLICY "Allow anon write sessions" ON chat_sessions FOR ALL USING (true);
CREATE POLICY "Allow anon write messages" ON chat_messages FOR ALL USING (true);
