import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { DatabaseError } from '../../utils/errors.js';
import * as pulpService from './pulpService.js';
import * as bettingService from './bettingService.js';
import * as challengeService from './challengeService.js';
import * as advantageService from './advantageService.js';

const logger = createLogger('GamificationService');

/**
 * Initialize Supabase client with service role key
 * This bypasses Row-Level Security for backend operations
 */
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Gamification Service - Master Orchestrator
 *
 * Handles all PULP economy processing after a round is completed:
 * 1. Award participation PULPs (+10 base)
 * 2. Award streak bonuses (+20 if 4 consecutive weeks)
 * 3. Award beat-higher-ranked bonuses (+5 per player)
 * 4. Award DRS bonuses (position-based: 4th=+2, 5th=+4, 6th=+6, etc.)
 * 5. Resolve accepted challenges
 * 6. Resolve locked bets
 * 7. Update player counters (streak, rounds played, etc.)
 */

/**
 * Process all gamification logic for a completed round
 *
 * @param {string} roundId - Round UUID
 * @param {number} eventId - Event ID
 * @param {string} eventType - Event type ('season' or 'tournament')
 * @returns {Promise<object>} Summary of PULP earnings and resolutions
 */
export async function processRoundGamification(roundId, eventId, eventType) {
  logger.info('Processing round gamification', { roundId, eventId, eventType });

  try {
    // Get all players for this round
    const { data: playerRounds, error: roundsError } = await supabase
      .from('player_rounds')
      .select('player_name, rank, total_strokes, registered_players!inner(id, player_name, participation_streak, last_round_date)')
      .eq('round_id', roundId)
      .order('rank', { ascending: true });

    if (roundsError) throw roundsError;

    if (!playerRounds || playerRounds.length === 0) {
      logger.warn('No players found for round', { roundId });
      return { message: 'No players to process' };
    }

    // Get round date
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('date')
      .eq('id', roundId)
      .single();

    if (roundError) throw roundError;

    const roundDate = new Date(round.date);

    // Get season leaderboard (for beat-higher-ranked calculation)
    // Only calculate if event is a season
    let seasonLeaderboard = [];
    if (eventType === 'season') {
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('player_rounds')
        .select('player_name, final_total')
        .eq('event_id', eventId);

      if (leaderboardError) throw leaderboardError;

      // Aggregate by player_name and calculate total points
      const aggregated = {};
      leaderboardData.forEach(pr => {
        if (!aggregated[pr.player_name]) {
          aggregated[pr.player_name] = 0;
        }
        aggregated[pr.player_name] += pr.final_total || 0;
      });

      // Convert to array and sort by total points (descending)
      seasonLeaderboard = Object.entries(aggregated)
        .map(([player_name, total_points]) => ({ player_name, total_points }))
        .sort((a, b) => b.total_points - a.total_points);
    }

    const results = {
      roundId,
      eventId,
      eventType,
      playersProcessed: 0,
      totalPulpsAwarded: 0,
      challengesResolved: 0,
      betsResolved: 0,
      playerSummaries: []
    };

    // Process each player
    for (const pr of playerRounds) {
      const playerId = pr.registered_players.id;
      const playerName = pr.player_name;
      const rank = pr.rank;

      logger.info('Processing player', { playerId, playerName, rank });

      let playerEarnings = 0;
      const earningBreakdown = {};

      // 1. Participation: +10 PULPs
      await pulpService.addTransaction(
        playerId,
        10,
        'round_participation',
        `Played round at ${round.date}`,
        { round_id: roundId, event_id: eventId }
      );
      playerEarnings += 10;
      earningBreakdown.participation = 10;

      // 2. Streak Bonus: +20 if 4 consecutive weeks
      const streakResult = await calculateAndAwardStreakBonus(
        playerId,
        roundDate,
        pr.registered_players.last_round_date,
        pr.registered_players.participation_streak,
        roundId
      );
      if (streakResult.awarded) {
        playerEarnings += streakResult.amount;
        earningBreakdown.streak = streakResult.amount;
      }

      // 3. Beat Higher-Ranked: +5 per player (only for season rounds)
      if (eventType === 'season') {
        const higherRankedBeaten = calculateHigherRankedBeaten(playerName, rank, playerRounds, seasonLeaderboard);
        if (higherRankedBeaten > 0) {
          const beatBonus = higherRankedBeaten * 5;
          await pulpService.addTransaction(
            playerId,
            beatBonus,
            'beat_higher_ranked',
            `Beat ${higherRankedBeaten} higher-ranked player(s)`,
            { round_id: roundId, count: higherRankedBeaten }
          );
          playerEarnings += beatBonus;
          earningBreakdown.beatHigherRanked = beatBonus;
        }
      }

      // 4. DRS (Drag Reduction System): Position-based bonus (4th=+2, 5th=+4, etc.)
      if (rank >= 4) {
        const drsBonus = (rank - 3) * 2;
        await pulpService.addTransaction(
          playerId,
          drsBonus,
          'drs_bonus',
          `DRS bonus for ${rank}${getRankSuffix(rank)} place`,
          { round_id: roundId, rank }
        );
        playerEarnings += drsBonus;
        earningBreakdown.drs = drsBonus;
      }

      // 5. Update player counters
      await updatePlayerCounters(playerId, roundDate, streakResult.newStreak);

      results.playersProcessed++;
      results.totalPulpsAwarded += playerEarnings;
      results.playerSummaries.push({
        playerId,
        playerName,
        rank,
        pulpsEarned: playerEarnings,
        breakdown: earningBreakdown
      });
    }

    // 6. Resolve challenges for this round
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('id')
      .eq('round_id', roundId)
      .eq('status', 'accepted');

    if (challengesError) throw challengesError;

    for (const challenge of challenges || []) {
      try {
        await challengeService.resolveChallenge(challenge.id);
        results.challengesResolved++;
      } catch (error) {
        logger.error('Failed to resolve challenge', { challengeId: challenge.id, error: error.message });
      }
    }

    // 7. Resolve bets for this round
    try {
      const betResults = await bettingService.resolveBets(roundId);
      results.betsResolved = betResults.totalBets;
      results.betPayouts = {
        perfectWins: betResults.perfectWins,
        partialWins: betResults.partialWins,
        losses: betResults.losses,
        totalPaidOut: betResults.totalPaidOut
      };
    } catch (error) {
      logger.error('Failed to resolve bets', { roundId, error: error.message });
    }

    logger.info('Round gamification complete', results);

    return results;
  } catch (error) {
    logger.error('Failed to process round gamification', { error: error.message, roundId });
    throw new DatabaseError('Failed to process round gamification', error);
  }
}

/**
 * Calculate and award streak bonus
 *
 * @param {number} playerId - Player ID
 * @param {Date} currentRoundDate - Current round date
 * @param {string|null} lastRoundDate - Last round date (ISO string)
 * @param {number} currentStreak - Current streak counter
 * @param {string} roundId - Round UUID
 * @returns {Promise<object>} Streak result with awarded flag and new streak
 */
async function calculateAndAwardStreakBonus(playerId, currentRoundDate, lastRoundDate, currentStreak, roundId) {
  let newStreak = currentStreak || 0;
  let awarded = false;
  let amount = 0;

  // If first round or no last round date, start streak at 1
  if (!lastRoundDate) {
    newStreak = 1;
    return { awarded: false, amount: 0, newStreak };
  }

  const lastDate = new Date(lastRoundDate);
  const daysSinceLastRound = Math.floor((currentRoundDate - lastDate) / (1000 * 60 * 60 * 24));

  // If more than 7 days (missed a week), reset streak
  if (daysSinceLastRound > 7) {
    newStreak = 1; // Start new streak
    return { awarded: false, amount: 0, newStreak };
  }

  // Increment streak
  newStreak = currentStreak + 1;

  // If streak reaches 4, award bonus and reset
  if (newStreak >= 4) {
    await pulpService.addTransaction(
      playerId,
      20,
      'streak_bonus',
      '4-week participation streak bonus',
      { round_id: roundId, streak: 4 }
    );
    awarded = true;
    amount = 20;
    newStreak = 0; // Reset after awarding
  }

  return { awarded, amount, newStreak };
}

/**
 * Calculate how many higher-ranked players this player beat
 *
 * @param {string} playerName - Player name
 * @param {number} currentRank - Player's rank in this round
 * @param {Array} playerRounds - All player rounds for this round (with rank)
 * @param {Array} seasonLeaderboard - Season leaderboard (sorted by total_points desc)
 * @returns {number} Count of higher-ranked players beaten
 */
function calculateHigherRankedBeaten(playerName, currentRank, playerRounds, seasonLeaderboard) {
  // Find player's season rank
  const seasonRank = seasonLeaderboard.findIndex(p => p.player_name === playerName) + 1;

  if (seasonRank === 0) {
    // Player not on season leaderboard yet (first round)
    return 0;
  }

  // Count how many players ranked higher on season leaderboard finished below them this round
  // Higher on season = lower seasonRank number (1st is better than 2nd)
  // Finished below in round = higher currentRank number (1st is better than 2nd)

  let count = 0;

  for (const pr of playerRounds) {
    const opponentName = pr.player_name;
    const opponentRank = pr.rank;

    // Skip self
    if (opponentName === playerName) {
      continue;
    }

    // Find opponent's season rank
    const opponentSeasonRank = seasonLeaderboard.findIndex(p => p.player_name === opponentName) + 1;

    if (opponentSeasonRank === 0) {
      // Opponent not on season leaderboard yet
      continue;
    }

    // Check if opponent ranks higher on season (lower number) but finished below in this round (higher number)
    if (opponentSeasonRank < seasonRank && opponentRank > currentRank) {
      count++;
    }
  }

  return count;
}

/**
 * Update player counters after round processing
 *
 * @param {number} playerId - Player ID
 * @param {Date} roundDate - Round date
 * @param {number} newStreak - Updated streak counter
 * @returns {Promise<void>}
 */
async function updatePlayerCounters(playerId, roundDate, newStreak) {
  try {
    const { error } = await supabase
      .from('registered_players')
      .update({
        participation_streak: newStreak,
        last_round_date: roundDate.toISOString().split('T')[0], // DATE format (YYYY-MM-DD)
        total_rounds_this_season: supabase.raw('total_rounds_this_season + 1')
      })
      .eq('id', playerId);

    if (error) throw error;

    logger.debug('Updated player counters', { playerId, newStreak, roundDate: roundDate.toISOString() });
  } catch (error) {
    logger.error('Failed to update player counters', { error: error.message, playerId });
    throw error;
  }
}

/**
 * Get rank suffix (1st, 2nd, 3rd, 4th, etc.)
 *
 * @param {number} rank - Rank number
 * @returns {string} Suffix ('st', 'nd', 'rd', 'th')
 */
function getRankSuffix(rank) {
  if (rank % 100 >= 11 && rank % 100 <= 13) {
    return 'th';
  }
  switch (rank % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Award weekly interaction bonus to a player (called from API endpoints)
 *
 * @param {number} playerId - Player ID
 * @returns {Promise<boolean>} True if bonus was awarded
 */
export async function awardWeeklyInteractionBonus(playerId) {
  try {
    // Get current ISO week number
    const currentWeek = getISOWeek(new Date());

    // Get player's last interaction week
    const { data: player, error: fetchError } = await supabase
      .from('registered_players')
      .select('last_interaction_week')
      .eq('id', playerId)
      .single();

    if (fetchError) throw fetchError;

    // If already interacted this week, skip bonus
    if (player.last_interaction_week === currentWeek) {
      return false;
    }

    // Award +5 PULPs
    await pulpService.addTransaction(
      playerId,
      5,
      'weekly_interaction',
      'First PULP action this week',
      { week: currentWeek }
    );

    // Update last interaction week
    await supabase
      .from('registered_players')
      .update({ last_interaction_week: currentWeek })
      .eq('id', playerId);

    logger.info('Weekly interaction bonus awarded', { playerId, week: currentWeek });

    return true;
  } catch (error) {
    logger.error('Failed to award weekly interaction bonus', { error: error.message, playerId });
    return false;
  }
}

/**
 * Get ISO week number for a date
 *
 * @param {Date} date - Date object
 * @returns {number} ISO week number (1-53)
 */
function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

export default {
  processRoundGamification,
  awardWeeklyInteractionBonus
};
