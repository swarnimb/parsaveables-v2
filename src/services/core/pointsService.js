import { createLogger } from '../../utils/logger.js';

const logger = createLogger('PointsService');

/**
 * Calculate points for all players based on configuration
 * Handles rank points, performance bonuses, and course multipliers
 *
 * @param {Array<Object>} rankedPlayers - Players with rank and stats
 * @param {Object} configuration - Config from configService
 * @returns {Array<Object>} Players with points breakdown added
 */
export function calculatePoints(rankedPlayers, configuration) {
  logger.info('Calculating points', {
    playerCount: rankedPlayers.length,
    pointsSystem: configuration.pointsSystem.name
  });

  const { config } = configuration.pointsSystem;
  const { course } = configuration;

  // Build tied rank → averaged points lookup
  const tiedRankPointsMap = new Map();
  const rankGroups = new Map();
  for (const player of rankedPlayers) {
    if (!rankGroups.has(player.rank)) {
      rankGroups.set(player.rank, 0);
    }
    rankGroups.set(player.rank, rankGroups.get(player.rank) + 1);
  }
  for (const [rank, count] of rankGroups) {
    if (count > 1) {
      const spannedRanks = Array.from({ length: count }, (_, i) => rank + i);
      const averaged = calculateTiedRankPoints(spannedRanks, config.rank_points);
      tiedRankPointsMap.set(rank, parseFloat(averaged.toFixed(2)));
      logger.info('Tied rank points averaged', { rank, count, spannedRanks, averaged });
    }
  }

  const birdieLeader = findSoleBirdieLeader(rankedPlayers);
  const mostBirdiesBonus = config.performance_points?.most_birdies || 0;

  const playersWithPoints = rankedPlayers.map((player) => {
    // 1. Calculate rank points (use averaged if tied)
    const rankPoints = tiedRankPointsMap.has(player.rank)
      ? tiedRankPointsMap.get(player.rank)
      : calculateRankPoints(player.rank, config.rank_points);

    // 2. Calculate performance points (incl. most-birdies bonus for the sole leader)
    const mostBirdiesPoints = player === birdieLeader ? mostBirdiesBonus : 0;
    const performancePoints =
      calculatePerformancePoints(player, config.performance_points) + mostBirdiesPoints;

    // 3. Calculate raw total (before multiplier)
    const rawTotal = rankPoints + performancePoints;

    // 4. Apply course multiplier
    const courseMultiplier = config.course_multiplier?.enabled
      ? course.multiplier || 1.0
      : 1.0;

    const finalTotal = rawTotal * courseMultiplier;

    logger.debug('Points calculated', {
      player: player.name,
      rank: player.rank,
      rankPoints,
      performancePoints,
      rawTotal,
      courseMultiplier,
      finalTotal
    });

    return {
      ...player,
      points: {
        rankPoints,
        birdiePoints: (player.birdies || 0) * (config.performance_points?.birdie || 0),
        eaglePoints: (player.eagles || 0) * (config.performance_points?.eagle || 0),
        acePoints: (player.aces || 0) * (config.performance_points?.ace || 0),
        mostBirdiesPoints,
        performancePoints,
        rawTotal,
        courseMultiplier,
        finalTotal: parseFloat(finalTotal.toFixed(2))
      }
    };
  });

  logger.info('Points calculation complete', {
    totalPlayers: playersWithPoints.length,
    topScore: playersWithPoints[0]?.points.finalTotal
  });

  return playersWithPoints;
}

/**
 * Calculate rank points based on player rank
 * Handles tied ranks with point averaging
 *
 * @param {number} rank - Player's rank
 * @param {Object} rankConfig - Rank points configuration
 * @returns {number} Rank points
 */
function calculateRankPoints(rank, rankConfig) {
  if (!rankConfig) {
    logger.warn('No rank points config provided');
    return 0;
  }

  // Direct rank mapping (e.g., rank 1 → 10 points)
  if (rankConfig[rank] !== undefined) {
    return rankConfig[rank];
  }

  // Use default/participation points
  if (rankConfig.default !== undefined) {
    return rankConfig.default;
  }

  logger.warn('No rank points found for rank', { rank });
  return 0;
}

/**
 * Calculate performance bonus points
 *
 * @param {Object} player - Player with stats (birdies, eagles, aces)
 * @param {Object} performanceConfig - Performance points config
 * @returns {number} Total performance points
 */
function calculatePerformancePoints(player, performanceConfig) {
  if (!performanceConfig) {
    return 0;
  }

  let total = 0;

  if (player.birdies && performanceConfig.birdie) {
    total += player.birdies * performanceConfig.birdie;
  }

  if (player.eagles && performanceConfig.eagle) {
    total += player.eagles * performanceConfig.eagle;
  }

  if (player.aces && performanceConfig.ace) {
    total += player.aces * performanceConfig.ace;
  }

  return total;
}

/**
 * Find the single player with the most birdies in a round
 * Ties for the lead, or a round with no birdies, have no leader
 *
 * @param {Array<Object>} players - Players with birdie counts
 * @returns {Object|null} The sole birdie leader, or null
 */
export function findSoleBirdieLeader(players) {
  const maxBirdies = Math.max(0, ...players.map(p => p.birdies || 0));
  if (maxBirdies === 0) {
    return null;
  }

  const leaders = players.filter(p => (p.birdies || 0) === maxBirdies);
  return leaders.length === 1 ? leaders[0] : null;
}

/**
 * Verify a player's stored points breakdown adds up to their final total
 * Throws so a mismatched breakdown can never be saved silently
 *
 * @param {Object} player - Player with name and points breakdown
 * @throws {Error} When (components) × multiplier ≠ finalTotal
 */
export function validatePointsBreakdown(player) {
  const p = player.points;
  const components = p.rankPoints + p.birdiePoints + p.eaglePoints + p.acePoints + p.mostBirdiesPoints;
  const expected = parseFloat((components * p.courseMultiplier).toFixed(2));

  if (Math.abs(expected - p.finalTotal) > 0.01) {
    const details = { player: player.name, ...p, expected };
    logger.error('Points breakdown does not add up to final total', details);
    throw new Error(
      `Points breakdown mismatch for ${player.name}: components sum × multiplier = ${expected}, ` +
      `but finalTotal = ${p.finalTotal} (${JSON.stringify(details)})`
    );
  }
}

/**
 * Calculate points for tied ranks with averaging
 * Example: If 3 players tie for 2nd place with ranks worth 7, 5, 3 points
 * Each player gets (7 + 5 + 3) / 3 = 5 points
 *
 * @param {Array<number>} ranks - Array of tied rank positions
 * @param {Object} rankConfig - Rank points configuration
 * @returns {number} Averaged points for tied ranks
 */
export function calculateTiedRankPoints(ranks, rankConfig) {
  if (!ranks || ranks.length === 0) {
    return 0;
  }

  // If only one rank, no averaging needed
  if (ranks.length === 1) {
    return calculateRankPoints(ranks[0], rankConfig);
  }

  // Calculate average of points for all tied ranks
  const totalPoints = ranks.reduce((sum, rank) => {
    return sum + (rankConfig[rank] || rankConfig.default || 0);
  }, 0);

  const averagePoints = totalPoints / ranks.length;

  logger.debug('Tied rank points averaged', {
    ranks,
    totalPoints,
    averagePoints
  });

  return averagePoints;
}

export default {
  calculatePoints,
  calculateTiedRankPoints,
  findSoleBirdieLeader,
  validatePointsBreakdown
};
