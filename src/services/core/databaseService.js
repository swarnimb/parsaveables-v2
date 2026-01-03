import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { executeQuery, executeQueryOptional, executeQuerySingle } from '../../utils/databaseHelpers.js';

const logger = createLogger('DatabaseService');

/**
 * Initialize Supabase client
 * Uses service role key for full database access (bypasses RLS)
 */
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Get all registered players
 * @returns {Promise<Array>} List of player objects with {id, player_name, active}
 */
export async function getRegisteredPlayers() {
  logger.info('Fetching registered players');

  const data = await executeQuery(
    () => supabase
      .from('registered_players')
      .select('*')
      .eq('active', true),
    'Failed to fetch registered players'
  );

  logger.info(`Found ${data.length} registered players`);
  return data;
}

/**
 * Find event (season or tournament) by date
 * Prioritizes tournaments over seasons if both match
 *
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Promise<Object|null>} Event object or null if not found
 */
export async function findEventByDate(dateString) {
  logger.info('Finding event by date', { date: dateString });

  const data = await executeQuery(
    () => supabase
      .from('events')
      .select('*')
      .lte('start_date', dateString)  // start_date <= dateString
      .gte('end_date', dateString)    // end_date >= dateString
      .eq('is_active', true)
      .order('type', { ascending: false }), // 'tournament' comes before 'season'
    'Failed to find event by date'
  );

  // Return first match (tournament if exists, otherwise season)
  const event = data?.[0] || null;

  if (event) {
    logger.info('Found event', { name: event.name, type: event.type });
  } else {
    logger.warn('No event found for date', { date: dateString });
  }

  return event;
}

/**
 * Find event by name
 * @param {string} eventName - Event name (e.g., "Season 2025")
 * @returns {Promise<Object|null>} Event object or null if not found
 */
export async function findEventByName(eventName) {
  logger.info('Finding event by name', { name: eventName });

  const event = await executeQueryOptional(
    () => supabase
      .from('events')
      .select('*')
      .eq('name', eventName)
      .eq('is_active', true),
    'Failed to find event by name'
  );

  if (event) {
    logger.info('Found event', { name: event.name, type: event.type });
  } else {
    logger.warn('No event found with name', { name: eventName });
  }

  return event;
}

/**
 * Get all active courses with their tier and multiplier
 * @returns {Promise<Array>} List of course objects
 */
export async function getCourses() {
  logger.info('Fetching courses');

  const data = await executeQuery(
    () => supabase
      .from('courses')
      .select('*')
      .eq('active', true)
      .order('tier', { ascending: true }),
    'Failed to fetch courses'
  );

  logger.info(`Found ${data.length} active courses`);
  return data;
}

/**
 * Get points system configuration by ID
 * @param {number} pointsSystemId - ID from events.points_system_id
 * @returns {Promise<Object>} Points system with parsed config JSON
 */
export async function getPointsSystem(pointsSystemId) {
  logger.info('Fetching points system', { id: pointsSystemId });

  const data = await executeQuerySingle(
    () => supabase
      .from('points_systems')
      .select('*')
      .eq('id', pointsSystemId)
      .single(),
    'Failed to fetch points system'
  );

  logger.info('Points system loaded', { name: data.name });
  return data;
}

/**
 * Insert a new round into the database
 * @param {Object} roundData - Round information
 * @returns {Promise<Object>} Inserted round with generated ID
 */
export async function insertRound(roundData) {
  logger.info('Inserting round', { course: roundData.course_name, date: roundData.date });

  const data = await executeQuerySingle(
    () => supabase
      .from('rounds')
      .insert(roundData)
      .select()
      .single(),
    'Failed to insert round'
  );

  logger.info('Round inserted', { id: data.id });
  return data;
}

/**
 * Insert multiple player rounds in a single transaction
 * @param {Array<Object>} playerRounds - Array of player round objects
 * @returns {Promise<Array>} Inserted player rounds
 */
export async function insertPlayerRounds(playerRounds) {
  logger.info('Inserting player rounds', { count: playerRounds.length });

  const data = await executeQuery(
    () => supabase
      .from('player_rounds')
      .insert(playerRounds)
      .select(),
    'Failed to insert player rounds'
  );

  logger.info(`Inserted ${data.length} player rounds`);
  return data;
}

/**
 * Find course by name using aliases table
 * Uses database function for exact/alias/partial matching
 *
 * @param {string} courseName - Course name from scorecard
 * @returns {Promise<Object|null>} Course object or null
 */
export async function findCourseByNameOrAlias(courseName) {
  if (!courseName) {
    logger.warn('findCourseByNameOrAlias called with empty course name');
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('find_course_by_name_or_alias', {
      input_name: courseName
    });

    if (error) {
      logger.error('Error finding course by name or alias', { error, courseName });
      throw error;
    }

    if (!data || data.length === 0) {
      logger.warn('No course found for name', { courseName });
      return null;
    }

    const course = data[0];
    logger.info('Course found via alias system', {
      input: courseName,
      matched: course.course_name,
      tier: course.tier,
      multiplier: course.multiplier
    });

    return course;
  } catch (error) {
    logger.error('Failed to find course', { error, courseName });
    throw error;
  }
}

/**
 * Update an event
 * @param {number} eventId - Event ID
 * @param {Object} updates - Object with fields to update
 * @returns {Promise<Object>} Updated event
 */
export async function updateEvent(eventId, updates) {
  logger.info('Updating event', { eventId, updates });

  const data = await executeQuerySingle(
    () => supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single(),
    'Failed to update event'
  );

  logger.info('Event updated', { eventId });
  return data;
}

/**
 * Get all active events
 * @returns {Promise<Array>} Array of active events
 */
export async function getActiveEvents() {
  logger.info('Fetching active events');

  const data = await executeQuery(
    () => supabase
      .from('events')
      .select('id, name, type, betting_lock_time, start_date, end_date')
      .eq('is_active', true)
      .order('id'),
    'Failed to fetch active events'
  );

  logger.info('Active events fetched', { count: data.length });
  return data;
}

/**
 * Create notifications for all players about a new round
 * @param {number} roundId - Round ID
 * @param {string} courseName - Course name
 * @param {string} date - Round date
 * @param {number} eventId - Event ID
 * @param {string} eventName - Event name
 * @returns {Promise<number>} Number of notifications created
 */
export async function createNewRoundNotifications(roundId, courseName, date, eventId, eventName) {
  logger.info('Creating new round notifications', { roundId, courseName });

  try {
    // Fetch all players
    const { data: allPlayers, error: playersError } = await supabase
      .from('registered_players')
      .select('id, player_name');

    if (playersError) throw playersError;

    if (!allPlayers || allPlayers.length === 0) {
      logger.warn('No players found to notify');
      return 0;
    }

    const notificationDescription = `New round added: ${courseName} on ${new Date(date).toLocaleDateString()}`;

    const notifications = allPlayers.map(p => ({
      player_id: p.id,
      event_type: 'new_round',
      description: notificationDescription,
      event_data: {
        round_id: roundId,
        course_name: courseName,
        date: date,
        event_id: eventId,
        event_name: eventName
      },
      is_read: false
    }));

    const { error: notifError } = await supabase
      .from('activity_feed')
      .insert(notifications);

    if (notifError) throw notifError;

    logger.info('Notifications created for all players', { count: notifications.length });
    return notifications.length;
  } catch (error) {
    logger.error('Failed to create notifications', { error: error.message, roundId });
    throw error;
  }
}

export default {
  getRegisteredPlayers,
  findEventByDate,
  findEventByName,
  getCourses,
  getPointsSystem,
  insertRound,
  insertPlayerRounds,
  findCourseByNameOrAlias,
  updateEvent,
  getActiveEvents,
  createNewRoundNotifications
};
