import * as windowService from '../../src/services/gamification/windowService.js';
import { createLogger } from '../../src/utils/logger.js';

const logger = createLogger('API:GetWindow');

/**
 * GET /api/pulp/getWindow
 * Returns the currently active PULPy window (open or locked), or null if none.
 * Public endpoint — no auth required (used for polling by all clients).
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const activeWindow = await windowService.getActiveWindow();

    return res.status(200).json({
      success: true,
      window: activeWindow  // null if no active window
    });
  } catch (error) {
    logger.error('Failed to get active window', { error: error.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
