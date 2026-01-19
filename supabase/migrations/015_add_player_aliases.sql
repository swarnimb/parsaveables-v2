-- Migration 015: Add Player Aliases
-- Purpose: Allow multiple name variations to match to a single player
-- Date: 2026-01-19

-- ============================================================================
-- 1. ADD ALIASES COLUMN TO REGISTERED_PLAYERS
-- ============================================================================

ALTER TABLE registered_players
ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN registered_players.aliases IS 'Array of alternate names for matching (e.g., ["bird bird basket", "Bird", "EdgarGalindo"])';

-- ============================================================================
-- 2. CREATE INDEX FOR ALIAS LOOKUPS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_registered_players_aliases
ON registered_players USING GIN (aliases);

-- ============================================================================
-- 3. ADD HELPER FUNCTION FOR PLAYER LOOKUP BY ALIAS
-- ============================================================================

CREATE OR REPLACE FUNCTION find_player_by_alias(input_name TEXT)
RETURNS TABLE (
  player_id INTEGER,
  player_name TEXT,
  aliases JSONB
) AS $$
BEGIN
  -- Check if input_name exists in any player's aliases array
  RETURN QUERY
  SELECT rp.id, rp.player_name, rp.aliases
  FROM registered_players rp
  WHERE rp.aliases @> to_jsonb(input_name)
    AND rp.status = 'active'
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_player_by_alias IS 'Find player by checking if input name exists in their aliases array';
