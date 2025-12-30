import { createClient } from '@supabase/supabase-js';
import * as bettingService from '../../src/services/gamification/bettingService.js';
import { createLogger } from '../../src/utils/logger.js';
import { BusinessLogicError } from '../../src/utils/errors.js';

const logger = createLogger('API:LockBetting');

/**
 * API Endpoint: Lock betting for an event (admin only)
 * POST /api/pulp/lockBetting
 *
 * Request body:
 * {
 *   eventId: number  // Event ID to lock betting for
 * }
 *
 * Returns: Number of bets locked
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

    // Check if user is admin
    // TODO: Implement proper admin check
    // For now, we'll allow all authenticated users to lock betting
    // In production, check against an 'admins' table or user metadata

    // Validate request body
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'Missing required field: eventId' });
    }

    logger.info('Locking betting for event', { eventId, userId: user.id });

    // Lock betting
    const betsLocked = await bettingService.lockBetting(eventId);

    logger.info('Betting locked successfully', { eventId, betsLocked });

    return res.status(200).json({
      success: true,
      eventId,
      betsLocked
    });

  } catch (error) {
    if (error instanceof BusinessLogicError) {
      logger.warn('Business logic error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }

    logger.error('Failed to lock betting', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
