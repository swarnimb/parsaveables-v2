import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { BusinessLogicError, DatabaseError } from '../../utils/errors.js';
import * as pulpService from './pulpService.js';

const logger = createLogger('BlessingService');

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Place a blessing (formerly "bet") during an open PULPy window.
 *
 * Rules:
 * - Window must be 'open'
 * - One blessing per player per window
 * - Minimum wager: 20 PULPs
 * - Predictions must be 3 distinct players registered for the active event
 *
 * @param {number} playerId - Player placing the blessing
 * @param {string} windowId - PULPy window UUID
 * @param {object} predictions - { first, second, third } — player names
 * @param {number} wagerAmount - PULPs to wager (min 20)
 * @param {number} eventId - Event ID to validate registered players
 * @returns {Promise<object>} Created blessing record
 * @throws {BusinessLogicError} On validation failures
 */
export async function placeBlessing(playerId, windowId, predictions, wagerAmount, eventId) {
  const { first, second, third } = predictions;

  if (wagerAmount < 20) {
    throw new BusinessLogicError('Minimum blessing wager is 20 PULPs');
  }

  if (!first || !second || !third) {
    throw new BusinessLogicError('All three predictions (1st, 2nd, 3rd) are required');
  }

  if (first === second || first === third || second === third) {
    throw new BusinessLogicError('All three predicted players must be different');
  }

  logger.info('Placing blessing', { playerId, windowId, predictions, wagerAmount });

  try {
    // Validate window is open
    const { data: window, error: windowError } = await supabase
      .from('pulpy_windows')
      .select('id, status')
      .eq('id', windowId)
      .single();

    if (windowError) throw windowError;
    if (!window) throw new BusinessLogicError('PULPy window not found');
    if (window.status !== 'open') {
      throw new BusinessLogicError('PULPy window is not open — blessings cannot be placed');
    }

    // One blessing per player per window
    const { data: existing, error: existError } = await supabase
      .from('blessings')
      .select('id')
      .eq('player_id', playerId)
      .eq('window_id', windowId)
      .maybeSingle();

    if (existError) throw existError;
    if (existing) {
      throw new BusinessLogicError('You have already placed a blessing for this window');
    }

    // Validate all three predictions are registered for the event
    const playerNames = [first, second, third];
    const { data: registeredPlayers, error: regError } = await supabase
      .from('event_players')
      .select('registered_players!inner(player_name)')
      .eq('event_id', eventId);

    if (regError) throw regError;

    const registeredNames = (registeredPlayers || []).map(
      ep => ep.registered_players.player_name.toLowerCase().trim()
    );

    for (const name of playerNames) {
      if (!registeredNames.includes(name.toLowerCase().trim())) {
        throw new BusinessLogicError(
          `"${name}" is not registered for this event`
        );
      }
    }

    // Deduct wager (recorded as blessing_loss; upgraded to blessing_win_* if they win)
    await pulpService.deductTransaction(
      playerId,
      wagerAmount,
      'blessing_loss',
      `Blessing placed: ${first}, ${second}, ${third}`,
      { window_id: windowId, event_id: eventId }
    );

    // Insert blessing
    const { data: blessing, error: insertError } = await supabase
      .from('blessings')
      .insert({
        player_id: playerId,
        window_id: windowId,
        event_id: eventId,
        prediction_first: first,
        prediction_second: second,
        prediction_third: third,
        wager_amount: wagerAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info('Blessing placed', { blessingId: blessing.id, playerId, wagerAmount });

    return blessing;
  } catch (error) {
    if (error instanceof BusinessLogicError) throw error;
    logger.error('Failed to place blessing', { error: error.message, playerId, windowId });
    throw new DatabaseError('Failed to place blessing', error);
  }
}

/**
 * Resolve all blessings for a window after its matched round is found.
 *
 * Scoring:
 * - Perfect (all 3 in order): payout = wager * 2, type = 'blessing_win_perfect'
 * - Partial (right 3, wrong order): payout = wager * 1, type = 'blessing_win_partial'
 * - Loss: payout = 0 (wager already deducted at placement)
 *
 * @param {string} windowId - PULPy window UUID
 * @param {string} roundId - Round UUID that resolved this window
 * @returns {Promise<object>} Resolution summary
 */
export async function resolveBlessingsForWindow(windowId, roundId) {
  logger.info('Resolving blessings for window', { windowId, roundId });

  try {
    // Get actual top 3 finishers from player_rounds (rank 1, 2, 3)
    const { data: playerRounds, error: roundsError } = await supabase
      .from('player_rounds')
      .select('player_name, rank')
      .eq('round_id', roundId)
      .order('rank', { ascending: true })
      .limit(3);

    if (roundsError) throw roundsError;

    if (!playerRounds || playerRounds.length < 3) {
      logger.warn('Round has fewer than 3 players — skipping blessing resolution', { roundId });
      return { totalBlessings: 0, perfectWins: 0, partialWins: 0, losses: 0 };
    }

    const actualTop3 = {
      first: playerRounds[0].player_name,
      second: playerRounds[1].player_name,
      third: playerRounds[2].player_name
    };

    logger.info('Actual top 3', actualTop3);

    // Get all pending blessings for this window
    const { data: blessings, error: blessingsError } = await supabase
      .from('blessings')
      .select('*')
      .eq('window_id', windowId)
      .eq('status', 'pending');

    if (blessingsError) throw blessingsError;

    const results = {
      totalBlessings: blessings.length,
      perfectWins: 0,
      partialWins: 0,
      losses: 0,
      totalPaidOut: 0
    };

    for (const blessing of blessings) {
      const prediction = {
        first: blessing.prediction_first,
        second: blessing.prediction_second,
        third: blessing.prediction_third
      };

      const result = calculateBlessingResult(prediction, actualTop3, blessing.wager_amount);

      // Update blessing record
      const { error: updateError } = await supabase
        .from('blessings')
        .update({
          status: result.status,
          payout_amount: result.payout,
          round_id: roundId,
          resolved_at: new Date().toISOString()
        })
        .eq('id', blessing.id);

      if (updateError) {
        logger.error('Failed to update blessing', { blessingId: blessing.id, error: updateError.message });
        continue;
      }

      // Award winnings if any
      if (result.payout > 0) {
        await pulpService.addTransaction(
          blessing.player_id,
          result.payout,
          result.transactionType,
          result.description,
          { blessing_id: blessing.id, round_id: roundId, window_id: windowId }
        );
        results.totalPaidOut += result.payout;
      }

      if (result.status === 'won_perfect') results.perfectWins++;
      else if (result.status === 'won_partial') results.partialWins++;
      else results.losses++;
    }

    logger.info('Blessings resolved', results);

    return results;
  } catch (error) {
    logger.error('Failed to resolve blessings', { error: error.message, windowId, roundId });
    throw new DatabaseError('Failed to resolve blessings', error);
  }
}

/**
 * Refund all blessings for an expired window (no matching scorecard in 15 days).
 *
 * @param {string} windowId - PULPy window UUID
 * @returns {Promise<number>} Number of blessings refunded
 */
export async function refundBlessingsForWindow(windowId) {
  logger.info('Refunding blessings for expired window', { windowId });

  try {
    const { data: blessings, error } = await supabase
      .from('blessings')
      .select('*')
      .eq('window_id', windowId)
      .eq('status', 'pending');

    if (error) throw error;

    for (const blessing of blessings) {
      await pulpService.addTransaction(
        blessing.player_id,
        blessing.wager_amount,
        'window_expired_refund',
        'PULPy window expired without a matching round — blessing refunded',
        { blessing_id: blessing.id, window_id: windowId }
      );

      await supabase
        .from('blessings')
        .update({ status: 'lost', resolved_at: new Date().toISOString() })
        .eq('id', blessing.id);
    }

    logger.info('Blessings refunded', { windowId, count: blessings.length });

    return blessings.length;
  } catch (error) {
    logger.error('Failed to refund blessings', { error: error.message, windowId });
    throw new DatabaseError('Failed to refund blessings', error);
  }
}

/**
 * Get blessings for a player, optionally filtered by window.
 * Only returns the calling player's own blessings (they're private until settled).
 *
 * @param {number} playerId - Player ID
 * @param {string|null} windowId - Optional window filter
 * @returns {Promise<Array>} Player's blessings
 */
export async function getBlessingsForPlayer(playerId, windowId = null) {
  try {
    let query = supabase
      .from('blessings')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (windowId) {
      query = query.eq('window_id', windowId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Failed to get player blessings', { error: error.message, playerId });
    throw new DatabaseError('Failed to get player blessings', error);
  }
}

/**
 * Calculate blessing result (perfect/partial/loss).
 *
 * @param {object} prediction - { first, second, third }
 * @param {object} actual - { first, second, third }
 * @param {number} wager - Wager amount
 * @returns {object} Result with status, payout, transactionType, description
 */
function calculateBlessingResult(prediction, actual, wager) {
  // Perfect: all 3 in correct order → 2x payout
  if (
    prediction.first === actual.first &&
    prediction.second === actual.second &&
    prediction.third === actual.third
  ) {
    return {
      status: 'won_perfect',
      payout: wager * 2,
      transactionType: 'blessing_win_perfect',
      description: 'Blessing won — perfect match (2x payout)'
    };
  }

  // Partial: right 3 players, wrong order → 1x payout (wager returned)
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
      transactionType: 'blessing_win_partial',
      description: 'Blessing won — right players, wrong order (wager returned)'
    };
  }

  // Loss
  return {
    status: 'lost',
    payout: 0,
    transactionType: null,
    description: null
  };
}

export default {
  placeBlessing,
  resolveBlessingsForWindow,
  refundBlessingsForWindow,
  getBlessingsForPlayer
};
