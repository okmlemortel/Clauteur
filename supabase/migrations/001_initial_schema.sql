-- Clauteur — Initial Schema (Sprint 1 MVP)
-- Source of truth: Claude.ai design spec, 2026-03-26
-- Run this in Supabase SQL Editor or via CLI migration

-- ============================================
-- Students (no real names in DB — internal_code only)
-- ============================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code TEXT UNIQUE NOT NULL,  -- "ELEVE-001"
  profile JSONB DEFAULT '{}',          -- cognitive profile (mirrors student-profile.json)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Parents
-- ============================================
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code TEXT UNIQUE NOT NULL,  -- "PARENT-001"
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Sessions (summaries only, no raw transcripts)
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,                   -- "diagnostic", "fondations", "programme", "exploration"
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INT,
  summary JSONB,                        -- cognitive notes aggregate
  report JSONB,                         -- parent report
  max_alert_level INT DEFAULT 0
);

-- ============================================
-- Knowledge map entries
-- ============================================
CREATE TABLE knowledge_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,
  status TEXT DEFAULT 'not_started',     -- not_started, in_progress, mastered
  last_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, concept_id)
);

-- ============================================
-- Parent alerts
-- ============================================
CREATE TABLE parent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  level INT NOT NULL,           -- 1 | 2 | 3
  type TEXT,
  message TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX idx_knowledge_map_student ON knowledge_map(student_id);
CREATE INDEX idx_parent_alerts_student ON parent_alerts(student_id);
CREATE INDEX idx_parent_alerts_unread ON parent_alerts(student_id) WHERE read_at IS NULL;

-- ============================================
-- Seed data
-- ============================================
INSERT INTO students (internal_code, profile) VALUES
  ('ELEVE-001', '{
    "name": "à confirmer",
    "age": 13,
    "grade": "8th",
    "languages": ["fr", "en"],
    "interests": ["jeux", "sport", "musique", "cuisine"],
    "cognitive_stage": 1,
    "best_anchor": "cuisine",
    "frustration_threshold": 3,
    "uncertainty_vocab_level": 1
  }');

INSERT INTO parents (internal_code, student_id) VALUES
  ('PARENT-001', (SELECT id FROM students WHERE internal_code = 'ELEVE-001'));
