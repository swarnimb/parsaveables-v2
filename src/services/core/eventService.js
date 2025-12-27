import * as db from './databaseService.js';
import { createLogger } from '../utils/logger.js';
import { validateISODate } from '../utils/validation.js';
import { BusinessLogicError } from '../utils/errors.js';

const logger = createLogger('EventService');

/**
 * Assign event (season or tournament) to a scorecard based on date
 *
 * Prioritizes tournaments over seasons when both match the date
 *
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Event object with {id, name, type, points_system_id, ...}
 * @throws {Error} If no active event found for date
 */
export async function assignEvent(dateString) {
  logger.info('Assigning event for date', { date: dateString });

  // Validate date format using shared utility
  validateISODate(dateString, 'scorecard date');

  // Find matching event from database (tournaments or specific date ranges)
  let event = await db.findEventByDate(dateString);

  if (!event) {
    // No specific event found - fallback to Season based on CURRENT year
    const currentYear = new Date().getFullYear(); // Get current year (e.g., 2025)
    const seasonName = `${currentYear}`;

    logger.info('No specific event found, attempting fallback to current year season', {
      scorecardDate: dateString,
      currentYear,
      seasonName
    });

    // Try to find the season for current year
    event = await db.findEventByName(seasonName);

    if (!event) {
      // Still no event found - no fallback available
      logger.error('No event or season found', {
        date: dateString,
        triedSeason: seasonName,
        currentYear
      });
      throw new BusinessLogicError(
        `No event found for date ${dateString}. Tried "${seasonName}" (current year) but it doesn't exist. ` +
        'Please create a season in the admin panel.',
        'NO_EVENT_FOUND'
      );
    }

    logger.info('Assigned to current year season', { season: seasonName });
  }

  // Validate event has points system linked
  if (!event.points_system_id) {
    logger.error('Event missing points system', {
      eventId: event.id,
      eventName: event.name
    });
    throw new BusinessLogicError(
      `Event "${event.name}" does not have a points system configured. ` +
      'Please link a points system in the admin panel.',
      'MISSING_POINTS_SYSTEM'
    );
  }

  logger.info('Event assigned', {
    eventId: event.id,
    eventName: event.name,
    eventType: event.type,
    pointsSystemId: event.points_system_id
  });

  return event;
}

export default {
  assignEvent
};
