-- Migration 007: Update Points Systems Structure for Admin Control Center
-- Purpose: Modernize tie_breaking and add most_birdies bonus
-- Date: 2025-12-31

-- ============================================================================
-- PART 1: Add most_birdies to performance_points
-- ============================================================================

-- Update Season 2025
UPDATE points_systems
SET config = jsonb_set(
  config,
  '{performance_points,most_birdies}',
  '0'::jsonb
)
WHERE name = 'Season 2025';

-- Update Portlandia 2025
UPDATE points_systems
SET config = jsonb_set(
  config,
  '{performance_points,most_birdies}',
  '0'::jsonb
)
WHERE name = 'Portlandia 2025';

-- ============================================================================
-- PART 2: Update tie_breaking structure
-- ============================================================================

-- Update Season 2025 - Change from {enabled, method} to {priority: [...]}
UPDATE points_systems
SET config = jsonb_set(
  config - 'tie_breaking',
  '{tie_breaking}',
  '{
    "priority": ["aces", "eagles", "birdies", "earliest_birdie"]
  }'::jsonb
)
WHERE name = 'Season 2025';

-- Update Portlandia 2025 - Change from {enabled, method} to {priority: [...]}
UPDATE points_systems
SET config = jsonb_set(
  config - 'tie_breaking',
  '{tie_breaking}',
  '{
    "priority": ["aces", "eagles", "birdies", "earliest_birdie"]
  }'::jsonb
)
WHERE name = 'Portlandia 2025';

-- ============================================================================
-- PART 3: Update any future points systems that get added
-- ============================================================================

-- Note: New points systems created through Admin Control Center will use the new structure
-- This migration only updates existing systems

COMMENT ON TABLE points_systems IS 'Points systems with config structure:
{
  "rank_points": {"1": 10, "2": 7, "default": 2},
  "performance_points": {"birdie": 1, "eagle": 3, "ace": 5, "most_birdies": 20},
  "tie_breaking": {"priority": ["aces", "eagles", "birdies", "earliest_birdie"]},
  "course_multiplier": {"enabled": true, "source": "course_tier"}
}';
