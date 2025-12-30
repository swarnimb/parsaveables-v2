import { createClient } from '@supabase/supabase-js';
import * as advantageService from '../../src/services/gamification/advantageService.js';
import * as gamificationService from '../../src/services/gamification/index.js';
import { createLogger } from '../../src/utils/logger.js';
import { BusinessLogicError } from '../../src/utils/errors.js';

const logger = createLogger('API:PurchaseAdvantage');

/**
 * API Endpoint: Purchase an advantage from the catalog
 * POST /api/pulp/purchaseAdvantage
 *
 * Request body:
 * {
 *   advantageKey: string  // Advantage key from catalog (mulligan, anti_mulligan, etc.)
 * }
 *
 * Returns: Updated player record with new advantage
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
    const { advantageKey } = req.body;

    if (!advantageKey) {
      return res.status(400).json({ error: 'Missing required field: advantageKey' });
    }

    logger.info('Purchasing advantage', { playerId, advantageKey });

    // Purchase advantage
    const result = await advantageService.purchaseAdvantage(playerId, advantageKey);

    // Award weekly interaction bonus (non-blocking)
    try {
      const bonusAwarded = await gamificationService.awardWeeklyInteractionBonus(playerId);
      if (bonusAwarded) {
        logger.info('Weekly interaction bonus awarded', { playerId });
      }
    } catch (error) {
      logger.error('Failed to award weekly interaction bonus', { error: error.message });
      // Don't block purchase if bonus fails
    }

    logger.info('Advantage purchased successfully', {
      playerId,
      advantageKey,
      cost: result.catalogEntry.pulp_cost
    });

    return res.status(200).json({
      success: true,
      advantage: result.advantage,
      catalogEntry: result.catalogEntry,
      player: result.player
    });

  } catch (error) {
    if (error instanceof BusinessLogicError) {
      logger.warn('Business logic error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }

    logger.error('Failed to purchase advantage', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
