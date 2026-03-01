import { createClient } from '@supabase/supabase-js';
import * as windowService from '../../src/services/gamification/windowService.js';
import { createLogger } from '../../src/utils/logger.js';
import { BusinessLogicError } from '../../src/utils/errors.js';

const logger = createLogger('API:OpenWindow');

/**
 * POST /api/pulp/openWindow
 * Opens a new 5-minute PULPy window. Only one can be open at a time.
 * Any authenticated player can open a window.
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

    logger.info('Opening PULPy window', { playerId: player.id });

    const window = await windowService.openWindow(player.id);

    return res.status(200).json({ success: true, window });
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Failed to open window', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
