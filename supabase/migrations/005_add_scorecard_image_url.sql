-- Add scorecard_image_url column to rounds table

ALTER TABLE rounds
ADD COLUMN IF NOT EXISTS scorecard_image_url TEXT;

COMMENT ON COLUMN rounds.scorecard_image_url IS 'URL to scorecard image in Supabase Storage or external source';
