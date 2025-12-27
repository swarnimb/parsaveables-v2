/**
 * Get the current season based on today's date
 * Seasons are calendar year-based (Jan 1 - Dec 31)
 */
export function getCurrentSeasonYear() {
  return new Date().getFullYear()
}

/**
 * Get the current active event (season) from a list of events
 * Defaults to the season matching the current year
 * Falls back to the first active event if no year match found
 *
 * @param {Array} events - Array of event objects with { id, name, type, is_active }
 * @returns {Object|null} - The current event object or null
 */
export function getCurrentEvent(events) {
  if (!events || events.length === 0) return null

  const currentYear = getCurrentSeasonYear()

  // Try to find a season event matching current year
  const currentYearSeason = events.find(
    e => e.type === 'season' && e.name.includes(currentYear.toString())
  )

  if (currentYearSeason) return currentYearSeason

  // Fallback to first active event
  const activeEvent = events.find(e => e.is_active)
  if (activeEvent) return activeEvent

  // Last resort: first event
  return events[0]
}

/**
 * Get season name from year
 * @param {number} year - Year (e.g., 2025)
 * @returns {string} - Season name (e.g., "Season 2025")
 */
export function getSeasonName(year) {
  return `Season ${year}`
}

/**
 * Check if an event is the current season
 * @param {Object} event - Event object with name and type
 * @returns {boolean}
 */
export function isCurrentSeason(event) {
  if (!event || event.type !== 'season') return false
  const currentYear = getCurrentSeasonYear()
  return event.name.includes(currentYear.toString())
}
