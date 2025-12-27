-- ParSaveables v2 - PULP Economy Migration
-- This migration extends existing tables and creates new tables for the PULP economy system

-- =============================================================================
-- EXTEND EXISTING TABLES
-- =============================================================================

-- Extend registered_players table
ALTER TABLE registered_players
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS pulp_balance INTEGER DEFAULT 100 NOT NULL,
ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS active_advantages JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS last_challenge_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for faster user_id lookups
CREATE INDEX IF NOT EXISTS idx_registered_players_user_id ON registered_players(user_id);

-- Extend events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS betting_status TEXT DEFAULT 'open' CHECK (betting_status IN ('open', 'locked', 'resolved'));

-- Extend rounds table
ALTER TABLE rounds
ADD COLUMN IF NOT EXISTS bets JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS head_to_head_challenge JSONB,
ADD COLUMN IF NOT EXISTS advantages_used JSONB DEFAULT '[]'::jsonb NOT NULL;

-- =============================================================================
-- CREATE NEW TABLES
-- =============================================================================

-- Achievement Definitions Table
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('winning', 'losing', 'milestone', 'special')),
  pulp_reward INTEGER NOT NULL DEFAULT 0,
  trigger_condition JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Advantage Catalog Table
CREATE TABLE IF NOT EXISTS advantage_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advantage_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  pulp_cost INTEGER NOT NULL,
  expiration_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Feed Table (for notifications and community feed)
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INTEGER REFERENCES registered_players(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('round_processed', 'achievement_unlocked', 'bet_won', 'bet_lost', 'challenge_issued', 'challenge_accepted', 'challenge_resolved', 'advantage_purchased', 'podcast_generated')),
  event_data JSONB NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_player_id ON activity_feed(player_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);

-- PULP Transaction Log (for transparency and debugging)
CREATE TABLE IF NOT EXISTS pulp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id INTEGER REFERENCES registered_players(id),
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('achievement', 'bet_win', 'bet_loss', 'challenge_win', 'challenge_loss', 'advantage_purchase', 'admin_adjustment')),
  description TEXT,
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulp_transactions_player_id ON pulp_transactions(player_id);

-- =============================================================================
-- SEED ACHIEVEMENT DEFINITIONS
-- =============================================================================

INSERT INTO achievement_definitions (achievement_key, name, description, icon, category, pulp_reward, trigger_condition) VALUES
-- Winning Achievements
('first_blood', 'First Blood', 'Win your first round of the season', 'Trophy', 'winning', 50, '{"type": "round_win", "count": 1}'),
('hat_trick', 'Hat Trick', 'Win 3 rounds in a row', 'Flame', 'winning', 100, '{"type": "consecutive_wins", "count": 3}'),
('ace_king', 'Ace King', 'Record an ace', 'Target', 'winning', 75, '{"type": "ace", "count": 1}'),
('birdie_blitz', 'Birdie Blitz', 'Record 10+ birdies in a single round', 'Bird', 'winning', 60, '{"type": "birdies_in_round", "min": 10}'),
('season_champion', 'Season Champion', 'Finish #1 on the leaderboard', 'Crown', 'winning', 200, '{"type": "season_rank", "rank": 1}'),

-- Losing Achievements (engagement for all skill levels)
('rough_start', 'Rough Start', 'Finish last in your first round', 'Frown', 'losing', 25, '{"type": "last_place", "count": 1}'),
('tree_magnet', 'Tree Magnet', 'Hit a tree on every hole', 'Trees', 'losing', 30, '{"type": "tree_hits", "min": 18}'),
('water_boy', 'Water Boy', 'Land in water 5+ times in one round', 'Droplet', 'losing', 35, '{"type": "water_hazards", "min": 5}'),
('bogey_train', 'Bogey Train', 'Record 10+ bogeys in a single round', 'TrendingDown', 'losing', 40, '{"type": "bogeys_in_round", "min": 10}'),
('comeback_kid', 'Comeback Kid', 'Finish last, then win the next round', 'Rocket', 'losing', 80, '{"type": "last_to_first", "sequential": true}'),

-- Milestone Achievements
('veteran', 'Veteran', 'Play 10 rounds in a season', 'Calendar', 'milestone', 50, '{"type": "rounds_played", "count": 10}'),
('iron_man', 'Iron Man', 'Play every round in a season without missing', 'Shield', 'milestone', 100, '{"type": "perfect_attendance", "season": true}'),
('bet_master', 'Bet Master', 'Win 5 bets in a season', 'Coins', 'milestone', 75, '{"type": "bets_won", "count": 5}'),
('challenger', 'Challenger', 'Win a head-to-head challenge', 'Swords', 'milestone', 90, '{"type": "challenge_win", "count": 1}'),
('social_butterfly', 'Social Butterfly', 'Unlock 10 achievements', 'Sparkles', 'milestone', 150, '{"type": "achievements_unlocked", "count": 10}');

-- =============================================================================
-- SEED ADVANTAGE CATALOG
-- =============================================================================

INSERT INTO advantage_catalog (advantage_key, name, description, icon, pulp_cost, expiration_hours) VALUES
('mulligan', 'Mulligan', 'Replay one hole with the better score', 'RotateCcw', 50, 24),
('anti_mulligan', 'Anti-Mulligan', 'Force an opponent to replay their best hole', 'Ban', 75, 24),
('free_beer', 'Free Beer', 'Force an opponent to drink (social penalty)', 'Beer', 30, 24),
('score_boost', 'Score Boost', 'Subtract 2 strokes from your total score', 'TrendingUp', 100, 24),
('odds_peek', 'Odds Peek', 'See betting odds before placing your bet', 'Eye', 40, 24);

-- =============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE registered_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advantage_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulp_transactions ENABLE ROW LEVEL SECURITY;

-- registered_players policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON registered_players FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON registered_players FOR UPDATE
  USING (auth.uid() = user_id);

-- events policies
CREATE POLICY "Events are viewable by everyone"
  ON events FOR SELECT
  USING (true);

-- rounds policies
CREATE POLICY "Rounds are viewable by everyone"
  ON rounds FOR SELECT
  USING (true);

-- achievement_definitions policies (read-only for users)
CREATE POLICY "Achievements are viewable by everyone"
  ON achievement_definitions FOR SELECT
  USING (true);

-- advantage_catalog policies (read-only for users)
CREATE POLICY "Advantages are viewable by everyone"
  ON advantage_catalog FOR SELECT
  USING (true);

-- activity_feed policies
CREATE POLICY "Users can view their own activity feed"
  ON activity_feed FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Activity feed is viewable by everyone for community tab"
  ON activity_feed FOR SELECT
  USING (true);

-- pulp_transactions policies
CREATE POLICY "Users can view their own transactions"
  ON pulp_transactions FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for registered_players
DROP TRIGGER IF EXISTS update_registered_players_updated_at ON registered_players;
CREATE TRIGGER update_registered_players_updated_at
  BEFORE UPDATE ON registered_players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE achievement_definitions IS 'Defines all possible achievements players can unlock';
COMMENT ON TABLE advantage_catalog IS 'Defines all purchasable advantages in the PULP shop';
COMMENT ON TABLE activity_feed IS 'Stores all player activities for individual and community feeds';
COMMENT ON TABLE pulp_transactions IS 'Logs all PULP balance changes for transparency';

COMMENT ON COLUMN registered_players.pulp_balance IS 'Current PULP balance (starts at 100)';
COMMENT ON COLUMN registered_players.achievements IS 'Array of unlocked achievement IDs with timestamps';
COMMENT ON COLUMN registered_players.active_advantages IS 'Array of purchased advantages with purchase timestamp and expiration';
COMMENT ON COLUMN registered_players.last_challenge_date IS 'Last date player issued a head-to-head challenge (3-month cooldown)';
