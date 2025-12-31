-- Migration 011: Clear all PULP activity and transaction data
-- Purpose: Reset activity feed and PULP-related data to clean state

-- Clear all activity feed entries
DELETE FROM activity_feed;

-- Clear all PULP transaction logs
DELETE FROM pulp_transactions;

-- Reset PULP balances, achievements, and advantages for all players
UPDATE registered_players
SET
  pulp_balance = 100,
  achievements = '[]'::jsonb,
  active_advantages = '[]'::jsonb,
  last_challenge_date = NULL;

-- Comment
COMMENT ON TABLE activity_feed IS 'Activity feed cleared - ready for fresh PULP economy data';
COMMENT ON TABLE pulp_transactions IS 'Transaction history cleared - ready for fresh PULP economy data';
