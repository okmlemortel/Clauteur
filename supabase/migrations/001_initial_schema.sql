-- Clauteur — Initial Schema
-- Sprint 1 MVP
-- Run this in Supabase SQL Editor or via CLI migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Profil élève
-- ============================================
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  internal_code TEXT UNIQUE NOT NULL,
  age INT,
  grade TEXT,
  languages TEXT[],
  interests TEXT[],
  cognitive_stage INT DEFAULT 1,        -- 1 à 4
  best_anchor TEXT,                     -- 'cuisine', 'musique', etc.
  frustration_threshold INT DEFAULT 3,  -- minutes avant abandon
  uncertainty_vocab_level INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Sessions (synthèses, jamais transcriptions brutes)
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  duration_minutes INT,
  mode TEXT DEFAULT 'fondations',       -- 'fondations' | 'programme' | 'exploration'
  summary TEXT,
  cognitive_observations JSONB,
  spontaneous_connections TEXT[],
  frustration_events INT DEFAULT 0,
  recovery_speed TEXT,                  -- 'rapide' | 'moyen' | 'lent'
  parent_report JSONB,
  alert_level INT DEFAULT 0            -- 0: rien | 1: noter | 2: alerter | 3: urgent
);

-- ============================================
-- Knowledge map — nœuds
-- ============================================
CREATE TABLE knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  concept TEXT NOT NULL,
  mastery_level FLOAT DEFAULT 0,        -- 0 à 1
  last_visited TIMESTAMP,
  anchor_used TEXT
);

-- ============================================
-- Knowledge map — connexions inter-concepts
-- ============================================
CREATE TABLE knowledge_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  concept_a TEXT NOT NULL,
  concept_b TEXT NOT NULL,
  strength FLOAT DEFAULT 0.1,
  first_observed TIMESTAMP DEFAULT NOW(),
  last_reinforced TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Marqueurs cognitifs longitudinaux
-- ============================================
CREATE TABLE cognitive_markers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  marker_type TEXT NOT NULL,   -- 'justification' | 'incertitude' | 'connexion' | 'identite'
  value TEXT,
  stage_at_time INT,
  noted_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Alertes parents
-- ============================================
CREATE TABLE parent_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  level INT NOT NULL,           -- 1 | 2 | 3
  type TEXT,
  message TEXT,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Index pour performance
-- ============================================
CREATE INDEX idx_sessions_student ON sessions(student_id);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX idx_knowledge_nodes_student ON knowledge_nodes(student_id);
CREATE INDEX idx_knowledge_connections_student ON knowledge_connections(student_id);
CREATE INDEX idx_cognitive_markers_student ON cognitive_markers(student_id);
CREATE INDEX idx_cognitive_markers_session ON cognitive_markers(session_id);
CREATE INDEX idx_parent_alerts_student ON parent_alerts(student_id);
CREATE INDEX idx_parent_alerts_unread ON parent_alerts(student_id) WHERE read_at IS NULL;

-- ============================================
-- Seed data — profil élève initial pour MVP
-- ============================================
INSERT INTO student_profiles (
  internal_code,
  age,
  grade,
  languages,
  interests,
  cognitive_stage,
  best_anchor,
  frustration_threshold,
  uncertainty_vocab_level
) VALUES (
  'ELEVE-001',
  13,
  '8th grade',
  ARRAY['français', 'anglais'],
  ARRAY['jeux', 'sport', 'musique', 'cuisine'],
  1,
  'cuisine',
  3,
  1
);

-- Parent access code (same student, parent role)
-- In MVP, parents use 'PARENT-001' as their access code
-- We store this as a simple lookup — same student_id
