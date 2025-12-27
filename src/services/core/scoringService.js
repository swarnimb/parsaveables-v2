import { createLogger } from '../utils/logger.js';

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

/**
 * Rank players based on total score with tie-breaking rules
 *
 * Tie-breaker priority:
 * 1. Lower total score wins
 * 2. More birdies wins
 * 3. More pars wins
 * 4. Earlier first birdie wins
 * 5. If still tied, players share the rank
 *
 * @param {Array<Object>} players - Array of player objects with scores and stats
 * @param {Array<Object>} holes - Array of hole info for tie-breaking
 * @returns {Array<Object>} Players sorted with rank assigned
 */
export function rankPlayers(players, holes) {
  logger.info('Ranking players', { count: players.length });

  // Sort players using tie-breaker logic
  const sorted = [...players].sort((a, b) => {
    // 1. Total score (lower is better)
    if (a.totalScore !== b.totalScore) {
      return a.totalScore - b.totalScore;
    }

    // 2. More birdies wins
    if (a.birdies !== b.birdies) {
      return b.birdies - a.birdies;
    }

    // 3. More pars wins
    if (a.pars !== b.pars) {
      return b.pars - a.pars;
    }

    // 4. Earlier first birdie wins
    const aFirstBirdie = getFirstBirdieHole(a.holeByHole, holes);
    const bFirstBirdie = getFirstBirdieHole(b.holeByHole, holes);
    if (aFirstBirdie !== bFirstBirdie) {
      return aFirstBirdie - bFirstBirdie;
    }

    // 5. Still tied - share rank
    return 0;
  });

  // Assign ranks (handle ties properly)
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    // If not first player and scores match, share previous rank
    if (i > 0 && sorted[i].totalScore === sorted[i - 1].totalScore) {
      // Check if tie-breakers also match
      const prevPlayer = sorted[i - 1];
      const currPlayer = sorted[i];

      const isTied =
        prevPlayer.birdies === currPlayer.birdies &&
        prevPlayer.pars === currPlayer.pars &&
        getFirstBirdieHole(prevPlayer.holeByHole, holes) ===
        getFirstBirdieHole(currPlayer.holeByHole, holes);

      if (isTied) {
        // Share previous rank
        sorted[i].rank = sorted[i - 1].rank;
      } else {
        // Tie broken, assign current rank
        sorted[i].rank = currentRank;
      }
    } else {
      // New score, assign current rank
      sorted[i].rank = currentRank;
    }

    currentRank++;
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
 * @returns {Object} Processed data with verified stats and ranks
 */
export function processScorecard(scorecardData) {
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
  const rankedPlayers = rankPlayers(playersWithStats, scorecardData.holes);

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
