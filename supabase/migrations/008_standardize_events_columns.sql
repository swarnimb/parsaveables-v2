-- Migration 008: Standardize Events Table Column Names
-- Purpose: Ensure events table uses 'name' and 'type' (not event_name/event_type)
-- Date: 2025-12-31

-- ============================================================================
-- Check if old column names exist and rename them
-- ============================================================================

-- Only rename if event_name exists (graceful handling)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'event_name'
    ) THEN
        ALTER TABLE events RENAME COLUMN event_name TO name;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'event_type'
    ) THEN
        ALTER TABLE events RENAME COLUMN event_type TO type;
    END IF;
END $$;

-- ============================================================================
-- Ensure status column exists (used by Admin Control Center)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'events' AND column_name = 'status'
    ) THEN
        -- Add status column (upcoming, active, completed)
        ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'upcoming';

        -- Set status based on existing is_active flag
        UPDATE events SET status = 'active' WHERE is_active = true;
        UPDATE events SET status = 'completed' WHERE is_active = false AND end_date < CURRENT_DATE;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE events IS 'Events (seasons and tournaments) with columns:
- name: Event name
- type: Event type (season/tournament)
- status: Event status (upcoming/active/completed)
- start_date, end_date: Date range
- points_system_id: Reference to points_systems table';
