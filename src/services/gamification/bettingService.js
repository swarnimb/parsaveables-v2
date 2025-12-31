import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { BusinessLogicError, DatabaseError } from '../../utils/errors.js';
import * as pulpService from './pulpService.js';

const logger = createLogger('BettingService');

/**
 * Initialize Supabase client with service role key
 * This bypasses Row-Level Security for backend operations
 */
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Betting Service - PULP betting on round outcomes
 *
 * Players can bet PULPs on top 3 finishers:
 * - Perfect match (all 3 in order) → 2x payout
 * - Partial match (right 3, wrong order) → 1x payout
 * - No match → 0x payout (lose wager)
 *
 * Minimum wager: 20 PULPs
 */

/**
 * Place a bet on a round
 *
 * @param {number} playerId - Player placing the bet
 * @param {string} roundId - Round UUID
 * @param {number} eventId - Event ID
 * @param {object} predictions - {first, second, third} player names
 * @param {number} wagerAmount - PULPs to wager (min 20)
 * @returns {Promise<object>} Created bet record
 * @throws {BusinessLogicError} If betting is locked or insufficient PULPs
 */
export async function placeBet(playerId, roundId, eventId, predictions, wagerAmount) {
  const { first, second, third } = predictions;

  // Validate wager amount
  if (wagerAmount < 20) {
    throw new BusinessLogicError('Minimum wager is 20 PULPs');
  }

  // Validate predictions are different
  if (first === second || first === third || second === third) {
    throw new BusinessLogicError('Predicted players must be different');
  }

  logger.info('Placing bet', {
    playerId,
    roundId,
    predictions,
    wagerAmount
  });

  try {
    // Check if betting is locked for this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('betting_lock_time')
      .eq('id', eventId)
      .single();

    if (eventError) throw eventError;

    if (event.betting_lock_time && new Date(event.betting_lock_time) < new Date()) {
      throw new BusinessLogicError('Betting is locked for this round');
    }

    // Check if player already has a bet for this round
    // For next round bets (roundId = null), check for pending bets with null round_id
    let existingBet;
    if (roundId === null) {
      const { data } = await supabase
        .from('bets')
        .select('id')
        .eq('player_id', playerId)
        .is('round_id', null)
        .eq('status', 'pending')
        .maybeSingle();
      existingBet = data;
    } else {
      const { data } = await supabase
        .from('bets')
        .select('id')
        .eq('player_id', playerId)
        .eq('round_id', roundId)
        .maybeSingle();
      existingBet = data;
    }

    if (existingBet) {
      throw new BusinessLogicError('You already have a bet for this round');
    }

    // Deduct wager from player's balance
    await pulpService.deductTransaction(
      playerId,
      wagerAmount,
      'bet_loss', // Temporary - will change if they win
      roundId ? `Bet placed on round ${roundId}` : 'Bet placed on next round',
      { round_id: roundId, event_id: eventId }
    );

    // Create bet record
    const { data: bet, error: betError } = await supabase
      .from('bets')
      .insert({
        player_id: playerId,
        round_id: roundId,
        event_id: eventId,
        prediction_first: first,
        prediction_second: second,
        prediction_third: third,
        wager_amount: wagerAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (betError) throw betError;

    logger.info('Bet placed successfully', {
      betId: bet.id,
      playerId,
      roundId,
      wagerAmount
    });

    return bet;
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    logger.error('Failed to place bet', { error: error.message, playerId, roundId });
    throw new DatabaseError('Failed to place bet', error);
  }
}

/**
 * Lock betting for an event (admin function)
 * Called 15 minutes after round start or manually by admin
 *
 * @param {number} eventId - Event ID
 * @returns {Promise<number>} Number of bets locked
 */
export async function lockBetting(eventId) {
  logger.info('Locking betting for event', { eventId });

  try {
    // Set betting_lock_time on event
    const { error: lockError } = await supabase
      .from('events')
      .update({ betting_lock_time: new Date().toISOString() })
      .eq('id', eventId);

    if (lockError) throw lockError;

    // Update all pending bets to locked status
    const { data: lockedBets, error: updateError } = await supabase
      .from('bets')
      .update({ status: 'locked' })
      .eq('event_id', eventId)
      .eq('status', 'pending')
      .select('id');

    if (updateError) throw updateError;

    logger.info('Betting locked', {
      eventId,
      betsLocked: lockedBets?.length || 0
    });

    return lockedBets?.length || 0;
  } catch (error) {
    logger.error('Failed to lock betting', { error: error.message, eventId });
    throw new DatabaseError('Failed to lock betting', error);
  }
}

/**
 * Resolve bets for a round after completion
 * Called by gamificationService after round is processed
 *
 * @param {string} roundId - Round UUID
 * @returns {Promise<object>} Resolution results
 */
export async function resolveBets(roundId) {
  logger.info('Resolving bets for round', { roundId });

  try {
    // Get actual top 3 finishers from player_rounds
    const { data: playerRounds, error: roundsError } = await supabase
      .from('player_rounds')
      .select('player_name, rank')
      .eq('round_id', roundId)
      .order('rank', { ascending: true })
      .limit(3);

    if (roundsError) throw roundsError;

    if (playerRounds.length < 3) {
      throw new BusinessLogicError('Round must have at least 3 players to resolve bets');
    }

    const actualTop3 = {
      first: playerRounds[0].player_name,
      second: playerRounds[1].player_name,
      third: playerRounds[2].player_name
    };

    logger.info('Actual top 3 finishers', actualTop3);

    // Get all locked bets for this round
    const { data: bets, error: betsError } = await supabase
      .from('bets')
      .select('*')
      .eq('round_id', roundId)
      .eq('status', 'locked');

    if (betsError) throw betsError;

    const results = {
      totalBets: bets.length,
      perfectWins: 0,
      partialWins: 0,
      losses: 0,
      totalPaidOut: 0
    };

    // Resolve each bet
    for (const bet of bets) {
      const prediction = {
        first: bet.prediction_first,
        second: bet.prediction_second,
        third: bet.prediction_third
      };

      const result = calculateBetResult(prediction, actualTop3, bet.wager_amount);

      // Update bet status and payout
      const { error: updateError } = await supabase
        .from('bets')
        .update({
          status: result.status,
          payout_amount: result.payout,
          resolved_at: new Date().toISOString()
        })
        .eq('id', bet.id);

      if (updateError) throw updateError;

      // Award winnings if any
      if (result.payout > 0) {
        await pulpService.addTransaction(
          bet.player_id,
          result.payout,
          result.transactionType,
          result.description,
          { bet_id: bet.id, round_id: roundId }
        );

        results.totalPaidOut += result.payout;
      }

      // Update results stats
      if (result.status === 'won_perfect') results.perfectWins++;
      else if (result.status === 'won_partial') results.partialWins++;
      else results.losses++;
    }

    logger.info('Bets resolved', results);

    return results;
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    logger.error('Failed to resolve bets', { error: error.message, roundId });
    throw new DatabaseError('Failed to resolve bets', error);
  }
}

/**
 * Calculate bet result (perfect/partial/loss)
 *
 * @param {object} prediction - Predicted top 3
 * @param {object} actual - Actual top 3
 * @param {number} wager - Wager amount
 * @returns {object} Result with status, payout, description
 */
function calculateBetResult(prediction, actual, wager) {
  // Perfect match: all 3 correct in order → 2x payout
  if (
    prediction.first === actual.first &&
    prediction.second === actual.second &&
    prediction.third === actual.third
  ) {
    return {
      status: 'won_perfect',
      payout: wager * 2,
      transactionType: 'bet_win_perfect',
      description: `Bet won (perfect match) - 2x payout`
    };
  }

  // Partial match: right 3 players, wrong order → 1x payout (get wager back)
  const predictedSet = new Set([prediction.first, prediction.second, prediction.third]);
  const actualSet = new Set([actual.first, actual.second, actual.third]);

  if (
    predictedSet.size === 3 &&
    actualSet.size === 3 &&
    [...predictedSet].every(name => actualSet.has(name))
  ) {
    return {
      status: 'won_partial',
      payout: wager,
      transactionType: 'bet_win_partial',
      description: `Bet won (partial match) - wager returned`
    };
  }

  // No match → loss (no payout)
  return {
    status: 'lost',
    payout: 0,
    transactionType: null,
    description: null
  };
}

/**
 * Get all bets for a round
 *
 * @param {string} roundId - Round UUID
 * @returns {Promise<Array>} List of bets
 */
export async function getBetsForRound(roundId) {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select(`
        *,
        registered_players!bets_player_id_fkey (
          player_name
        )
      `)
      .eq('round_id', roundId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Failed to get bets for round', { error: error.message, roundId });
    throw new DatabaseError('Failed to get bets for round', error);
  }
}

/**
 * Get betting history for a player
 *
 * @param {number} playerId - Player ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Player's betting history
 */
export async function getBetsForPlayer(playerId, options = {}) {
  const { limit = 20, offset = 0 } = options;

  try {
    const { data, error } = await supabase
      .from('bets')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Failed to get player bets', { error: error.message, playerId });
    throw new DatabaseError('Failed to get player bets', error);
  }
}

/**
 * Check if betting is locked for an event
 *
 * @param {number} eventId - Event ID
 * @returns {Promise<boolean>} True if locked
 */
export async function isBettingLocked(eventId) {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('betting_lock_time')
      .eq('id', eventId)
      .single();

    if (error) throw error;

    return data.betting_lock_time && new Date(data.betting_lock_time) < new Date();
  } catch (error) {
    logger.error('Failed to check betting lock status', { error: error.message, eventId });
    throw new DatabaseError('Failed to check betting lock status', error);
  }
}

export default {
  placeBet,
  lockBetting,
  resolveBets,
  getBetsForRound,
  getBetsForPlayer,
  isBettingLocked
};
