import { createClient } from '@supabase/supabase-js';
import * as challengeService from '../../services/gamification/challengeService.js';
import * as gamificationService from '../../services/gamification/index.js';
import { createLogger } from '../../utils/logger.js';
import { BusinessLogicError } from '../../utils/errors.js';

const logger = createLogger('API:RespondToChallenge');

/**
 * API Endpoint: Respond to a challenge (accept or reject)
 * POST /api/pulp/respondToChallenge
 *
 * Request body:
 * {
 *   challengeId: string,  // Challenge UUID
 *   accept: boolean       // true to accept, false to reject
 * }
 *
 * Returns: Updated challenge record
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

    // Get player ID from user (challenged player)
    const { data: player, error: playerError } = await supabase
      .from('registered_players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      logger.error('Player not found for user', { userId: user.id, error: playerError?.message });
      return res.status(404).json({ error: 'Player not found' });
    }

    const challengedId = player.id;

    // Validate request body
    const { challengeId, accept } = req.body;

    if (!challengeId || typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields (challengeId, accept)' });
    }

    logger.info('Responding to challenge', { challengedId, challengeId, accept });

    // Respond to challenge
    const challenge = await challengeService.respondToChallenge(
      challengeId,
      challengedId,
      accept
    );

    // Award weekly interaction bonus (non-blocking)
    try {
      const bonusAwarded = await gamificationService.awardWeeklyInteractionBonus(challengedId);
      if (bonusAwarded) {
        logger.info('Weekly interaction bonus awarded', { playerId: challengedId });
      }
    } catch (error) {
      logger.error('Failed to award weekly interaction bonus', { error: error.message });
      // Don't block response if bonus fails
    }

    logger.info('Challenge response recorded', { challengeId, challengedId, accept });

    return res.status(200).json({
      success: true,
      challenge
    });

  } catch (error) {
    if (error instanceof BusinessLogicError) {
      logger.warn('Business logic error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }

    logger.error('Failed to respond to challenge', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
