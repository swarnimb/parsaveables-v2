-- Migration 016: PULPy Window Economy Rework
-- Purpose: Replace admin-controlled betting lock with player-opened 5-minute PULPy windows.
--          Renames bets→blessings, adds window_id to blessings+challenges,
--          adds waiting challenge state, removes deprecated advantages/bonuses,
--          resets all balances to 20 PULPs, wipes existing economy data.
-- Date: 2026-02-26

-- ============================================================================
-- 1. CREATE pulpy_windows TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS pulpy_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_by INTEGER NOT NULL REFERENCES registered_players(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closes_at TIMESTAMPTZ NOT NULL,        -- opened_at + 5 minutes
  locked_at TIMESTAMPTZ,                 -- set when auto-lock triggers
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'locked', 'settled', 'expired')),
  settled_by_round_id UUID REFERENCES rounds(id),
  settled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ                 -- locked_at + 15 days (for expiry check)
);

CREATE INDEX IF NOT EXISTS idx_pulpy_windows_status ON pulpy_windows(status);
CREATE INDEX IF NOT EXISTS idx_pulpy_windows_opened_at ON pulpy_windows(opened_at);
CREATE INDEX IF NOT EXISTS idx_pulpy_windows_locked_at ON pulpy_windows(locked_at);

COMMENT ON TABLE pulpy_windows IS 'Player-opened 5-minute PULP economy windows. All transactions (blessings, challenges, advantages) require an open window.';
COMMENT ON COLUMN pulpy_windows.closes_at IS 'opened_at + 5 minutes — window auto-locks at this time';
COMMENT ON COLUMN pulpy_windows.locked_at IS 'When the window auto-locked (closed). Set when status moves open→locked.';
COMMENT ON COLUMN pulpy_windows.expires_at IS 'locked_at + 15 days — if no matching scorecard by this time, window expires and all wagers are refunded.';
COMMENT ON COLUMN pulpy_windows.settled_by_round_id IS 'The round that resolved this window (NULL until settled).';

-- ============================================================================
-- 2. WIPE ALL EXISTING ECONOMY DATA (reset for launch)
-- ============================================================================

-- Clear existing bets (will be renamed to blessings) and challenges
DELETE FROM bets;
DELETE FROM challenges;
DELETE FROM pulp_transactions;

-- Clear economy-related activity feed entries
DELETE FROM activity_feed
WHERE event_type IN ('bet_placed', 'challenge_issued', 'challenge_accepted', 'challenge_rejected', 'advantage_purchased');

-- Reset ALL player PULP balances to 20
UPDATE registered_players SET pulp_balance = 20;

-- ============================================================================
-- 3. RENAME bets → blessings AND ADD window_id
-- ============================================================================

-- Drop existing indexes and policies before rename
DROP INDEX IF EXISTS idx_bets_player_id;
DROP INDEX IF EXISTS idx_bets_round_id;
DROP INDEX IF EXISTS idx_bets_event_id;
DROP INDEX IF EXISTS idx_bets_status;

-- Rename table
ALTER TABLE bets RENAME TO blessings;

-- Rename existing sequences/constraints if needed
ALTER TABLE blessings RENAME CONSTRAINT bets_player_id_fkey TO blessings_player_id_fkey;
ALTER TABLE blessings RENAME CONSTRAINT bets_round_id_fkey TO blessings_round_id_fkey;
ALTER TABLE blessings RENAME CONSTRAINT bets_event_id_fkey TO blessings_event_id_fkey;
ALTER TABLE blessings RENAME CONSTRAINT bets_wager_amount_check TO blessings_wager_amount_check;

-- Update status constraint to use new names (same values but rename constraint)
ALTER TABLE blessings DROP CONSTRAINT IF EXISTS bets_status_check;
ALTER TABLE blessings ADD CONSTRAINT blessings_status_check
  CHECK (status IN ('pending', 'locked', 'won_perfect', 'won_partial', 'lost'));

-- Add window_id column
ALTER TABLE blessings
  ADD COLUMN IF NOT EXISTS window_id UUID REFERENCES pulpy_windows(id);

-- Make round_id nullable (it's now populated at settlement, not at placement)
ALTER TABLE blessings ALTER COLUMN round_id DROP NOT NULL;

-- Recreate indexes under new name
CREATE INDEX IF NOT EXISTS idx_blessings_player_id ON blessings(player_id);
CREATE INDEX IF NOT EXISTS idx_blessings_round_id ON blessings(round_id);
CREATE INDEX IF NOT EXISTS idx_blessings_event_id ON blessings(event_id);
CREATE INDEX IF NOT EXISTS idx_blessings_status ON blessings(status);
CREATE INDEX IF NOT EXISTS idx_blessings_window_id ON blessings(window_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view all bets" ON blessings;
DROP POLICY IF EXISTS "Users can create their own bets" ON blessings;

CREATE POLICY "Users can view their own blessings"
  ON blessings FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own blessings"
  ON blessings FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

COMMENT ON TABLE blessings IS 'Player blessings (formerly bets) — predict top 3 finishers during an open PULPy window.';
COMMENT ON COLUMN blessings.window_id IS 'The PULPy window this blessing belongs to.';
COMMENT ON COLUMN blessings.round_id IS 'Populated at settlement — the round that resolved this blessing (NULL until window settles).';

-- ============================================================================
-- 4. ALTER challenges — ADD window_id, ADD waiting STATUS
-- ============================================================================

-- Drop existing status constraint
ALTER TABLE challenges DROP CONSTRAINT IF EXISTS challenges_status_check;

-- Add new constraint with 'waiting' status
ALTER TABLE challenges ADD CONSTRAINT challenges_status_check
  CHECK (status IN ('waiting', 'pending', 'accepted', 'declined', 'rejected', 'resolved', 'expired_no_response', 'cancelled_waitlist'));

-- Add window_id column
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS window_id UUID REFERENCES pulpy_windows(id);

-- Make round_id nullable (populated at settlement)
ALTER TABLE challenges ALTER COLUMN round_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_challenges_window_id ON challenges(window_id);

COMMENT ON COLUMN challenges.window_id IS 'The PULPy window this challenge belongs to.';
COMMENT ON COLUMN challenges.round_id IS 'Populated at settlement — the round that resolved this challenge.';
COMMENT ON COLUMN challenges.status IS 'waiting: in waitlist (no PULPs deducted), pending: awaiting response (challenger PULPs deducted), accepted: both committed, declined: challengee paid 50% burn + challenger refunded, resolved: round complete, expired_no_response: window closed with no response (both 50% burned), cancelled_waitlist: window closed while waiting (challenger refunded)';

-- ============================================================================
-- 5. UPDATE advantage_catalog — REMOVE Anti-Mulligan + Cancel, UPDATE PRICES
-- ============================================================================

DELETE FROM advantage_catalog WHERE advantage_key IN ('anti_mulligan', 'cancel');

UPDATE advantage_catalog
SET
  pulp_cost = 150,
  description = 'Re-throw any one shot without consequence. Use it during the round — no questions asked.',
  expiration_hours = 24
WHERE advantage_key = 'mulligan';

UPDATE advantage_catalog
SET
  pulp_cost = 80,
  description = 'Veto who carries the bag on the next hole. Point and decree.',
  expiration_hours = 24
WHERE advantage_key = 'bag_trump';

UPDATE advantage_catalog
SET
  pulp_cost = 80,
  description = 'Point to anyone on the course — they shotgun a beer with you on the spot.',
  expiration_hours = 24
WHERE advantage_key = 'shotgun_buddy';

-- ============================================================================
-- 6. UPDATE pulp_transactions CONSTRAINT — ADD new types, REMOVE old ones
-- ============================================================================

ALTER TABLE pulp_transactions
DROP CONSTRAINT IF EXISTS pulp_transactions_transaction_type_check;

ALTER TABLE pulp_transactions
ADD CONSTRAINT pulp_transactions_transaction_type_check
CHECK (transaction_type IN (
  -- Earning types (kept)
  'round_participation',
  'beat_higher_ranked',
  'drs_bonus',
  -- Blessing outcomes
  'blessing_win_perfect',
  'blessing_win_partial',
  'blessing_loss',
  -- Challenge outcomes
  'challenge_win',
  'challenge_loss',
  'challenge_rejected_penalty',
  -- New refund / burn types
  'window_expired_refund',
  'challenge_timeout_burn',
  'challenge_declined_burn',
  -- Advantage types
  'advantage_purchase',
  'advantage_expired',
  -- Admin / system
  'admin_adjustment',
  'season_reset',
  -- Legacy (keep so old transaction records don't break)
  'bet_win_perfect',
  'bet_win_partial'
));

-- ============================================================================
-- 7. REMOVE DEPRECATED COLUMNS FROM registered_players
-- ============================================================================

ALTER TABLE registered_players
  DROP COLUMN IF EXISTS last_interaction_week,
  DROP COLUMN IF EXISTS participation_streak,
  DROP COLUMN IF EXISTS last_round_date;

-- ============================================================================
-- 8. REMOVE DEPRECATED COLUMN FROM events
-- ============================================================================

ALTER TABLE events
  DROP COLUMN IF EXISTS betting_lock_time;

-- ============================================================================
-- 9. RLS POLICIES FOR pulpy_windows
-- ============================================================================

ALTER TABLE pulpy_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view windows"
  ON pulpy_windows FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated players can open windows"
  ON pulpy_windows FOR INSERT
  WITH CHECK (
    opened_by IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON COLUMN registered_players.pulp_balance IS 'Current PULP balance. Reset to 20 on 2026-02-26 launch.';
