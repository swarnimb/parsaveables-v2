-- Migration 014: Add Tutorial Tracking Columns
-- Purpose: Track onboarding completion and betting interest for tutorial system

-- Add tutorial tracking columns to registered_players table
ALTER TABLE registered_players
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS betting_interest_shown BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS betting_interest_confirmed BOOLEAN DEFAULT FALSE;

-- Comment
COMMENT ON COLUMN registered_players.onboarding_completed IS 'Whether user has completed the 7-screen onboarding tutorial';
COMMENT ON COLUMN registered_players.betting_interest_shown IS 'Whether user has been shown the betting tutorial';
COMMENT ON COLUMN registered_players.betting_interest_confirmed IS 'Whether user confirmed interest in betting feature';
