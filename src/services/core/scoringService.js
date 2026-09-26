import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ScoringService');

/**
 * Calculate stats from hole-by-hole scores
 * Verifies and recalculates all performance stats
 *
 * @param {Array<number>} holeByHole - Array of scores for each hole
 * @param {Array<Object>} holes - Array of hole info with {hole, par, distance}
 * @returns {Object} Stats object with counts for each performance type
 */
export function calculateStats(holeByHole, holes) {
  const stats = {
    birdies: 0,
    eagles: 0,
    aces: 0,
    pars: 0,
    bogeys: 0,
    doubleBogeys: 0
  };

  if (!holeByHole || !holes || holeByHole.length !== holes.length) {
    logger.warn('Mismatched hole data', {
      holeByHoleLength: holeByHole?.length,
      holesLength: holes?.length
    });
    return stats;
  }

  for (let i = 0; i < holeByHole.length; i++) {
    const score = holeByHole[i];
    const par = holes[i].par;
    const diff = score - par;

    // Ace (hole-in-one on par 3+)
    if (score === 1 && par >= 3) {
      stats.aces++;
    }
    // Eagle (2 under par, but not ace)
    else if (diff === -2) {
      stats.eagles++;
    }
    // Birdie (1 under par, but not ace)
    else if (diff === -1) {
      stats.birdies++;
    }
    // Par
    else if (diff === 0) {
      stats.pars++;
    }
    // Bogey (1 over par)
    else if (diff === 1) {
      stats.bogeys++;
    }
    // Double bogey or worse (2+ over par)
    else if (diff >= 2) {
      stats.doubleBogeys++;
    }
  }

  logger.debug('Stats calculated', stats);
  return stats;
}

/**
 * Find the hole number where player got their first birdie
 * Used for tie-breaking
 *
 * @param {Array<number>} holeByHole - Array of scores
 * @param {Array<Object>} holes - Array of hole info
 * @returns {number} Hole number (1-indexed) or 999 if no birdies
 */
export function getFirstBirdieHole(holeByHole, holes) {
  for (let i = 0; i < holeByHole.length; i++) {
    const score = holeByHole[i];
    const par = holes[i].par;

    // Birdie or better (but not ace on par 3)
    if (score < par && !(score === 1 && par >= 3)) {
      return i + 1; // Return 1-indexed hole number
    }
  }

  return 999; // No birdies found
}

// Default tie-breaker order, matching the Rules tab default
export const DEFAULT_TIE_BREAKERS = ['aces', 'eagles', 'birdies', 'earliest_birdie'];

/**
 * Compare two players on one tie-breaker
 *
 * @returns {number} Negative if a ranks higher, positive if b ranks higher, 0 if equal
 */
function compareOnTieBreaker(tieBreaker, a, b, holes) {
  switch (tieBreaker) {
    case 'aces':
      return (b.aces || 0) - (a.aces || 0);
    case 'eagles':
      return (b.eagles || 0) - (a.eagles || 0);
    case 'birdies':
      return (b.birdies || 0) - (a.birdies || 0);
    case 'earliest_birdie':
      return getFirstBirdieHole(a.holeByHole, holes) - getFirstBirdieHole(b.holeByHole, holes);
    default:
      return 0;
  }
}

/**
 * Rank players based on total score with tie-breaking rules
 *
 * 1. Lower total score wins
 * 2. Tie-breakers applied in the configured order (points_systems.config.tie_breaking.priority)
 * 3. If still tied, players share the rank
 *
 * @param {Array<Object>} players - Array of player objects with scores and stats
 * @param {Array<Object>} holes - Array of hole info for tie-breaking
 * @param {Array<string>} [tieBreakers] - Tie-breaker priority; blank/unknown entries are ignored
 * @returns {Array<Object>} Players sorted with rank assigned
 */
export function rankPlayers(players, holes, tieBreakers = DEFAULT_TIE_BREAKERS) {
  const activeTieBreakers = (tieBreakers || []).filter(tb => tb && tb !== 'none');
  logger.info('Ranking players', { count: players.length, tieBreakers: activeTieBreakers });

  const compare = (a, b) => {
    if (a.totalScore !== b.totalScore) {
      return a.totalScore - b.totalScore;
    }
    for (const tieBreaker of activeTieBreakers) {
      const result = compareOnTieBreaker(tieBreaker, a, b, holes);
      if (result !== 0) return result;
    }
    return 0;
  };

  const sorted = [...players].sort(compare);

  // Assign ranks: fully tied players share the rank, next rank skips (1, 2, 2, 4)
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].rank = i > 0 && compare(sorted[i - 1], sorted[i]) === 0
      ? sorted[i - 1].rank
      : i + 1;
  }

  logger.info('Players ranked', {
    winner: sorted[0].name,
    winnerScore: sorted[0].totalScore
  });

  return sorted;
}

/**
 * Process raw scorecard data: verify stats and assign ranks
 *
 * @param {Object} scorecardData - Raw data from vision API
 * @param {Array<string>} [tieBreakers] - Tie-breaker priority from the points system config
 * @returns {Object} Processed data with verified stats and ranks
 */
export function processScorecard(scorecardData, tieBreakers) {
  logger.info('Processing scorecard', {
    course: scorecardData.courseName,
    playerCount: scorecardData.players.length
  });

  // Recalculate and verify stats for each player
  const playersWithStats = scorecardData.players.map(player => {
    const calculatedStats = calculateStats(player.holeByHole, scorecardData.holes);

    // Log if Claude's stats don't match calculated stats
    const statsMatch =
      calculatedStats.birdies === player.birdies &&
      calculatedStats.eagles === player.eagles &&
      calculatedStats.aces === player.aces;

    if (!statsMatch) {
      logger.warn('Stats mismatch - using calculated values', {
        player: player.name,
        claude: { birdies: player.birdies, eagles: player.eagles, aces: player.aces },
        calculated: calculatedStats
      });
    }

    // Return player with verified stats
    return {
      ...player,
      ...calculatedStats // Override with calculated stats
    };
  });

  // Rank players with tie-breaking
  const rankedPlayers = rankPlayers(playersWithStats, scorecardData.holes, tieBreakers);

  logger.info('Scorecard processed', {
    playersRanked: rankedPlayers.length,
    ties: rankedPlayers.filter((p, i, arr) =>
      i > 0 && p.rank === arr[i - 1].rank
    ).length
  });

  return {
    ...scorecardData,
    players: rankedPlayers
  };
}

export default {
  calculateStats,
  getFirstBirdieHole,
  rankPlayers,
  processScorecard
};
