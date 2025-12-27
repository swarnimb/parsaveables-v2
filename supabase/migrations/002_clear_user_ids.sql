-- Clear existing user_id values to allow players to claim their profiles
-- The existing user_id values are from v1 and don't match Supabase Auth UUIDs

UPDATE registered_players
SET user_id = NULL;

-- Verify the update
-- You should see all user_id values are now NULL
SELECT COUNT(*) as total_players,
       COUNT(user_id) as claimed_players,
       COUNT(*) - COUNT(user_id) as unclaimed_players
FROM registered_players;
