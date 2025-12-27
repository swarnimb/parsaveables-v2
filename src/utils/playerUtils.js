/**
 * Player display utilities
 */

/**
 * Get display name for a player (with emoji support)
 * @param {string} playerName - The player's name from database
 * @returns {string} Display name with emoji if applicable
 */
export function getPlayerDisplayName(playerName) {
  if (!playerName) return ''

  // Special case: Bird player shows as bird emoji only
  if (playerName.toLowerCase() === 'bird') {
    return '🐦'
  }

  return playerName
}

/**
 * Get player emoji only (without name)
 * @param {string} playerName - The player's name from database
 * @returns {string} Emoji or empty string
 */
export function getPlayerEmoji(playerName) {
  if (!playerName) return ''

  if (playerName.toLowerCase() === 'bird') {
    return '🐦'
  }

  return ''
}
