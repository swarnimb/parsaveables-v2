-- Allow NULL round_id in bets table for "next round" betting
-- Players can place bets on the next round before it's created (roundId = null)
-- These bets will be associated with the round once the scorecard is processed

ALTER TABLE bets
ALTER COLUMN round_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN bets.round_id IS 'Round UUID. NULL for "next round" bets that will be associated when next scorecard is processed.';
