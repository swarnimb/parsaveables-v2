-- Migration 007: Podcast System
-- Purpose: Create tables for automated podcast generation
-- Date: 2025-12-30

-- ============================================================================
-- 1. CREATE PODCAST_EPISODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS podcast_episodes (
  id BIGSERIAL PRIMARY KEY,
  episode_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  episode_type TEXT NOT NULL CHECK (episode_type IN ('monthly_recap', 'season_recap', 'special')),
  audio_url TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_podcast_episodes_number ON podcast_episodes(episode_number DESC);
CREATE INDEX idx_podcast_episodes_published ON podcast_episodes(is_published, published_at DESC);

COMMENT ON TABLE podcast_episodes IS 'Stores podcast episode metadata and audio file references';
COMMENT ON COLUMN podcast_episodes.episode_number IS 'Sequential episode number (1, 2, 3, ...)';
COMMENT ON COLUMN podcast_episodes.period_start IS 'Start date of rounds covered in this episode';
COMMENT ON COLUMN podcast_episodes.period_end IS 'End date of rounds covered in this episode';
COMMENT ON COLUMN podcast_episodes.audio_url IS 'Public URL to audio file in Supabase Storage';

-- ============================================================================
-- 2. CREATE PODCAST_GENERATION_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS podcast_generation_logs (
  id BIGSERIAL PRIMARY KEY,
  episode_id BIGINT REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_podcast_logs_episode ON podcast_generation_logs(episode_id);
CREATE INDEX idx_podcast_logs_stage ON podcast_generation_logs(stage, started_at DESC);

COMMENT ON TABLE podcast_generation_logs IS 'Tracks podcast generation process stages for debugging';
COMMENT ON COLUMN podcast_generation_logs.stage IS 'Generation stage: fetch_data, generate_script, generate_audio, upload, publish';
COMMENT ON COLUMN podcast_generation_logs.metadata IS 'Stage-specific metadata (data fetched, tokens used, file size, etc.)';

-- ============================================================================
-- 3. INSERT EXISTING EPISODE (if not already present)
-- ============================================================================

-- Insert the first episode that's already in storage
INSERT INTO podcast_episodes (
  episode_number,
  title,
  description,
  period_start,
  period_end,
  episode_type,
  audio_url,
  is_published,
  published_at
) VALUES (
  1,
  'The Ruckus so far',
  'A recap of the season so far with highlights, rivalries, and unforgettable moments.',
  '2025-01-01',
  '2025-12-31',
  'season_recap',
  'https://bcovevbtcdsgzbrieiin.supabase.co/storage/v1/object/public/podcast-episodes/ParSaveables-EP01.mp3',
  true,
  NOW()
) ON CONFLICT (episode_number) DO NOTHING;

-- ============================================================================
-- 4. RLS POLICIES (Public Read, Admin Write)
-- ============================================================================

ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_generation_logs ENABLE ROW LEVEL SECURITY;

-- Anyone can read published episodes
CREATE POLICY "Public can read published episodes"
  ON podcast_episodes
  FOR SELECT
  USING (is_published = true);

-- Authenticated users can read all episodes (for admin preview)
CREATE POLICY "Authenticated users can read all episodes"
  ON podcast_episodes
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (for API endpoints)
CREATE POLICY "Service role full access to episodes"
  ON podcast_episodes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access to logs"
  ON podcast_generation_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
