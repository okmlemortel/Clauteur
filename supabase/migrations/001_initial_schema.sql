-- Clauteur — Schema v3 (Sprint 1)
-- Source of truth: Claude.ai design spec, 2026-03-28
-- Based on diagnostic sessions with Olivia
-- Run this in Supabase SQL Editor

-- ============================================
-- Students (no real names in DB — internal_code only)
-- ============================================
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code TEXT UNIQUE NOT NULL,      -- 'ELEVE-001'
  profile JSONB DEFAULT '{}',              -- full cognitive profile
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Parents
-- ============================================
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code TEXT UNIQUE NOT NULL,      -- 'PARENT-001'
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Skill map — per-skill scoring
-- 0=untested, 1=fragile, 2=developing, 3=solid, 4=mastered
-- ============================================
CREATE TABLE skill_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,                    -- 'math', 'reasoning', 'expression'
  skill_id TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  practice_count INTEGER DEFAULT 0,
  notes TEXT,
  UNIQUE(student_id, skill_id)
);

-- ============================================
-- Case templates (populated by design lead)
-- ============================================
CREATE TABLE case_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  narrative TEXT NOT NULL,                 -- the detective scenario
  target_skills TEXT[] NOT NULL,
  prerequisite_skills TEXT[],
  difficulty INTEGER DEFAULT 1,           -- 1-5
  anchor_type TEXT,                       -- 'cooking', 'mystery', 'music', 'planning'
  plan_prompt TEXT,
  solution_path JSONB,                    -- correct reasoning (tutor reference only)
  probe_questions TEXT[],                 -- "what if" follow-ups
  explain_language TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Sessions (summaries only, no raw transcripts)
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  case_template_id UUID REFERENCES case_templates(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  phases_completed TEXT[],               -- ['warmup', 'plan', 'solve', 'explain']

  -- Case file content (student's work, NOT raw chat)
  casefile_given TEXT,
  casefile_problem TEXT,
  casefile_solution TEXT,
  casefile_explanation TEXT,

  -- Edit tracking
  edit_log JSONB,                         -- keystroke/timing events

  -- Voice metadata (NOT audio)
  voice_transcripts JSONB,               -- [{text, language, word_count, pause_count}]

  -- Cognitive signals (from tutor agent)
  cognitive_summary JSONB,

  -- Language analysis (from language agent)
  language_analysis JSONB,

  -- Report
  parent_report JSONB,
  max_alert_level INTEGER DEFAULT 0
);

-- ============================================
-- Parent alerts
-- ============================================
CREATE TABLE parent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  level INT NOT NULL,
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
CREATE INDEX idx_skill_map_student ON skill_map(student_id);
CREATE INDEX idx_case_templates_skills ON case_templates USING GIN(target_skills);
CREATE INDEX idx_parent_alerts_student ON parent_alerts(student_id);
CREATE INDEX idx_parent_alerts_unread ON parent_alerts(student_id) WHERE read_at IS NULL;

-- ============================================
-- Seed: Olivia's profile (from diagnostic sessions 1-2)
-- ============================================
INSERT INTO students (internal_code, profile) VALUES
  ('ELEVE-001', '{
    "name": "Olivia",
    "age": 13,
    "grade": "8th",
    "languages": {"dominant": "en", "fr_comfort": 2, "en_comfort": 3, "code_switching": true},
    "interests": ["music (pop, R&B, rock)", "mystery books (Nancy Drew)", "cooking"],
    "best_anchor": "detective/mystery scenarios + Given/Problem/Solution framework",
    "think_aloud": {"adopted": true, "quality": 3, "impact_on_accuracy": "positive"}
  }');

INSERT INTO parents (internal_code, student_id) VALUES
  ('PARENT-001', (SELECT id FROM students WHERE internal_code = 'ELEVE-001'));

-- ============================================
-- Seed: Olivia's skill map (from diagnostic sessions)
-- ============================================
INSERT INTO skill_map (student_id, domain, skill_id, score) VALUES
  -- Math
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'number_sense', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'operations_fluency', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'fractions_operations', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'fractions_as_reasoning', 2),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'proportional_direct', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'proportional_inverse', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'rate_conversion', 1),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'decimals', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'estimation', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'variables_unknowns', 0),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'negative_numbers', 0),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'patterns_functions', 0),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'percentages', 0),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'math', 'division_remainders', 0),
  -- Reasoning
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'reasoning', 'decomposition', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'reasoning', 'sequencing', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'reasoning', 'causal_chains', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'reasoning', 'justification_depth', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'reasoning', 'counterarguments', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'reasoning', 'metacognition', 2),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'reasoning', 'transfer_unfamiliar', 0),
  -- Expression
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'expression', 'connectors_en', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'expression', 'connectors_fr', 2),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'expression', 'sentence_complexity_en', 3),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'expression', 'sentence_complexity_fr', 2),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'expression', 'written_structure', 2),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'expression', 'fr_orthography', 1),
  ((SELECT id FROM students WHERE internal_code = 'ELEVE-001'), 'expression', 'oral_fluency_fr', 0);

-- ============================================
-- Seed: Sample case template (for Sprint 1 testing)
-- ============================================
INSERT INTO case_templates (title, narrative, target_skills, prerequisite_skills, difficulty, anchor_type, plan_prompt, solution_path, probe_questions, explain_language) VALUES
  (
    'The Baker''s Dilemma',
    'Detective Olivia, we need your help! A local baker is preparing for a big order. She needs to make 96 cupcakes for a school event. Her recipe makes exactly 12 cupcakes per batch. But here''s the twist — she only has 5 cups of flour, and each batch needs 3/4 cup of flour. She''s worried she won''t have enough. Can you investigate and figure out if she can complete the order?',
    ARRAY['fractions_as_reasoning', 'justification_depth', 'written_structure'],
    ARRAY['fractions_operations', 'number_sense'],
    2,
    'cooking',
    'What information do you have? What do you need to find out? How will you approach this?',
    '{"steps": ["96 cupcakes ÷ 12 per batch = 8 batches needed", "8 batches × 3/4 cup flour = 6 cups flour needed", "She only has 5 cups → not enough flour", "She is 1 cup short, or can only make 6 full batches (72 cupcakes)"], "answer": "No, she cannot complete the order. She needs 6 cups but only has 5."}',
    ARRAY['What if the recipe made 16 cupcakes per batch instead?', 'What if she found another half cup of flour — would that be enough?', 'How many cupcakes CAN she make with 5 cups?'],
    'fr'
  ),
  (
    'The Missing Concert Tickets',
    'Detective Olivia, a mystery at the concert hall! 240 tickets were printed for a show. On Monday, 1/3 of the tickets were sold. On Tuesday, 1/4 of the REMAINING tickets were sold. The box office manager says they have 100 tickets left, but the computer says a different number. Who is right — the manager or the computer? Investigate!',
    ARRAY['fractions_as_reasoning', 'sequencing', 'justification_depth'],
    ARRAY['fractions_operations', 'operations_fluency'],
    2,
    'mystery',
    'What facts do you know? What are you trying to determine? What''s your investigation plan?',
    '{"steps": ["Monday: 1/3 of 240 = 80 sold → 160 remaining", "Tuesday: 1/4 of 160 = 40 sold → 120 remaining", "Computer says 120 tickets left", "Manager says 100 — manager is wrong, computer is right"], "answer": "The computer is right. 120 tickets remain."}',
    ARRAY['What if Tuesday''s sales were 1/3 of remaining instead of 1/4?', 'How many total tickets were sold across both days?', 'What fraction of ALL tickets are still unsold?'],
    'fr'
  );
