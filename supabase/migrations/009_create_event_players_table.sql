-- Migration 009: Create event_players junction table
-- Purpose: Track which players are participating in which events

-- Create event_players table
CREATE TABLE IF NOT EXISTS event_players (
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES registered_players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (event_id, player_id)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_players_event_id ON event_players(event_id);
CREATE INDEX IF NOT EXISTS idx_event_players_player_id ON event_players(player_id);

-- Enable Row Level Security
ALTER TABLE event_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Event players are viewable by everyone
CREATE POLICY "Event players are viewable by everyone"
  ON event_players FOR SELECT
  USING (true);

-- Comment
COMMENT ON TABLE event_players IS 'Junction table linking players to events they are participating in';
