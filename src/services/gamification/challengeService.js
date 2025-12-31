import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { BusinessLogicError, DatabaseError } from '../../utils/errors.js';
import * as pulpService from './pulpService.js';

const logger = createLogger('ChallengeService');

/**
 * Initialize Supabase client with service role key
 * This bypasses Row-Level Security for backend operations
 */
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Challenge Service - Head-to-head PULP challenges
 *
 * Players can challenge each other for PULP wagers:
 * - Challenger issues challenge and commits wager
 * - Challenged player accepts (commits wager) or rejects (pays 50% cowardice tax)
 * - After round, winner (lower score) gets 2x wager
 * - Once per 3 months per pair
 */

/**
 * Issue a challenge to another player
 *
 * @param {number} challengerId - Player issuing the challenge
 * @param {number} challengedId - Player being challenged
 * @param {string} roundId - Round UUID
 * @param {number} wagerAmount - PULPs to wager (min 20)
 * @returns {Promise<object>} Created challenge record
 * @throws {BusinessLogicError} If validation fails
 */
export async function issueChallenge(challengerId, challengedId, roundId, wagerAmount) {
  // Validate wager amount
  if (wagerAmount < 20) {
    throw new BusinessLogicError('Minimum challenge wager is 20 PULPs');
  }

  // Validate different players
  if (challengerId === challengedId) {
    throw new BusinessLogicError('Cannot challenge yourself');
  }

  logger.info('Issuing challenge', {
    challengerId,
    challengedId,
    roundId,
    wagerAmount
  });

  try {
    // Check if challenge already exists for this round
    const { data: existingChallenge } = await supabase
      .from('challenges')
      .select('id')
      .eq('round_id', roundId)
      .or(`challenger_id.eq.${challengerId},challenged_id.eq.${challengerId}`)
      .or(`challenger_id.eq.${challengedId},challenged_id.eq.${challengedId}`)
      .single();

    if (existingChallenge) {
      throw new BusinessLogicError('Challenge already exists for this round between these players');
    }

    // TODO: Add 3-month cooldown check (optional - can implement later)

    // Deduct wager from challenger immediately
    await pulpService.deductTransaction(
      challengerId,
      wagerAmount,
      'challenge_loss', // Temporary - will change if they win
      `Challenge issued to player ${challengedId}`,
      { round_id: roundId, challenged_id: challengedId }
    );

    // Create challenge record
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .insert({
        round_id: roundId,
        challenger_id: challengerId,
        challenged_id: challengedId,
        wager_amount: wagerAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (challengeError) throw challengeError;

    logger.info('Challenge issued successfully', {
      challengeId: challenge.id,
      challengerId,
      challengedId,
      wagerAmount
    });

    return challenge;
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    logger.error('Failed to issue challenge', { error: error.message, challengerId, challengedId });
    throw new DatabaseError('Failed to issue challenge', error);
  }
}

/**
 * Respond to a challenge (accept or reject)
 *
 * @param {string} challengeId - Challenge UUID
 * @param {number} challengedId - Player responding (must be the challenged player)
 * @param {boolean} accept - True to accept, false to reject
 * @returns {Promise<object>} Updated challenge record
 * @throws {BusinessLogicError} If validation fails
 */
export async function respondToChallenge(challengeId, challengedId, accept) {
  logger.info('Responding to challenge', {
    challengeId,
    challengedId,
    accept
  });

  try {
    // Get challenge
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchError) throw fetchError;
    if (!challenge) {
      throw new BusinessLogicError('Challenge not found');
    }

    // Validate this is the challenged player
    if (challenge.challenged_id !== challengedId) {
      throw new BusinessLogicError('Only the challenged player can respond');
    }

    // Validate challenge is pending
    if (challenge.status !== 'pending') {
      throw new BusinessLogicError(`Challenge is ${challenge.status}, cannot respond`);
    }

    if (accept) {
      // Accept: Deduct wager from challenged player
      await pulpService.deductTransaction(
        challengedId,
        challenge.wager_amount,
        'challenge_loss', // Temporary - will change if they win
        `Challenge accepted from player ${challenge.challenger_id}`,
        { challenge_id: challengeId, round_id: challenge.round_id }
      );

      // Update challenge status
      const { data: updated, error: updateError } = await supabase
        .from('challenges')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single();

      if (updateError) throw updateError;

      logger.info('Challenge accepted', {
        challengeId,
        challengedId,
        wagerAmount: challenge.wager_amount
      });

      return updated;
    } else {
      // Reject: Pay 50% cowardice tax
      const cowardiceTax = Math.floor(challenge.wager_amount * 0.5);

      await pulpService.deductTransaction(
        challengedId,
        cowardiceTax,
        'challenge_rejected_penalty',
        `Cowardice tax for rejecting challenge from player ${challenge.challenger_id}`,
        { challenge_id: challengeId, round_id: challenge.round_id }
      );

      // Refund full wager to challenger
      await pulpService.addTransaction(
        challenge.challenger_id,
        challenge.wager_amount,
        'admin_adjustment', // Not a win, just refund
        `Challenge rejected - wager refunded`,
        { challenge_id: challengeId, round_id: challenge.round_id }
      );

      // Update challenge status and increment challenges_declined
      const { data: updated, error: updateError } = await supabase
        .from('challenges')
        .update({
          status: 'rejected',
          cowardice_tax_paid: cowardiceTax,
          responded_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Increment challenges_declined counter
      // Fetch current value first
      const { data: player, error: fetchError } = await supabase
        .from('registered_players')
        .select('challenges_declined')
        .eq('id', challengedId)
        .single();

      if (fetchError) {
        logger.error('Failed to fetch challenges_declined counter', { error: fetchError.message, challengedId });
      } else {
        // Increment and update
        const newCount = (player.challenges_declined || 0) + 1;
        const { error: updateCounterError } = await supabase
          .from('registered_players')
          .update({
            challenges_declined: newCount
          })
          .eq('id', challengedId);

        if (updateCounterError) {
          logger.error('Failed to update challenges_declined counter', { error: updateCounterError.message, challengedId });
        }
      }

      logger.info('Challenge rejected', {
        challengeId,
        challengedId,
        cowardiceTax
      });

      return updated;
    }
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    logger.error('Failed to respond to challenge', { error: error.message, challengeId });
    throw new DatabaseError('Failed to respond to challenge', error);
  }
}

/**
 * Resolve a challenge after round completion
 * Winner = player with better (lower) score
 *
 * @param {string} challengeId - Challenge UUID
 * @returns {Promise<object>} Resolution result
 */
export async function resolveChallenge(challengeId) {
  logger.info('Resolving challenge', { challengeId });

  try {
    // Get challenge
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchError) throw fetchError;
    if (!challenge) {
      throw new BusinessLogicError('Challenge not found');
    }

    // Validate challenge is accepted
    if (challenge.status !== 'accepted') {
      throw new BusinessLogicError(`Cannot resolve ${challenge.status} challenge`);
    }

    // Get player scores from player_rounds
    const { data: playerRounds, error: roundsError } = await supabase
      .from('player_rounds')
      .select('player_name, total_strokes, registered_players!inner(id)')
      .eq('round_id', challenge.round_id)
      .in('registered_players.id', [challenge.challenger_id, challenge.challenged_id]);

    if (roundsError) throw roundsError;

    if (playerRounds.length !== 2) {
      throw new BusinessLogicError('Both players must have completed the round');
    }

    // Determine winner (lower strokes wins)
    const challengerRound = playerRounds.find(
      pr => pr.registered_players.id === challenge.challenger_id
    );
    const challengedRound = playerRounds.find(
      pr => pr.registered_players.id === challenge.challenged_id
    );

    let winnerId;
    let loserId;

    if (challengerRound.total_strokes < challengedRound.total_strokes) {
      winnerId = challenge.challenger_id;
      loserId = challenge.challenged_id;
    } else if (challengedRound.total_strokes < challengerRound.total_strokes) {
      winnerId = challenge.challenged_id;
      loserId = challenge.challenger_id;
    } else {
      // Tie - both get wager back
      await pulpService.addTransaction(
        challenge.challenger_id,
        challenge.wager_amount,
        'admin_adjustment',
        'Challenge tied - wager refunded',
        { challenge_id: challengeId, round_id: challenge.round_id }
      );

      await pulpService.addTransaction(
        challenge.challenged_id,
        challenge.wager_amount,
        'admin_adjustment',
        'Challenge tied - wager refunded',
        { challenge_id: challengeId, round_id: challenge.round_id }
      );

      const { data: updated, error: updateError } = await supabase
        .from('challenges')
        .update({
          status: 'resolved',
          winner_id: null,
          resolved_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single();

      if (updateError) throw updateError;

      logger.info('Challenge tied', { challengeId });

      return {
        result: 'tie',
        challenge: updated
      };
    }

    // Award 2x wager to winner
    const totalPayout = challenge.wager_amount * 2;

    await pulpService.addTransaction(
      winnerId,
      totalPayout,
      'challenge_win',
      `Challenge won against player ${loserId}`,
      { challenge_id: challengeId, round_id: challenge.round_id }
    );

    // Update challenge status
    const { data: updated, error: updateError } = await supabase
      .from('challenges')
      .update({
        status: 'resolved',
        winner_id: winnerId,
        resolved_at: new Date().toISOString()
      })
      .eq('id', challengeId)
      .select()
      .single();

    if (updateError) throw updateError;

    logger.info('Challenge resolved', {
      challengeId,
      winnerId,
      loserId,
      payout: totalPayout
    });

    return {
      result: 'winner',
      winnerId,
      loserId,
      payout: totalPayout,
      challenge: updated
    };
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    logger.error('Failed to resolve challenge', { error: error.message, challengeId });
    throw new DatabaseError('Failed to resolve challenge', error);
  }
}

/**
 * Get all challenges for a round
 *
 * @param {string} roundId - Round UUID
 * @returns {Promise<Array>} List of challenges
 */
export async function getChallengesForRound(roundId) {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        challenger:registered_players!challenges_challenger_id_fkey(player_name),
        challenged:registered_players!challenges_challenged_id_fkey(player_name)
      `)
      .eq('round_id', roundId)
      .order('issued_at', { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Failed to get challenges for round', { error: error.message, roundId });
    throw new DatabaseError('Failed to get challenges for round', error);
  }
}

/**
 * Get pending challenges for a player (awaiting their response)
 *
 * @param {number} playerId - Player ID
 * @returns {Promise<Array>} Pending challenges
 */
export async function getPendingChallengesForPlayer(playerId) {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        challenger:registered_players!challenges_challenger_id_fkey(player_name),
        challenged:registered_players!challenges_challenged_id_fkey(player_name)
      `)
      .eq('challenged_id', playerId)
      .eq('status', 'pending')
      .order('issued_at', { ascending: false });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Failed to get pending challenges', { error: error.message, playerId });
    throw new DatabaseError('Failed to get pending challenges', error);
  }
}

/**
 * Get challenge history for a player
 *
 * @param {number} playerId - Player ID
 * @param {object} options - Query options
 * @returns {Promise<Array>} Player's challenge history
 */
export async function getChallengesForPlayer(playerId, options = {}) {
  const { limit = 20, offset = 0 } = options;

  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .or(`challenger_id.eq.${playerId},challenged_id.eq.${playerId}`)
      .order('issued_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Failed to get player challenges', { error: error.message, playerId });
    throw new DatabaseError('Failed to get player challenges', error);
  }
}

export default {
  issueChallenge,
  respondToChallenge,
  resolveChallenge,
  getChallengesForRound,
  getPendingChallengesForPlayer,
  getChallengesForPlayer
};
