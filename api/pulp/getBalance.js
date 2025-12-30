import { createClient } from '@supabase/supabase-js';
import * as pulpService from '../../src/services/gamification/pulpService.js';
import { createLogger } from '../../src/utils/logger.js';

const logger = createLogger('API:GetBalance');

/**
 * API Endpoint: Get player's PULP balance
 * GET /api/pulp/getBalance
 *
 * Query params:
 * - playerId (optional): Get balance for specific player (defaults to current user)
 *
 * Returns: PULP balance and player info
 */
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only accept GET
  if (req.method !== 'GET') {
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
      .select('id, player_name, pulp_balance')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      logger.error('Player not found for user', { userId: user.id, error: playerError?.message });
      return res.status(404).json({ error: 'Player not found' });
    }

    const playerId = player.id;

    // Check if requesting specific player's balance (optional)
    const requestedPlayerId = req.query.playerId ? parseInt(req.query.playerId) : playerId;

    logger.info('Getting PULP balance', { playerId: requestedPlayerId });

    // Get balance
    const balance = await pulpService.getBalance(requestedPlayerId);

    // Get player stats
    const stats = await pulpService.getPlayerStats(requestedPlayerId);

    logger.info('Balance retrieved', { playerId: requestedPlayerId, balance });

    return res.status(200).json({
      success: true,
      playerId: requestedPlayerId,
      playerName: player.player_name,
      balance,
      stats
    });

  } catch (error) {
    logger.error('Failed to get balance', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
