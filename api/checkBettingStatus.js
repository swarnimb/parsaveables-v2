import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

/**
 * Quick debug endpoint to check betting lock status
 * GET /api/checkBettingStatus
 */
export default async function handler(req, res) {
  try {
    // Fetch all events with their betting lock status
    const { data: allEvents, error: allError } = await supabase
      .from('events')
      .select('id, name, type, is_active, betting_lock_time, start_date, end_date')
      .order('id');

    if (allError) throw allError;

    // Fetch only active events
    const { data: activeEvents, error: activeError } = await supabase
      .from('events')
      .select('id, name, type, betting_lock_time')
      .eq('is_active', true)
      .order('id');

    if (activeError) throw activeError;

    // Format the response
    const response = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEvents: allEvents.length,
        activeEvents: activeEvents.length,
        lockedActiveEvents: activeEvents.filter(e => e.betting_lock_time).length
      },
      activeEvents: activeEvents.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        isLocked: !!e.betting_lock_time,
        lockTime: e.betting_lock_time,
        lockTimeFormatted: e.betting_lock_time
          ? new Date(e.betting_lock_time).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })
          : 'N/A'
      })),
      allEvents: allEvents.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        isActive: e.is_active,
        isLocked: !!e.betting_lock_time,
        lockTime: e.betting_lock_time,
        dateRange: `${e.start_date} to ${e.end_date}`
      }))
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error checking betting status:', error);
    res.status(500).json({
      error: error.message,
      details: error.details || null
    });
  }
}
