-- Migration 012: Add description column to activity_feed
-- Purpose: Store human-readable notification text for display

ALTER TABLE activity_feed
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add activity_type for new rounds (remove achievement_unlocked)
ALTER TABLE activity_feed
DROP CONSTRAINT IF EXISTS activity_feed_event_type_check;

ALTER TABLE activity_feed
ADD CONSTRAINT activity_feed_event_type_check
CHECK (event_type IN (
  'round_processed',
  'new_round',
  'bet_won',
  'bet_lost',
  'challenge_issued',
  'challenge_accepted',
  'challenge_resolved',
  'advantage_purchased',
  'podcast_generated'
));

-- Add RLS policy for inserting activity feed (backend operations)
DROP POLICY IF EXISTS "Backend can insert activity feed" ON activity_feed;

CREATE POLICY "Backend can insert activity feed"
  ON activity_feed FOR INSERT
  WITH CHECK (true);

-- Comment
COMMENT ON COLUMN activity_feed.description IS 'Human-readable notification text displayed to users';
