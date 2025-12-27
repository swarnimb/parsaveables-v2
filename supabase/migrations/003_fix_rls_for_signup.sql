-- Ensure unauthenticated users can view unclaimed players for sign-up dropdown
-- Drop existing policy and recreate to ensure it works for anon users

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON registered_players;

CREATE POLICY "Allow public read access to registered_players"
  ON registered_players
  FOR SELECT
  TO anon, authenticated
  USING (true);
