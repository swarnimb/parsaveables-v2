-- ParSaveables v2 - PULP Economy Finalized Migration
-- This migration implements the finalized PULP economy design with bets, challenges, and updated earning mechanisms

-- =============================================================================
-- UPDATE EXISTING TABLES
-- =============================================================================

-- Update default PULP balance from 100 to 40
ALTER TABLE registered_players
ALTER COLUMN pulp_balance SET DEFAULT 40;

-- Add new tracking fields to registered_players
ALTER TABLE registered_players
ADD COLUMN IF NOT EXISTS unique_courses_played JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS participation_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_round_date DATE,
ADD COLUMN IF NOT EXISTS total_rounds_this_season INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_interaction_week INTEGER,
ADD COLUMN IF NOT EXISTS challenges_declined INTEGER DEFAULT 0 NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_registered_players_last_round_date ON registered_players(last_round_date);
CREATE INDEX IF NOT EXISTS idx_registered_players_participation_streak ON registered_players(participation_streak);

-- Add betting_lock_time to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS betting_lock_time TIMESTAMP WITH TIME ZONE;

-- =============================================================================
-- CREATE NEW TABLES
-- =============================================================================

-- Bets Table (structured betting data, separate from rounds.bets JSONB)
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INTEGER REFERENCES registered_players(id) NOT NULL,
  round_id UUID REFERENCES rounds(id) NOT NULL,
  event_id BIGINT REFERENCES events(id) NOT NULL,
  prediction_first TEXT NOT NULL,
  prediction_second TEXT NOT NULL,
  prediction_third TEXT NOT NULL,
  wager_amount INTEGER NOT NULL CHECK (wager_amount >= 20),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'locked', 'won_perfect', 'won_partial', 'lost')),
  payout_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_bets_player_id ON bets(player_id);
CREATE INDEX IF NOT EXISTS idx_bets_round_id ON bets(round_id);
CREATE INDEX IF NOT EXISTS idx_bets_event_id ON bets(event_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);

-- Challenges Table (structured challenge data, separate from rounds.head_to_head_challenge JSONB)
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES rounds(id) NOT NULL,
  challenger_id INTEGER REFERENCES registered_players(id) NOT NULL,
  challenged_id INTEGER REFERENCES registered_players(id) NOT NULL,
  wager_amount INTEGER NOT NULL CHECK (wager_amount >= 20),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'resolved')),
  winner_id INTEGER REFERENCES registered_players(id),
  cowardice_tax_paid INTEGER DEFAULT 0,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_players CHECK (challenger_id != challenged_id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_challenges_round ON challenges(round_id);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);

-- =============================================================================
-- UPDATE PULP TRANSACTION TYPES
-- =============================================================================

-- Drop existing constraint if it exists
ALTER TABLE pulp_transactions
DROP CONSTRAINT IF EXISTS pulp_transactions_transaction_type_check;

-- Add new transaction types for finalized PULP economy
ALTER TABLE pulp_transactions
ADD CONSTRAINT pulp_transactions_transaction_type_check
CHECK (transaction_type IN (
  'round_participation',
  'bet_win_perfect',
  'bet_win_partial',
  'bet_loss',
  'challenge_win',
  'challenge_loss',
  'challenge_rejected_penalty',
  'advantage_purchase',
  'advantage_expired',
  'admin_adjustment',
  'streak_bonus',
  'beat_higher_ranked',
  'drs_bonus',
  'weekly_interaction',
  'season_reset'
));

-- =============================================================================
-- UPDATE ADVANTAGE CATALOG WITH FINALIZED PRICES
-- =============================================================================

-- Delete old advantage catalog entries
DELETE FROM advantage_catalog;

-- Insert finalized advantage catalog with new prices
INSERT INTO advantage_catalog (advantage_key, name, description, icon, pulp_cost, expiration_hours) VALUES
('mulligan', 'Mulligan', 'Extra mulligan for the round', 'RotateCcw', 120, 24),
('anti_mulligan', 'Anti-Mulligan', 'Force any player to re-shoot once', 'Ban', 200, 24),
('cancel', 'Cancel', 'Cancel the last mulligan or anti-mulligan used', 'X', 200, 24),
('bag_trump', 'Bag Trump', 'Change bag-carry decision for one hole', 'Backpack', 100, 24),
('shotgun_buddy', 'Shotgun Buddy', 'Make someone shotgun a beer with you once', 'Beer', 100, 24);

-- =============================================================================
-- ROW-LEVEL SECURITY POLICIES FOR NEW TABLES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Bets policies
CREATE POLICY "Users can view all bets"
  ON bets FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own bets"
  ON bets FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

-- Challenges policies
CREATE POLICY "Users can view all challenges"
  ON challenges FOR SELECT
  USING (true);

CREATE POLICY "Users can create challenges where they are the challenger"
  ON challenges FOR INSERT
  WITH CHECK (
    challenger_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Challenged users can update challenge status"
  ON challenges FOR UPDATE
  USING (
    challenged_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTIONS FOR PULP ECONOMY
-- =============================================================================

-- Function to get current ISO week number (for weekly interaction tracking)
CREATE OR REPLACE FUNCTION get_iso_week()
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(WEEK FROM NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to reset PULP balances for new season (run on Jan 1)
CREATE OR REPLACE FUNCTION reset_season_pulps()
RETURNS void AS $$
BEGIN
  -- Log all current balances as season_reset transactions
  INSERT INTO pulp_transactions (player_id, amount, transaction_type, description)
  SELECT
    id,
    -pulp_balance,
    'season_reset',
    'Season reset - balance cleared for new season'
  FROM registered_players
  WHERE pulp_balance > 0;

  -- Reset all balances to 40
  UPDATE registered_players
  SET pulp_balance = 40,
      participation_streak = 0,
      total_rounds_this_season = 0,
      unique_courses_played = '[]'::jsonb,
      last_interaction_week = NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE bets IS 'Structured betting data for PULP economy - predict top 3 finishers';
COMMENT ON TABLE challenges IS 'Head-to-head challenges between players for PULP wagers';

COMMENT ON COLUMN registered_players.unique_courses_played IS 'Array of course names played this season (for Course Explorer bonus)';
COMMENT ON COLUMN registered_players.participation_streak IS 'Counter for consecutive weeks played (resets after 4 weeks or miss)';
COMMENT ON COLUMN registered_players.last_round_date IS 'Date of last round played (for streak tracking)';
COMMENT ON COLUMN registered_players.total_rounds_this_season IS 'Total rounds played this season (for milestone bonuses)';
COMMENT ON COLUMN registered_players.last_interaction_week IS 'ISO week number of last PULP economy interaction (for weekly interaction bonus)';
COMMENT ON COLUMN registered_players.challenges_declined IS 'Total challenges declined this season';

COMMENT ON COLUMN events.betting_lock_time IS 'Timestamp when betting closes (15 mins after round start time)';

COMMENT ON COLUMN bets.status IS 'pending: not yet resolved, locked: betting closed, won_perfect: all 3 correct in order (2x payout), won_partial: right 3 wrong order (1x payout), lost: incorrect prediction';
COMMENT ON COLUMN bets.payout_amount IS 'Amount of PULPs won (0 if lost)';

COMMENT ON COLUMN challenges.status IS 'pending: awaiting response, accepted: both players committed, rejected: challengee declined (pays cowardice tax), resolved: round complete, winner determined';
COMMENT ON COLUMN challenges.cowardice_tax_paid IS 'Amount paid by challengee for rejecting (50% of wager_amount)';
COMMENT ON COLUMN challenges.winner_id IS 'Player who finished higher in the round (NULL until resolved)';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Update pulp_balance for existing players (if any) to match new default
UPDATE registered_players
SET pulp_balance = 40
WHERE pulp_balance = 100;
