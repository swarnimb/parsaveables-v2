-- Add metadata column to pulp_transactions for flexible data storage
-- This allows storing additional context like round_id, event_id, bet_id, etc.

ALTER TABLE pulp_transactions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_pulp_transactions_metadata ON pulp_transactions USING gin(metadata);

-- Add comment for documentation
COMMENT ON COLUMN pulp_transactions.metadata IS 'Flexible JSONB storage for transaction context (round_id, event_id, bet_id, challenge_id, etc.)';

-- Update transaction_type CHECK constraint to include all types used in the application
ALTER TABLE pulp_transactions
DROP CONSTRAINT IF EXISTS pulp_transactions_transaction_type_check;

ALTER TABLE pulp_transactions
ADD CONSTRAINT pulp_transactions_transaction_type_check
CHECK (transaction_type IN (
  'achievement',
  'bet_win',
  'bet_loss',
  'bet_win_perfect',
  'bet_win_partial',
  'challenge_win',
  'challenge_loss',
  'challenge_rejected_penalty',
  'advantage_purchase',
  'advantage_expired',
  'admin_adjustment',
  'round_participation',
  'beat_higher_ranked',
  'drs_bonus',
  'streak_bonus',
  'weekly_interaction'
));
