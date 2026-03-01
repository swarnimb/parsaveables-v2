import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { BusinessLogicError, DatabaseError } from '../../utils/errors.js';
import * as pulpService from './pulpService.js';

const logger = createLogger('ChallengeService');

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * Issue a challenge to a higher-ranked player during an open PULPy window.
 *
 * State logic:
 * - If challengee already has a 'pending' challenge this window → 'waiting' (no PULPs deducted)
 * - Otherwise → 'pending', deduct wager from challenger immediately
 *
 * Rules:
 * - Window must be 'open'
 * - One challenge issued per window per challenger
 * - Can only challenge players ranked higher than self (current season leaderboard)
 * - Cannot challenge self
 *
 * @param {number} challengerId - Player issuing the challenge
 * @param {number} challengedId - Player being challenged
 * @param {string} windowId - PULPy window UUID
 * @param {number} wagerAmount - PULPs to wager (min 20)
 * @returns {Promise<object>} Created challenge record
 */
export async function issueChallenge(challengerId, challengedId, windowId, wagerAmount) {
  if (wagerAmount < 20) {
    throw new BusinessLogicError('Minimum challenge wager is 20 PULPs');
  }

  if (challengerId === challengedId) {
    throw new BusinessLogicError('Cannot challenge yourself');
  }

  logger.info('Issuing challenge', { challengerId, challengedId, windowId, wagerAmount });

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
      throw new BusinessLogicError('PULPy window is not open — challenges cannot be issued');
    }

    // One challenge issued per window per challenger
    const { data: existing, error: existError } = await supabase
      .from('challenges')
      .select('id')
      .eq('challenger_id', challengerId)
      .eq('window_id', windowId)
      .not('status', 'in', '("cancelled_waitlist")')
      .maybeSingle();

    if (existError) throw existError;
    if (existing) {
      throw new BusinessLogicError('You have already issued a challenge for this window');
    }

    // Validate challenger ranks lower than challengee in current season
    await validateRankOrder(challengerId, challengedId);

    // Check if challengee already has a pending challenge this window
    const { data: pendingForChallengee, error: pendingError } = await supabase
      .from('challenges')
      .select('id')
      .eq('challenged_id', challengedId)
      .eq('window_id', windowId)
      .eq('status', 'pending')
      .maybeSingle();

    if (pendingError) throw pendingError;

    const goesToWaitlist = !!pendingForChallengee;
    const initialStatus = goesToWaitlist ? 'waiting' : 'pending';

    // Deduct PULPs only if going to 'pending' (not waitlist)
    if (!goesToWaitlist) {
      await pulpService.deductTransaction(
        challengerId,
        wagerAmount,
        'challenge_loss', // Temporary — updated if they win
        `Challenge issued to player ${challengedId}`,
        { window_id: windowId, challenged_id: challengedId }
      );
    }

    const { data: challenge, error: insertError } = await supabase
      .from('challenges')
      .insert({
        challenger_id: challengerId,
        challenged_id: challengedId,
        window_id: windowId,
        wager_amount: wagerAmount,
        status: initialStatus
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info('Challenge issued', {
      challengeId: challenge.id,
      challengerId,
      challengedId,
      status: initialStatus,
      waitlisted: goesToWaitlist
    });

    return challenge;
  } catch (error) {
    if (error instanceof BusinessLogicError) throw error;
    logger.error('Failed to issue challenge', { error: error.message, challengerId });
    throw new DatabaseError('Failed to issue challenge', error);
  }
}

/**
 * Respond to a pending challenge (accept or decline).
 *
 * Accept: Deduct wager from challengee, status → 'accepted'
 * Decline: Burn 50% from challengee, refund challenger, status → 'declined'
 *
 * @param {string} challengeId - Challenge UUID
 * @param {number} challengedId - The responding player (must match challenged_id)
 * @param {boolean} accept - true = accept, false = decline
 * @returns {Promise<object>} Updated challenge record
 */
export async function respondToChallenge(challengeId, challengedId, accept) {
  logger.info('Responding to challenge', { challengeId, challengedId, accept });

  try {
    const { data: challenge, error: fetchError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (fetchError) throw fetchError;
    if (!challenge) throw new BusinessLogicError('Challenge not found');

    if (challenge.challenged_id !== challengedId) {
      throw new BusinessLogicError('Only the challenged player can respond');
    }

    if (challenge.status !== 'pending') {
      throw new BusinessLogicError(`Challenge is '${challenge.status}', cannot respond`);
    }

    // Validate window is still open
    const { data: window, error: windowError } = await supabase
      .from('pulpy_windows')
      .select('status')
      .eq('id', challenge.window_id)
      .single();

    if (windowError) throw windowError;
    if (window.status !== 'open') {
      throw new BusinessLogicError('Window is no longer open — challenge cannot be responded to');
    }

    if (accept) {
      await pulpService.deductTransaction(
        challengedId,
        challenge.wager_amount,
        'challenge_loss', // Temporary — updated if they win
        `Challenge accepted from player ${challenge.challenger_id}`,
        { challenge_id: challengeId, window_id: challenge.window_id }
      );

      const { data: updated, error: updateError } = await supabase
        .from('challenges')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', challengeId)
        .select()
        .single();

      if (updateError) throw updateError;

      logger.info('Challenge accepted', { challengeId, wager: challenge.wager_amount });

      return updated;
    } else {
      // Decline: 50% burn from challengee + full refund to challenger
      const burn = Math.floor(challenge.wager_amount * 0.5);

      await pulpService.deductTransaction(
        challengedId,
        burn,
        'challenge_declined_burn',
        `Cowardice tax for declining challenge from player ${challenge.challenger_id}`,
        { challenge_id: challengeId, window_id: challenge.window_id }
      );

      await pulpService.addTransaction(
        challenge.challenger_id,
        challenge.wager_amount,
        'admin_adjustment',
        'Challenge declined — wager refunded',
        { challenge_id: challengeId, window_id: challenge.window_id }
      );

      // Increment challenges_declined counter
      const { data: player } = await supabase
        .from('registered_players')
        .select('challenges_declined')
        .eq('id', challengedId)
        .single();

      if (player) {
        await supabase
          .from('registered_players')
          .update({ challenges_declined: (player.challenges_declined || 0) + 1 })
          .eq('id', challengedId);
      }

      const { data: updated, error: updateError } = await supabase
        .from('challenges')
        .update({
          status: 'declined',
          cowardice_tax_paid: burn,
          responded_at: new Date().toISOString()
        })
        .eq('id', challengeId)
        .select()
        .single();

      if (updateError) throw updateError;

      logger.info('Challenge declined', { challengeId, burn });

      return updated;
    }
  } catch (error) {
    if (error instanceof BusinessLogicError) throw error;
    logger.error('Failed to respond to challenge', { error: error.message, challengeId });
    throw new DatabaseError('Failed to respond to challenge', error);
  }
}

/**
 * Resolve all accepted challenges for a window after its matched round.
 *
 * Resolution rules:
 * - Lower total_strokes wins (gets both wagers)
 * - One player absent from round → absent player loses
 * - Both players absent → both refunded
 *
 * @param {string} windowId - PULPy window UUID
 * @param {string} roundId - Round UUID
 * @returns {Promise<object>} Resolution summary
 */
export async function resolveChallengesForWindow(windowId, roundId) {
  logger.info('Resolving challenges for window', { windowId, roundId });

  try {
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('window_id', windowId)
      .eq('status', 'accepted');

    if (error) throw error;

    const results = { total: challenges.length, resolved: 0, refunded: 0 };

    for (const challenge of challenges) {
      try {
        await resolveSingleChallenge(challenge, roundId);
        results.resolved++;
      } catch (err) {
        logger.error('Failed to resolve challenge', {
          challengeId: challenge.id,
          error: err.message
        });
      }
    }

    return results;
  } catch (error) {
    logger.error('Failed to resolve challenges for window', { error: error.message, windowId });
    throw new DatabaseError('Failed to resolve challenges for window', error);
  }
}

/**
 * Refund all accepted challenge wagers for an expired window (15-day expiry).
 *
 * @param {string} windowId - PULPy window UUID
 * @returns {Promise<number>} Number of challenges refunded
 */
export async function refundChallengesForWindow(windowId) {
  logger.info('Refunding challenges for expired window', { windowId });

  try {
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('window_id', windowId)
      .eq('status', 'accepted');

    if (error) throw error;

    for (const challenge of challenges) {
      await pulpService.addTransaction(
        challenge.challenger_id,
        challenge.wager_amount,
        'window_expired_refund',
        'PULPy window expired — challenge wager refunded',
        { challenge_id: challenge.id, window_id: windowId }
      );

      await pulpService.addTransaction(
        challenge.challenged_id,
        challenge.wager_amount,
        'window_expired_refund',
        'PULPy window expired — challenge wager refunded',
        { challenge_id: challenge.id, window_id: windowId }
      );

      await supabase
        .from('challenges')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', challenge.id);
    }

    return challenges.length;
  } catch (error) {
    logger.error('Failed to refund challenges', { error: error.message, windowId });
    throw new DatabaseError('Failed to refund challenges', error);
  }
}

/**
 * Apply window-close rules to pending/waiting challenges when a window locks.
 * Called right after a window transitions to 'locked'.
 *
 * - 'pending' (no response before close): both lose 50% burned
 * - 'waiting' (on waitlist, window closed): challenger fully refunded
 *
 * @param {string} windowId - PULPy window UUID
 * @returns {Promise<object>} Counts of challenges processed
 */
export async function applyWindowCloseRules(windowId) {
  logger.info('Applying window-close rules', { windowId });

  try {
    const { data: openChallenges, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('window_id', windowId)
      .in('status', ['pending', 'waiting']);

    if (error) throw error;

    let pendingBurned = 0;
    let waitingRefunded = 0;

    for (const challenge of openChallenges) {
      if (challenge.status === 'pending') {
        // Both lose 50% — anti-gaming for ignoring a challenge
        const burn = Math.floor(challenge.wager_amount * 0.5);

        // Challenger already paid; burn 50% (refund the remaining 50%)
        await pulpService.addTransaction(
          challenge.challenger_id,
          challenge.wager_amount - burn,
          'admin_adjustment',
          'Challenge timeout — 50% burned, remainder refunded',
          { challenge_id: challenge.id, window_id: windowId }
        );

        // Challengee never paid; deduct 50% from them
        await pulpService.deductTransaction(
          challenge.challenged_id,
          burn,
          'challenge_timeout_burn',
          'Challenge timeout — 50% burned for not responding',
          { challenge_id: challenge.id, window_id: windowId }
        );

        await supabase
          .from('challenges')
          .update({ status: 'expired_no_response', resolved_at: new Date().toISOString() })
          .eq('id', challenge.id);

        pendingBurned++;
      } else if (challenge.status === 'waiting') {
        // Full refund — challenger never paid (waiting means no deduction happened)
        // Nothing to refund financially, just cancel the record
        await supabase
          .from('challenges')
          .update({ status: 'cancelled_waitlist', resolved_at: new Date().toISOString() })
          .eq('id', challenge.id);

        waitingRefunded++;
      }
    }

    logger.info('Window-close rules applied', { windowId, pendingBurned, waitingRefunded });

    return { pendingBurned, waitingRefunded };
  } catch (error) {
    logger.error('Failed to apply window-close rules', { error: error.message, windowId });
    throw new DatabaseError('Failed to apply window-close rules', error);
  }
}

/**
 * Get challenges relevant to a player for the current/specified window.
 *
 * @param {number} playerId - Player ID
 * @param {string|null} windowId - Optional window filter
 * @returns {Promise<Array>} Challenges with player names
 */
export async function getChallengesForPlayer(playerId, windowId = null) {
  try {
    let query = supabase
      .from('challenges')
      .select(`
        *,
        challenger:registered_players!challenges_challenger_id_fkey(player_name),
        challenged:registered_players!challenges_challenged_id_fkey(player_name)
      `)
      .or(`challenger_id.eq.${playerId},challenged_id.eq.${playerId}`)
      .order('issued_at', { ascending: false });

    if (windowId) {
      query = query.eq('window_id', windowId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    logger.error('Failed to get player challenges', { error: error.message, playerId });
    throw new DatabaseError('Failed to get player challenges', error);
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Resolve a single accepted challenge against the matched round.
 */
async function resolveSingleChallenge(challenge, roundId) {
  // Get both players' scores from player_rounds
  const { data: rounds, error } = await supabase
    .from('player_rounds')
    .select('total_strokes, registered_players!inner(id)')
    .eq('round_id', roundId)
    .in('registered_players.id', [challenge.challenger_id, challenge.challenged_id]);

  if (error) throw error;

  const challengerRound = rounds.find(r => r.registered_players.id === challenge.challenger_id);
  const challengedRound = rounds.find(r => r.registered_players.id === challenge.challenged_id);

  const totalPayout = challenge.wager_amount * 2;
  const now = new Date().toISOString();

  if (!challengerRound && !challengedRound) {
    // Both absent → refund both
    await pulpService.addTransaction(
      challenge.challenger_id,
      challenge.wager_amount,
      'admin_adjustment',
      'Both players absent from round — challenge refunded',
      { challenge_id: challenge.id, round_id: roundId }
    );
    await pulpService.addTransaction(
      challenge.challenged_id,
      challenge.wager_amount,
      'admin_adjustment',
      'Both players absent from round — challenge refunded',
      { challenge_id: challenge.id, round_id: roundId }
    );

    await supabase
      .from('challenges')
      .update({ status: 'resolved', winner_id: null, round_id: roundId, resolved_at: now })
      .eq('id', challenge.id);

    return;
  }

  // One absent → present player wins
  if (!challengerRound) {
    await awardChallengeWin(challenge.challenged_id, challenge.challenger_id, totalPayout, challenge.id, roundId, challenge.window_id);
    return;
  }
  if (!challengedRound) {
    await awardChallengeWin(challenge.challenger_id, challenge.challenged_id, totalPayout, challenge.id, roundId, challenge.window_id);
    return;
  }

  // Both present — lower strokes wins
  if (challengerRound.total_strokes < challengedRound.total_strokes) {
    await awardChallengeWin(challenge.challenger_id, challenge.challenged_id, totalPayout, challenge.id, roundId, challenge.window_id);
  } else if (challengedRound.total_strokes < challengerRound.total_strokes) {
    await awardChallengeWin(challenge.challenged_id, challenge.challenger_id, totalPayout, challenge.id, roundId, challenge.window_id);
  } else {
    // Tie — both refunded
    await pulpService.addTransaction(
      challenge.challenger_id,
      challenge.wager_amount,
      'admin_adjustment',
      'Challenge tied — wager refunded',
      { challenge_id: challenge.id, round_id: roundId }
    );
    await pulpService.addTransaction(
      challenge.challenged_id,
      challenge.wager_amount,
      'admin_adjustment',
      'Challenge tied — wager refunded',
      { challenge_id: challenge.id, round_id: roundId }
    );

    await supabase
      .from('challenges')
      .update({ status: 'resolved', winner_id: null, round_id: roundId, resolved_at: new Date().toISOString() })
      .eq('id', challenge.id);
  }
}

async function awardChallengeWin(winnerId, loserId, totalPayout, challengeId, roundId, windowId) {
  await pulpService.addTransaction(
    winnerId,
    totalPayout,
    'challenge_win',
    `Challenge won against player ${loserId}`,
    { challenge_id: challengeId, round_id: roundId, window_id: windowId }
  );

  await supabase
    .from('challenges')
    .update({
      status: 'resolved',
      winner_id: winnerId,
      round_id: roundId,
      resolved_at: new Date().toISOString()
    })
    .eq('id', challengeId);
}

/**
 * Validate that challenger ranks lower than challengee on the current season leaderboard.
 * Throws BusinessLogicError if challenger ranks higher (or equal).
 */
async function validateRankOrder(challengerId, challengedId) {
  // Get current year season event
  const currentYear = new Date().getFullYear();

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('type', 'season')
    .ilike('name', `%${currentYear}%`)
    .maybeSingle();

  if (eventError) throw eventError;

  if (!event) {
    // No season found — skip rank validation
    logger.warn('No current season found for rank validation');
    return;
  }

  // Aggregate season points for both players
  const { data: leaderboard, error: lbError } = await supabase
    .from('player_rounds')
    .select('player_id, final_total')
    .eq('event_id', event.id)
    .in('player_id', [challengerId, challengedId]);

  if (lbError) throw lbError;

  const totals = {};
  for (const row of leaderboard || []) {
    totals[row.player_id] = (totals[row.player_id] || 0) + (row.final_total || 0);
  }

  const challengerTotal = totals[challengerId] || 0;
  const challengedTotal = totals[challengedId] || 0;

  // Challengee must rank higher (more points)
  if (challengerTotal >= challengedTotal) {
    throw new BusinessLogicError(
      'You can only challenge players ranked higher than you on the season leaderboard'
    );
  }
}

export default {
  issueChallenge,
  respondToChallenge,
  resolveChallengesForWindow,
  refundChallengesForWindow,
  applyWindowCloseRules,
  getChallengesForPlayer
};
