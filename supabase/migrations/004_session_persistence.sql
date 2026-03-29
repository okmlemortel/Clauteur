-- Migration 004: Session Persistence & Resumption
-- Enables continuous message saving, session pause/resume, and auto-abandon

-- 1. New table: persist every message as it happens
CREATE TABLE IF NOT EXISTS session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  source TEXT DEFAULT 'chat' CHECK (source IN ('chat', 'voice', 'casefile')),
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_session_messages_session ON session_messages(session_id, created_at);

-- 2. New columns on sessions table for state tracking
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'paused', 'completed', 'abandoned'));

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'warmup';

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS elapsed_seconds INTEGER DEFAULT 0;

-- 3. Backfill: mark existing sessions that have ended_at as 'completed'
UPDATE sessions SET status = 'completed' WHERE ended_at IS NOT NULL AND status IS NULL;
UPDATE sessions SET status = 'active' WHERE ended_at IS NULL AND status IS NULL;
