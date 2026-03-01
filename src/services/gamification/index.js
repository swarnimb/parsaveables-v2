import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { DatabaseError } from '../../utils/errors.js';
import * as pulpService from './pulpService.js';
import * as challengeService from './challengeService.js';
import * as blessingService from './blessingService.js';
import * as windowService from './windowService.js';

const logger = createLogger('GamificationService');

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Gamification Service — Master Orchestrator
 *
 * Called after a round is stored. Handles:
 * 1. Participation PULPs (+10 per player)
 * 2. Beat-higher-ranked bonus (+5 per player beaten, seasons only)
 * 3. DRS bonus (4th=+2, 5th=+4, 6th=+6, etc.)
 * 4. PULPy window settlement (if a locked window matches this round)
 */

/**
 * Process all gamification for a completed round.
 *
 * @param {string} roundId - Round UUID
 * @param {number} eventId - Event ID
 * @param {string} eventType - 'season' or 'tournament'
 * @param {object} roundMeta - { date, time } extracted from scorecard
 * @returns {Promise<object>} Summary of PULP earnings and resolutions
 */
export async function processRoundGamification(roundId, eventId, eventType, roundMeta = {}) {
  logger.info('Processing round gamification', { roundId, eventId, eventType });

  try {
    const { data: playerRounds, error: roundsError } = await supabase
      .from('player_rounds')
      .select('player_name, rank, total_strokes, registered_players!inner(id, player_name)')
      .eq('round_id', roundId)
      .order('rank', { ascending: true });

    if (roundsError) throw roundsError;

    if (!playerRounds || playerRounds.length === 0) {
      logger.warn('No players found for round', { roundId });
      return { message: 'No players to process' };
    }

    // Get round date for context
    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('date')
      .eq('id', roundId)
      .single();

    if (roundError) throw roundError;

    // Season leaderboard for beat-higher-ranked calculation
    let seasonLeaderboard = [];
    if (eventType === 'season') {
      const { data: leaderboardData, error: lbError } = await supabase
        .from('player_rounds')
        .select('player_id, final_total')
        .eq('event_id', eventId);

      if (lbError) throw lbError;

      const aggregated = {};
      for (const pr of leaderboardData) {
        aggregated[pr.player_id] = (aggregated[pr.player_id] || 0) + (pr.final_total || 0);
      }

      seasonLeaderboard = Object.entries(aggregated)
        .map(([playerId, total]) => ({ playerId: Number(playerId), total }))
        .sort((a, b) => b.total - a.total);
    }

    const results = {
      roundId,
      eventId,
      eventType,
      playersProcessed: 0,
      totalPulpsAwarded: 0,
      windowSettled: null,
      playerSummaries: []
    };

    // Award per-player PULPs
    for (const pr of playerRounds) {
      const playerId = pr.registered_players.id;
      const playerName = pr.player_name;
      const rank = pr.rank;

      let playerEarnings = 0;
      const breakdown = {};

      // 1. Participation: +10
      await pulpService.addTransaction(
        playerId,
        10,
        'round_participation',
        `Played round on ${round.date}`,
        { round_id: roundId, event_id: eventId }
      );
      playerEarnings += 10;
      breakdown.participation = 10;

      // 2. Beat-higher-ranked: +5 per player beaten (seasons only)
      if (eventType === 'season') {
        const beaten = countHigherRankedBeaten(playerId, rank, playerRounds, seasonLeaderboard);
        if (beaten > 0) {
          const bonus = beaten * 5;
          await pulpService.addTransaction(
            playerId,
            bonus,
            'beat_higher_ranked',
            `Beat ${beaten} higher-ranked player(s)`,
            { round_id: roundId, count: beaten }
          );
          playerEarnings += bonus;
          breakdown.beatHigherRanked = bonus;
        }
      }

      // 3. DRS bonus: 4th=+2, 5th=+4, 6th=+6, etc.
      if (rank >= 4) {
        const drs = (rank - 3) * 2;
        await pulpService.addTransaction(
          playerId,
          drs,
          'drs_bonus',
          `DRS bonus for ${rank}${rankSuffix(rank)} place`,
          { round_id: roundId, rank }
        );
        playerEarnings += drs;
        breakdown.drs = drs;
      }

      // 4. Increment total_rounds_this_season counter
      const { data: playerRecord } = await supabase
        .from('registered_players')
        .select('total_rounds_this_season')
        .eq('id', playerId)
        .single();

      if (playerRecord) {
        await supabase
          .from('registered_players')
          .update({ total_rounds_this_season: (playerRecord.total_rounds_this_season || 0) + 1 })
          .eq('id', playerId);
      }

      results.playersProcessed++;
      results.totalPulpsAwarded += playerEarnings;
      results.playerSummaries.push({ playerId, playerName, rank, pulpsEarned: playerEarnings, breakdown });
    }

    // 5. Match and settle a locked PULPy window for this round
    const matchedWindow = await findMatchingWindow(roundMeta);

    if (matchedWindow) {
      try {
        const settlementResults = await windowService.settleWindow(
          matchedWindow.id,
          roundId,
          {
            resolveBlessingsForWindow: blessingService.resolveBlessingsForWindow,
            resolveChallengesForWindow: challengeService.resolveChallengesForWindow
          }
        );
        results.windowSettled = { windowId: matchedWindow.id, ...settlementResults };
        logger.info('PULPy window settled', { windowId: matchedWindow.id, roundId });
      } catch (settleError) {
        logger.error('Window settlement failed (non-fatal)', {
          windowId: matchedWindow.id,
          error: settleError.message
        });
      }
    }

    logger.info('Round gamification complete', {
      roundId,
      playersProcessed: results.playersProcessed,
      totalPulpsAwarded: results.totalPulpsAwarded,
      windowSettled: results.windowSettled?.windowId || null
    });

    return results;
  } catch (error) {
    logger.error('Failed to process round gamification', { error: error.message, roundId });
    throw new DatabaseError('Failed to process round gamification', error);
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Find a locked window that matches the given round's date/time.
 *
 * Match logic:
 * 1. If round has a time: find window where opened_at-1hr ≤ round_datetime ≤ opened_at+2hrs
 * 2. If no time: match any locked window from the same calendar day, FIFO by locked_at
 *
 * @param {object} roundMeta - { date: 'YYYY-MM-DD', time: 'HH:MM' | null }
 * @returns {Promise<object|null>} Matching window record or null
 */
async function findMatchingWindow(roundMeta) {
  const { date, time } = roundMeta;

  if (!date) return null;

  try {
    if (time) {
      // Parse round datetime
      const roundDatetime = new Date(`${date}T${time}`);
      const lowerBound = new Date(roundDatetime.getTime() - 60 * 60 * 1000).toISOString();  // -1hr
      const upperBound = new Date(roundDatetime.getTime() + 2 * 60 * 60 * 1000).toISOString(); // +2hrs

      const { data, error } = await supabase
        .from('pulpy_windows')
        .select('*')
        .eq('status', 'locked')
        .gte('opened_at', lowerBound)
        .lte('opened_at', upperBound)
        .order('locked_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    } else {
      // Fallback: same calendar day, FIFO
      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;

      const { data, error } = await supabase
        .from('pulpy_windows')
        .select('*')
        .eq('status', 'locked')
        .gte('opened_at', dayStart)
        .lte('opened_at', dayEnd)
        .order('locked_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    }
  } catch (error) {
    logger.error('Failed to find matching window', { error: error.message, roundMeta });
    return null;
  }
}

/**
 * Count how many higher-season-ranked players this player beat in this round.
 *
 * @param {number} playerId - Current player's ID
 * @param {number} roundRank - Their rank in this round
 * @param {Array} playerRounds - All player_rounds for this round
 * @param {Array} seasonLeaderboard - [{ playerId, total }] sorted desc
 * @returns {number} Count of higher-ranked opponents beaten
 */
function countHigherRankedBeaten(playerId, roundRank, playerRounds, seasonLeaderboard) {
  const mySeasonIndex = seasonLeaderboard.findIndex(p => p.playerId === playerId);
  if (mySeasonIndex === -1) return 0; // Not on leaderboard yet

  let count = 0;

  for (const pr of playerRounds) {
    const opponentId = pr.registered_players.id;
    if (opponentId === playerId) continue;

    const opponentSeasonIndex = seasonLeaderboard.findIndex(p => p.playerId === opponentId);
    if (opponentSeasonIndex === -1) continue;

    // Opponent ranks higher on season (lower index = higher rank) AND finished below us this round
    if (opponentSeasonIndex < mySeasonIndex && pr.rank > roundRank) {
      count++;
    }
  }

  return count;
}

function rankSuffix(rank) {
  if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
  switch (rank % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export default {
  processRoundGamification
};
