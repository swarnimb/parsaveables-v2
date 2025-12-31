-- Migration 010: Add INSERT, UPDATE, DELETE policies for event_players
-- Purpose: Allow admin operations on event_players table

-- Allow anyone to insert event_players (Control Center is password-protected)
CREATE POLICY "Anyone can insert event players"
  ON event_players FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update event_players
CREATE POLICY "Anyone can update event players"
  ON event_players FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow anyone to delete event_players
CREATE POLICY "Anyone can delete event players"
  ON event_players FOR DELETE
  USING (true);

-- Comment
COMMENT ON TABLE event_players IS 'Junction table linking players to events. Access controlled by password-protected Control Center.';
