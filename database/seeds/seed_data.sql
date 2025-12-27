-- Seed Data for ParSaveables Configuration
-- Purpose: Initialize courses, points systems, and link existing events
-- Date: 2025-10-23

-- ============================================================================
-- 1. SEED POINTS SYSTEMS
-- ============================================================================

-- Season 2025 Points System (Regular Season)
INSERT INTO points_systems (name, config, description) VALUES (
  'Season 2025',
  '{
    "rank_points": {
      "1": 10,
      "2": 7,
      "3": 5,
      "default": 2
    },
    "performance_points": {
      "birdie": 1,
      "eagle": 3,
      "ace": 5
    },
    "tie_breaking": {
      "enabled": true,
      "method": "average"
    },
    "course_multiplier": {
      "enabled": true,
      "source": "course_tier"
    }
  }',
  'Standard season points: Rank-based (10,7,5,2) + Performance bonuses with course multipliers'
) ON CONFLICT (name) DO UPDATE
SET config = EXCLUDED.config, description = EXCLUDED.description;

-- Portlandia 2025 Tournament Points System
INSERT INTO points_systems (name, config, description) VALUES (
  'Portlandia 2025',
  '{
    "rank_points": {
      "1": 15,
      "2": 12,
      "3": 9,
      "4": 7,
      "5": 6,
      "6": 5,
      "7": 3,
      "default": 0
    },
    "performance_points": {
      "birdie": 1,
      "eagle": 5,
      "ace": 10
    },
    "tie_breaking": {
      "enabled": true,
      "method": "average"
    },
    "course_multiplier": {
      "enabled": false,
      "override": 1.0
    }
  }',
  'Tournament points: Extended placement (15,12,9,7,6,5,3) + Enhanced bonuses, no course multiplier'
) ON CONFLICT (name) DO UPDATE
SET config = EXCLUDED.config, description = EXCLUDED.description;

-- ============================================================================
-- 2. SEED COURSES
-- ============================================================================

-- Tier 1: Beginner Courses (1.0x multiplier)
INSERT INTO courses (course_name, tier, multiplier, active) VALUES
  ('Lil G', 1, 1.0, true),
  ('Wells Branch', 1, 1.0, true),
  ('Armadillo Mini', 1, 1.0, true)
ON CONFLICT (course_name) DO UPDATE
SET tier = EXCLUDED.tier, multiplier = EXCLUDED.multiplier, active = EXCLUDED.active;

-- Tier 2: Intermediate Courses (1.5x multiplier)
INSERT INTO courses (course_name, tier, multiplier, active) VALUES
  ('Zilker Park', 2, 1.5, true),
  ('Live Oak', 2, 1.5, true),
  ('Bartholomew Park', 2, 1.5, true),
  ('Live Oak Brewing DGC', 2, 1.5, true),
  ('Liveoak', 2, 1.5, true)  -- Alternate spelling
ON CONFLICT (course_name) DO UPDATE
SET tier = EXCLUDED.tier, multiplier = EXCLUDED.multiplier, active = EXCLUDED.active;

-- Tier 3: Advanced Courses (2.0x multiplier)
INSERT INTO courses (course_name, tier, multiplier, active) VALUES
  ('Northtown Park', 3, 2.0, true),
  ('Northotown', 3, 2.0, true),  -- Alternate spelling
  ('Searight Park', 3, 2.0, true),
  ('Searight', 3, 2.0, true),  -- Short form
  ('MetCenter', 3, 2.0, true),
  ('Met Center', 3, 2.0, true),  -- Alternate spelling
  ('Old Settler\'s', 3, 2.0, true),
  ('Cat Hollow', 3, 2.0, true),
  ('Circle C', 3, 2.0, true),
  ('Williamson County', 3, 2.0, true)
ON CONFLICT (course_name) DO UPDATE
SET tier = EXCLUDED.tier, multiplier = EXCLUDED.multiplier, active = EXCLUDED.active;

-- Tier 4: Expert Courses (2.5x multiplier)
INSERT INTO courses (course_name, tier, multiplier, active) VALUES
  ('East Metro', 4, 2.5, true),
  ('Sprinkle Valley', 4, 2.5, true),
  ('Sprinkle', 4, 2.5, true),  -- Short form
  ('Roy G Guerrero', 4, 2.5, true),
  ('Roy G', 4, 2.5, true),  -- Short form
  ('Bible Ridge', 4, 2.5, true),
  ('Flying Armadillo', 4, 2.5, true),
  ('Armadillo', 4, 2.5, true),  -- Short form (may conflict with Mini)
  ('Harvey Penick', 4, 2.5, true)
ON CONFLICT (course_name) DO UPDATE
SET tier = EXCLUDED.tier, multiplier = EXCLUDED.multiplier, active = EXCLUDED.active;

-- ============================================================================
-- 3. LINK EXISTING EVENTS TO POINTS SYSTEMS
-- ============================================================================

-- Link 2025 Season to Season 2025 points system
UPDATE events
SET points_system_id = (SELECT id FROM points_systems WHERE name = 'Season 2025')
WHERE name = '2025' AND type = 'season';

-- Link Portlandia 2025 Tournament to Portlandia points system
UPDATE events
SET points_system_id = (SELECT id FROM points_systems WHERE name = 'Portlandia 2025')
WHERE name = 'Portlandia 2025' AND type = 'tournament';

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Display points systems
SELECT id, name, description,
       config->>'rank_points' as rank_points,
       config->>'performance_points' as performance_points
FROM points_systems
ORDER BY id;

-- Display courses by tier
SELECT tier, course_name, multiplier, active
FROM courses
ORDER BY tier, course_name;

-- Verify events are linked
SELECT e.id, e.name, e.type, ps.name as points_system_name
FROM events e
LEFT JOIN points_systems ps ON e.points_system_id = ps.id
WHERE e.is_active = true
ORDER BY e.type, e.start_date;

-- Count by tier
SELECT tier, COUNT(*) as course_count
FROM courses
WHERE active = true
GROUP BY tier
ORDER BY tier;
