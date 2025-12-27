import { createLogger } from '../utils/logger.js';

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

  const playersWithPoints = rankedPlayers.map((player) => {
    // 1. Calculate rank points
    const rankPoints = calculateRankPoints(player.rank, config.rank_points);

    // 2. Calculate performance points
    const performancePoints = calculatePerformancePoints(player, config.performance_points);

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
  calculateTiedRankPoints
};
