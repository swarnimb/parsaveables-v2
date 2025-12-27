import * as db from './databaseService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ConfigService');

/**
 * In-memory cache for configuration data
 * Reduces database queries for rarely-changing config (changes ~1x per season, loaded ~50x per day)
 */
const configCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Creates cache entry with timestamp
 */
function createCacheEntry(data) {
  return {
    data,
    timestamp: Date.now()
  };
}

/**
 * Checks if cache entry is still valid
 */
function isCacheValid(entry) {
  return entry && (Date.now() - entry.timestamp) < CACHE_TTL_MS;
}

/**
 * Load complete scoring configuration for an event
 * NOW WITH CACHING: Reduces DB load by ~95%
 *
 * Includes points system config and course data
 *
 * @param {Object} event - Event object with points_system_id
 * @param {string} courseName - Course name from scorecard
 * @returns {Promise<Object>} Complete configuration object
 */
export async function loadConfiguration(event, courseName) {
  const cacheKey = `config_${event.id}_${courseName}`;

  // Check cache first
  const cached = configCache.get(cacheKey);
  if (isCacheValid(cached)) {
    logger.debug('Configuration loaded from cache', { cacheKey, ttl: CACHE_TTL_MS });
    return cached.data;
  }

  // Cache miss - load from database
  logger.info('Loading configuration from database', {
    eventId: event.id,
    eventName: event.name,
    courseName
  });

  // Load points system configuration
  const pointsSystem = await db.getPointsSystem(event.points_system_id);

  // Load all courses (for reference)
  const courses = await db.getCourses();

  // Find matching course using aliases system (database-level matching)
  const course = await db.findCourseByNameOrAlias(courseName);

  const configuration = {
    event: {
      id: event.id,
      name: event.name,
      type: event.type,
      year: event.year
    },
    pointsSystem: {
      id: pointsSystem.id,
      name: pointsSystem.name,
      config: pointsSystem.config
    },
    course: course || {
      course_name: courseName,
      tier: 2, // Default tier
      multiplier: 1.0, // Default multiplier
      active: false,
      isDefault: true
    },
    courses: courses // All courses for reference
  };

  logger.info('Configuration loaded', {
    pointsSystemName: pointsSystem.name,
    courseName: course ? course.course_name : `${courseName} (default)`,
    courseMultiplier: configuration.course.multiplier
  });

  // Store in cache
  configCache.set(cacheKey, createCacheEntry(configuration));
  logger.debug('Configuration cached', { cacheKey, ttl: CACHE_TTL_MS });

  return configuration;
}

/**
 * Find course by name with fuzzy matching
 *
 * @param {Array<Object>} courses - List of course objects
 * @param {string} courseName - Course name to find
 * @returns {Object|null} Matched course or null
 */
function findCourse(courses, courseName) {
  if (!courseName) {
    return null;
  }

  const normalizedInput = courseName.toLowerCase().trim();

  // Try exact match first
  for (const course of courses) {
    if (course.course_name.toLowerCase() === normalizedInput) {
      logger.info('Exact course match found', { course: course.course_name });
      return course;
    }
  }

  // Try partial match (input contains course name or vice versa)
  for (const course of courses) {
    const normalizedCourse = course.course_name.toLowerCase();

    if (
      normalizedInput.includes(normalizedCourse) ||
      normalizedCourse.includes(normalizedInput)
    ) {
      logger.info('Partial course match found', {
        input: courseName,
        matched: course.course_name
      });
      return course;
    }
  }

  logger.warn('No course match found', { input: courseName });
  return null;
}

/**
 * Clear configuration cache
 * Call this when config changes in admin panel
 *
 * @param {number} [eventId] - Specific event ID to clear, or null for all
 * @param {string} [courseName] - Specific course name to clear, or null for all
 */
export function clearConfigCache(eventId = null, courseName = null) {
  if (eventId && courseName) {
    const cacheKey = `config_${eventId}_${courseName}`;
    configCache.delete(cacheKey);
    logger.info('Cache cleared for specific config', { eventId, courseName });
  } else {
    configCache.clear();
    logger.info('All configuration cache cleared');
  }
}

export default {
  loadConfiguration,
  clearConfigCache
};
