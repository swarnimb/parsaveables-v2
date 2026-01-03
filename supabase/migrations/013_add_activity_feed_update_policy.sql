-- Migration 013: Add UPDATE policy for activity_feed
-- Purpose: Allow users to mark their own notifications as read

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can update their own notifications" ON activity_feed;

-- Create policy to allow users to update their own notifications
CREATE POLICY "Users can update their own notifications"
  ON activity_feed FOR UPDATE
  USING (
    player_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    player_id IN (
      SELECT id FROM registered_players WHERE user_id = auth.uid()
    )
  );

-- Comment
COMMENT ON TABLE activity_feed IS 'Activity feed for player notifications. Users can mark their own notifications as read.';
