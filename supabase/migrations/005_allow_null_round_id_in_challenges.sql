-- Allow NULL round_id in challenges table for "next round" challenges
-- Players can issue challenges for the next round before it's created (roundId = null)
-- These challenges will be associated with the round when the scorecard is processed

ALTER TABLE challenges
ALTER COLUMN round_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN challenges.round_id IS 'Round UUID. NULL for "next round" challenges that will be associated when next scorecard is processed.';
