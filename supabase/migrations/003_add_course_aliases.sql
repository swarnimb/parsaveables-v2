-- Migration 003: Add Course Aliases System
-- Purpose: Clean up duplicate course entries by using aliases
-- Date: 2025-01-22

-- ============================================================================
-- 1. CREATE COURSE_ALIASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS course_aliases (
  id SERIAL PRIMARY KEY,
  alias TEXT UNIQUE NOT NULL,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_course_aliases_alias ON course_aliases(alias);
CREATE INDEX idx_course_aliases_course_id ON course_aliases(course_id);

COMMENT ON TABLE course_aliases IS 'Alternate names/spellings for courses that map to canonical course entries';
COMMENT ON COLUMN course_aliases.alias IS 'Alternate spelling or name (e.g., "Liveoak", "Met Center")';
COMMENT ON COLUMN course_aliases.course_id IS 'References the canonical course in courses table';

-- ============================================================================
-- 2. MIGRATE EXISTING DUPLICATES TO ALIASES
-- ============================================================================

-- Live Oak variations
INSERT INTO course_aliases (alias, course_id)
SELECT 'Liveoak', id FROM courses WHERE course_name = 'Live Oak'
ON CONFLICT (alias) DO NOTHING;

INSERT INTO course_aliases (alias, course_id)
SELECT 'Live Oak Brewing DGC', id FROM courses WHERE course_name = 'Live Oak'
ON CONFLICT (alias) DO NOTHING;

-- Northtown variations
INSERT INTO course_aliases (alias, course_id)
SELECT 'Northotown', id FROM courses WHERE course_name = 'Northtown Park'
ON CONFLICT (alias) DO NOTHING;

-- Searight variations
INSERT INTO course_aliases (alias, course_id)
SELECT 'Searight', id FROM courses WHERE course_name = 'Searight Park'
ON CONFLICT (alias) DO NOTHING;

-- MetCenter variations
INSERT INTO course_aliases (alias, course_id)
SELECT 'Met Center', id FROM courses WHERE course_name = 'MetCenter'
ON CONFLICT (alias) DO NOTHING;

-- Roy G variations
INSERT INTO course_aliases (alias, course_id)
SELECT 'Roy G', id FROM courses WHERE course_name = 'Roy G Guerrero'
ON CONFLICT (alias) DO NOTHING;

INSERT INTO course_aliases (alias, course_id)
SELECT 'Roy G.', id FROM courses WHERE course_name = 'Roy G Guerrero'
ON CONFLICT (alias) DO NOTHING;

-- Old Settlers variations
INSERT INTO course_aliases (alias, course_id)
SELECT 'Old Settlers', id FROM courses WHERE course_name = 'Old Settler''s'
ON CONFLICT (alias) DO NOTHING;

-- Flying Armadillo variations
INSERT INTO course_aliases (alias, course_id)
SELECT 'Armadillio', id FROM courses WHERE course_name = 'Flying Armadillo'
ON CONFLICT (alias) DO NOTHING;

-- Sprinkle Valley variations
INSERT INTO course_aliases (alias, course_id)
SELECT 'Sprinkle', id FROM courses WHERE course_name = 'Sprinkle Valley'
ON CONFLICT (alias) DO NOTHING;

-- Old Settler's variations (escape handling)
INSERT INTO course_aliases (alias, course_id)
SELECT 'Old Settler\''s', id FROM courses WHERE course_name = 'Old Settler''s'
ON CONFLICT (alias) DO NOTHING;

-- ============================================================================
-- 3. MARK DUPLICATE COURSES AS INACTIVE
-- ============================================================================

-- Disable duplicate entries now that aliases exist
UPDATE courses SET active = false
WHERE course_name IN (
  'Liveoak',
  'Live Oak Brewing DGC',
  'Northotown',
  'Searight',
  'Met Center',
  'Roy G',
  'Roy G.',
  'Old Settlers',
  'Armadillio',
  'Sprinkle',
  'Old Settler\''s'
);

-- ============================================================================
-- 4. ADD HELPER FUNCTION FOR COURSE LOOKUP WITH ALIASES
-- ============================================================================

CREATE OR REPLACE FUNCTION find_course_by_name_or_alias(input_name TEXT)
RETURNS TABLE (
  course_id INTEGER,
  course_name TEXT,
  tier INTEGER,
  multiplier DECIMAL(3,2)
) AS $$
BEGIN
  -- Try exact match on course_name first
  RETURN QUERY
  SELECT c.id, c.course_name, c.tier, c.multiplier
  FROM courses c
  WHERE LOWER(c.course_name) = LOWER(input_name)
    AND c.active = true
  LIMIT 1;

  -- If no match, try aliases
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT c.id, c.course_name, c.tier, c.multiplier
    FROM courses c
    JOIN course_aliases ca ON c.id = ca.course_id
    WHERE LOWER(ca.alias) = LOWER(input_name)
      AND c.active = true
    LIMIT 1;
  END IF;

  -- If still no match, try partial match on course_name
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT c.id, c.course_name, c.tier, c.multiplier
    FROM courses c
    WHERE (LOWER(c.course_name) LIKE '%' || LOWER(input_name) || '%'
       OR LOWER(input_name) LIKE '%' || LOWER(c.course_name) || '%')
      AND c.active = true
    ORDER BY LENGTH(c.course_name) ASC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_course_by_name_or_alias IS 'Find course by exact name, alias, or partial match with fallback logic';
