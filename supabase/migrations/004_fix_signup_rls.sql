-- Fix RLS policy to allow users to claim unclaimed players during signup

DROP POLICY IF EXISTS "Users can update their own profile" ON registered_players;

-- Allow users to update their own profile OR claim an unclaimed player
CREATE POLICY "Users can update their profile or claim unclaimed players"
  ON registered_players
  FOR UPDATE
  USING (
    auth.uid() = user_id  -- Can update own profile
    OR
    user_id IS NULL       -- Can claim unclaimed players
  );
