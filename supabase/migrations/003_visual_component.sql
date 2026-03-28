-- Migration: 003_visual_component.sql
-- Purpose: Add visual_component field to case_templates for interactive visualizer loading

ALTER TABLE case_templates
  ADD COLUMN visual_component TEXT DEFAULT NULL;

-- Set visual components for rate-conversion cases
UPDATE case_templates SET visual_component = 'rate_timeline'
  WHERE title LIKE '%DJ%dilemma%' OR title LIKE '%Commute%' OR title LIKE '%playlist sequel%';

-- Set visual components for fraction cases
UPDATE case_templates SET visual_component = 'fractions'
  WHERE title LIKE '%mystery ingredients%' OR title LIKE '%fairness debate%' OR title LIKE '%party planner%';
