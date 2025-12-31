-- Add foreign key constraint for player_rounds -> registered_players relationship
-- This allows Supabase to understand the relationship for JOIN queries

-- First, ensure player_id column exists (it should from original schema)
-- If it doesn't exist, this will create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_rounds' AND column_name = 'player_id'
  ) THEN
    ALTER TABLE player_rounds
    ADD COLUMN player_id INTEGER;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'player_rounds_player_id_fkey'
  ) THEN
    ALTER TABLE player_rounds
    ADD CONSTRAINT player_rounds_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES registered_players(id);
  END IF;
END $$;

-- Create index for better JOIN performance
CREATE INDEX IF NOT EXISTS idx_player_rounds_player_id ON player_rounds(player_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT player_rounds_player_id_fkey ON player_rounds IS 'Foreign key to registered_players for gamification queries';
