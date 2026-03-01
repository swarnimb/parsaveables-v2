import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { BusinessLogicError, DatabaseError } from '../../utils/errors.js';

const logger = createLogger('WindowService');

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

const WINDOW_DURATION_MINUTES = 5;
const EXPIRY_DAYS = 15;

/**
 * Open a new PULPy window.
 * Only one window may be open at a time.
 *
 * @param {number} playerId - Player opening the window
 * @returns {Promise<object>} Created window record
 * @throws {BusinessLogicError} If a window is already open
 */
export async function openWindow(playerId) {
  logger.info('Opening PULPy window', { playerId });

  try {
    // Check for any currently open window
    const { data: existing, error: checkError } = await supabase
      .from('pulpy_windows')
      .select('id, opened_by, closes_at')
      .eq('status', 'open')
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      const secondsLeft = Math.ceil(
        (new Date(existing.closes_at) - new Date()) / 1000
      );
      throw new BusinessLogicError(
        `A PULPy window is already open (${secondsLeft}s remaining)`
      );
    }

    const now = new Date();
    const closesAt = new Date(now.getTime() + WINDOW_DURATION_MINUTES * 60 * 1000);

    const { data: window, error: insertError } = await supabase
      .from('pulpy_windows')
      .insert({
        opened_by: playerId,
        opened_at: now.toISOString(),
        closes_at: closesAt.toISOString(),
        status: 'open'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logger.info('PULPy window opened', {
      windowId: window.id,
      playerId,
      closesAt: window.closes_at
    });

    return window;
  } catch (error) {
    if (error instanceof BusinessLogicError) throw error;
    logger.error('Failed to open window', { error: error.message, playerId });
    throw new DatabaseError('Failed to open window', error);
  }
}

/**
 * Get the currently active window (open or locked, not yet settled/expired).
 * Returns null if no active window exists.
 *
 * @returns {Promise<object|null>} Window record with secondsRemaining, or null
 */
export async function getActiveWindow() {
  try {
    const { data: window, error } = await supabase
      .from('pulpy_windows')
      .select('*')
      .in('status', ['open', 'locked'])
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!window) return null;

    const now = new Date();
    let secondsRemaining = null;

    if (window.status === 'open') {
      secondsRemaining = Math.max(
        0,
        Math.ceil((new Date(window.closes_at) - now) / 1000)
      );
    }

    return { ...window, secondsRemaining };
  } catch (error) {
    logger.error('Failed to get active window', { error: error.message });
    throw new DatabaseError('Failed to get active window', error);
  }
}

/**
 * Lock any open windows whose closes_at has passed.
 * Called as part of background processing (scorecard processing trigger, or cron).
 *
 * @returns {Promise<string[]>} IDs of windows that were locked
 */
export async function lockExpiredWindows() {
  logger.info('Checking for windows to lock');

  try {
    const now = new Date();

    const { data: toLock, error: fetchError } = await supabase
      .from('pulpy_windows')
      .select('id')
      .eq('status', 'open')
      .lt('closes_at', now.toISOString());

    if (fetchError) throw fetchError;
    if (!toLock || toLock.length === 0) return [];

    const ids = toLock.map(w => w.id);
    const lockedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateError } = await supabase
      .from('pulpy_windows')
      .update({ status: 'locked', locked_at: lockedAt, expires_at: expiresAt })
      .in('id', ids);

    if (updateError) throw updateError;

    logger.info('Windows locked', { count: ids.length, ids });

    return ids;
  } catch (error) {
    logger.error('Failed to lock expired windows', { error: error.message });
    throw new DatabaseError('Failed to lock expired windows', error);
  }
}

/**
 * Settle a window — resolves blessings and challenges for the matched round.
 * Called by processScorecard.js after finding a matching window.
 *
 * @param {string} windowId - Window UUID
 * @param {string} roundId - Round UUID that matched this window
 * @param {object} deps - Injected service dependencies (to avoid circular imports)
 * @param {Function} deps.resolveBlessingsForWindow
 * @param {Function} deps.resolveChallengesForWindow
 * @returns {Promise<object>} Settlement results
 */
export async function settleWindow(windowId, roundId, deps) {
  logger.info('Settling window', { windowId, roundId });

  try {
    const blessingResults = await deps.resolveBlessingsForWindow(windowId, roundId);
    const challengeResults = await deps.resolveChallengesForWindow(windowId, roundId);

    const { error: updateError } = await supabase
      .from('pulpy_windows')
      .update({
        status: 'settled',
        settled_by_round_id: roundId,
        settled_at: new Date().toISOString()
      })
      .eq('id', windowId);

    if (updateError) throw updateError;

    logger.info('Window settled', { windowId, roundId, blessingResults, challengeResults });

    return { blessingResults, challengeResults };
  } catch (error) {
    logger.error('Failed to settle window', { error: error.message, windowId, roundId });
    throw new DatabaseError('Failed to settle window', error);
  }
}

/**
 * Expire stale locked windows that have passed their 15-day expiry deadline.
 * Refunds all blessings and accepted challenge wagers.
 *
 * @param {object} deps - Injected service dependencies
 * @param {Function} deps.refundBlessingsForWindow
 * @param {Function} deps.refundChallengesForWindow
 * @returns {Promise<string[]>} IDs of windows that were expired
 */
export async function expireStaleWindows(deps) {
  logger.info('Checking for stale windows to expire');

  try {
    const now = new Date();

    const { data: toExpire, error: fetchError } = await supabase
      .from('pulpy_windows')
      .select('id')
      .eq('status', 'locked')
      .lt('expires_at', now.toISOString());

    if (fetchError) throw fetchError;
    if (!toExpire || toExpire.length === 0) return [];

    const expiredIds = [];

    for (const window of toExpire) {
      try {
        await deps.refundBlessingsForWindow(window.id);
        await deps.refundChallengesForWindow(window.id);

        const { error: updateError } = await supabase
          .from('pulpy_windows')
          .update({ status: 'expired' })
          .eq('id', window.id);

        if (updateError) throw updateError;

        expiredIds.push(window.id);
        logger.info('Window expired and refunded', { windowId: window.id });
      } catch (windowError) {
        logger.error('Failed to expire individual window', {
          windowId: window.id,
          error: windowError.message
        });
      }
    }

    return expiredIds;
  } catch (error) {
    logger.error('Failed to expire stale windows', { error: error.message });
    throw new DatabaseError('Failed to expire stale windows', error);
  }
}

export default {
  openWindow,
  getActiveWindow,
  lockExpiredWindows,
  settleWindow,
  expireStaleWindows
};
