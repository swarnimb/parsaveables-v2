import { createClient } from '@supabase/supabase-js';
import * as pulpService from '../../src/services/gamification/pulpService.js';
import { createLogger } from '../../src/utils/logger.js';

const logger = createLogger('API:GetTransactions');

/**
 * API Endpoint: Get player's PULP transaction history
 * GET /api/pulp/getTransactions
 *
 * Query params:
 * - limit (optional): Max transactions to return (default: 50, max: 100)
 * - offset (optional): Pagination offset (default: 0)
 *
 * Returns: Transaction history
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
      .select('id, player_name')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      logger.error('Player not found for user', { userId: user.id, error: playerError?.message });
      return res.status(404).json({ error: 'Player not found' });
    }

    const playerId = player.id;

    // Parse query params
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100
    const offset = parseInt(req.query.offset) || 0;

    logger.info('Getting transaction history', { playerId, limit, offset });

    // Get transactions
    const transactions = await pulpService.getTransactionHistory(playerId, { limit, offset });

    logger.info('Transactions retrieved', { playerId, count: transactions.length });

    return res.status(200).json({
      success: true,
      playerId,
      playerName: player.player_name,
      transactions,
      limit,
      offset
    });

  } catch (error) {
    logger.error('Failed to get transactions', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
