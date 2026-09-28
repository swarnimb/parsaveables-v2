-- Migration 017: Add Most Birdies Points
-- Purpose: Store the "most birdies" performance bonus as its own breakdown column
-- Date: 2026-09-27

ALTER TABLE player_rounds
ADD COLUMN IF NOT EXISTS most_birdies_points NUMERIC(5, 2) DEFAULT 0;

COMMENT ON COLUMN player_rounds.most_birdies_points IS 'Bonus for the sole birdie leader of the round (ties award nothing), before course multiplier';
