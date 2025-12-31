import { createClient } from '@supabase/supabase-js';
import * as bettingService from '../../src/services/gamification/bettingService.js';
import * as gamificationService from '../../src/services/gamification/index.js';
import { createLogger } from '../../src/utils/logger.js';
import { BusinessLogicError } from '../../src/utils/errors.js';

const logger = createLogger('API:PlaceBet');

/**
 * API Endpoint: Place a bet on round outcome
 * POST /api/pulp/placeBet
 *
 * Request body:
 * {
 *   roundId: string,
 *   eventId: number,
 *   predictions: {
 *     first: string,
 *     second: string,
 *     third: string
 *   },
 *   wagerAmount: number
 * }
 *
 * Returns: Created bet record
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    // Create Supabase client with user's session
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error('Authentication failed', { error: userError?.message });
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get player ID from user
    const { data: player, error: playerError } = await supabase
      .from('registered_players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      logger.error('Player not found for user', { userId: user.id, error: playerError?.message });
      return res.status(404).json({ error: 'Player not found' });
    }

    const playerId = player.id;

    // Validate request body
    const { roundId, eventId, predictions, wagerAmount } = req.body;

    // Note: roundId can be null for "next round" bets
    if (eventId === undefined || !predictions || wagerAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!predictions.first || !predictions.second || !predictions.third) {
      return res.status(400).json({ error: 'Missing prediction fields (first, second, third)' });
    }

    logger.info('Placing bet', { playerId, roundId, eventId, wagerAmount });

    // Place bet
    const bet = await bettingService.placeBet(
      playerId,
      roundId,
      eventId,
      predictions,
      wagerAmount
    );

    // Award weekly interaction bonus (non-blocking)
    try {
      const bonusAwarded = await gamificationService.awardWeeklyInteractionBonus(playerId);
      if (bonusAwarded) {
        logger.info('Weekly interaction bonus awarded', { playerId });
      }
    } catch (error) {
      logger.error('Failed to award weekly interaction bonus', { error: error.message });
      // Don't block bet placement if bonus fails
    }

    logger.info('Bet placed successfully', { betId: bet.id, playerId });

    return res.status(200).json({
      success: true,
      bet
    });

  } catch (error) {
    if (error instanceof BusinessLogicError) {
      logger.warn('Business logic error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }

    logger.error('Failed to place bet', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
