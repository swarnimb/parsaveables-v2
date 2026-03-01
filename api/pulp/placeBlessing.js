import { createClient } from '@supabase/supabase-js';
import * as blessingService from '../../src/services/gamification/blessingService.js';
import { createLogger } from '../../src/utils/logger.js';
import { BusinessLogicError } from '../../src/utils/errors.js';

const logger = createLogger('API:PlaceBlessing');

/**
 * POST /api/pulp/placeBlessing
 * Place a blessing (predict top 3 finishers) during an open PULPy window.
 *
 * Body: { windowId, predictions: { first, second, third }, wagerAmount, eventId }
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

    const { windowId, predictions, wagerAmount, eventId } = req.body;

    if (!windowId || !predictions || wagerAmount === undefined || !eventId) {
      return res.status(400).json({ error: 'Missing required fields: windowId, predictions, wagerAmount, eventId' });
    }

    logger.info('Placing blessing', { playerId: player.id, windowId, wagerAmount });

    const blessing = await blessingService.placeBlessing(
      player.id,
      windowId,
      predictions,
      wagerAmount,
      eventId
    );

    return res.status(200).json({ success: true, blessing });
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Failed to place blessing', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
