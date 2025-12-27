import * as db from './databaseService.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('PlayerService');

/**
 * Normalize name for fuzzy matching
 * Removes special characters, converts to lowercase, trims whitespace
 *
 * @param {string} name - Player name to normalize
 * @returns {string} Normalized name
 */
function normalizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' '); // Collapse multiple spaces
}

/**
 * Calculate similarity score between two names (0-1)
 * Uses simple character-based similarity
 *
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(name1, name2) {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  // Exact match after normalization
  if (norm1 === norm2) {
    return 1.0;
  }

  // Check if one contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.9;
  }

  // Check first name match (for "David" vs "David Smith")
  const firstName1 = norm1.split(' ')[0];
  const firstName2 = norm2.split(' ')[0];

  if (firstName1 === firstName2 && firstName1.length > 2) {
    return 0.8;
  }

  // Calculate Levenshtein-like similarity
  const longer = norm1.length > norm2.length ? norm1 : norm2;
  const shorter = norm1.length > norm2.length ? norm2 : norm1;

  if (longer.length === 0) {
    return 1.0;
  }

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 *
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Validate and match player names from scorecard against registered players
 * Returns matched players with similarity scores
 *
 * @param {Array<Object>} scorecardPlayers - Players from scorecard with {name, ...}
 * @returns {Promise<Object>} Object with {matched, unmatched, warnings}
 */
export async function validatePlayers(scorecardPlayers) {
  logger.info('Validating players', { count: scorecardPlayers.length });

  // Get registered players from database
  const registeredPlayers = await db.getRegisteredPlayers();

  const matched = [];
  const unmatched = [];
  const warnings = [];

  for (const scorecardPlayer of scorecardPlayers) {
    const inputName = scorecardPlayer.name;

    // Find best match from registered players
    let bestMatch = null;
    let bestScore = 0;

    for (const registeredPlayer of registeredPlayers) {
      // Skip emoji-only names unless exact match
      const registeredName = registeredPlayer.player_name;
      if (registeredName && registeredName.trim().length <= 2 && inputName !== registeredName) {
        continue;
      }

      const score = calculateSimilarity(inputName, registeredName);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = registeredPlayer;
      }
    }

    // Thresholds for matching
    const EXACT_THRESHOLD = 0.95;
    const FUZZY_THRESHOLD = 0.75;

    if (bestScore >= EXACT_THRESHOLD) {
      // Exact or very close match
      matched.push({
        ...scorecardPlayer,
        playerId: bestMatch.id,
        registeredName: bestMatch.player_name,
        matchScore: bestScore
      });

      logger.info('Player matched', {
        input: inputName,
        registered: bestMatch.player_name,
        score: bestScore.toFixed(2)
      });
    } else if (bestScore >= FUZZY_THRESHOLD) {
      // Fuzzy match - needs confirmation
      matched.push({
        ...scorecardPlayer,
        playerId: bestMatch.id,
        registeredName: bestMatch.player_name,
        matchScore: bestScore
      });

      warnings.push({
        type: 'fuzzy_match',
        input: inputName,
        matched: bestMatch.player_name,
        score: bestScore,
        message: `"${inputName}" fuzzy matched to "${bestMatch.player_name}" (${(bestScore * 100).toFixed(0)}% confidence)`
      });

      logger.warn('Fuzzy player match', {
        input: inputName,
        registered: bestMatch.player_name,
        score: bestScore.toFixed(2)
      });
    } else {
      // No good match found
      unmatched.push({
        ...scorecardPlayer,
        inputName: inputName,
        bestGuess: bestMatch ? bestMatch.player_name : null,
        bestScore: bestScore
      });

      warnings.push({
        type: 'unmatched',
        input: inputName,
        bestGuess: bestMatch ? bestMatch.player_name : 'None',
        score: bestScore,
        message: `"${inputName}" not found in registered players. Best guess: "${bestMatch?.player_name || 'None'}" (${(bestScore * 100).toFixed(0)}% confidence)`
      });

      logger.warn('Player not matched', {
        input: inputName,
        bestGuess: bestMatch ? bestMatch.player_name : null,
        score: bestScore.toFixed(2)
      });
    }
  }

  const result = {
    matched,
    unmatched,
    warnings,
    stats: {
      total: scorecardPlayers.length,
      matched: matched.length,
      unmatched: unmatched.length,
      fuzzyMatches: warnings.filter(w => w.type === 'fuzzy_match').length
    }
  };

  logger.info('Player validation complete', result.stats);

  return result;
}

/**
 * Get a registered player by exact name match
 *
 * @param {string} playerName - Player name to find
 * @returns {Promise<Object|null>} Player object or null if not found
 */
export async function findPlayerByName(playerName) {
  logger.info('Finding player by name', { name: playerName });

  const registeredPlayers = await db.getRegisteredPlayers();
  const normalizedInput = normalizeName(playerName);

  for (const player of registeredPlayers) {
    if (normalizeName(player.player_name) === normalizedInput) {
      logger.info('Player found', { name: player.player_name });
      return player;
    }
  }

  logger.warn('Player not found', { name: playerName });
  return null;
}

export default {
  validatePlayers,
  findPlayerByName,
  normalizeName,
  calculateSimilarity
};
