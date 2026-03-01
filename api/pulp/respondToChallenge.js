import { createClient } from '@supabase/supabase-js';
import * as challengeService from '../../src/services/gamification/challengeService.js';
import { createLogger } from '../../src/utils/logger.js';
import { BusinessLogicError } from '../../src/utils/errors.js';

const logger = createLogger('API:RespondToChallenge');

/**
 * POST /api/pulp/respondToChallenge
 * Accept or decline a pending challenge during an open PULPy window.
 *
 * Body: { challengeId, accept }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing authorization header' });

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: player, error: playerError } = await supabase
      .from('registered_players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) return res.status(404).json({ error: 'Player not found' });

    const { challengeId, accept } = req.body;

    if (!challengeId || typeof accept !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields: challengeId, accept (boolean)' });
    }

    logger.info('Responding to challenge', { challengedId: player.id, challengeId, accept });

    const challenge = await challengeService.respondToChallenge(
      challengeId,
      player.id,
      accept
    );

    logger.info('Challenge response recorded', { challengeId, accept });

    return res.status(200).json({ success: true, challenge });
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      logger.warn('Business logic error', { error: error.message });
      return res.status(400).json({ error: error.message });
    }
    logger.error('Failed to respond to challenge', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
