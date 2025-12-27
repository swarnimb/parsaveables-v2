import { supabase } from '../supabase.js';
import { createLogger } from '../../utils/logger.js';
import { BusinessLogicError, DatabaseError } from '../../utils/errors.js';
import * as pulpService from './pulpService.js';

const logger = createLogger('AdvantageService');

/**
 * Advantage Service - PULP advantages shop
 *
 * Players can purchase advantages from the catalog:
 * - Mulligan (120 PULPs) - Extra mulligan for the round
 * - Anti-Mulligan (200 PULPs) - Force opponent to re-shoot
 * - Cancel (200 PULPs) - Cancel last mulligan/anti-mulligan
 * - Bag Trump (100 PULPs) - Change bag-carry decision
 * - Shotgun Buddy (100 PULPs) - Make someone shotgun a beer
 *
 * Rules:
 * - One advantage per type limit (can't stack)
 * - All advantages expire in 24 hours
 * - Can be used once per purchase
 */

/**
 * Get all available advantages from catalog
 *
 * @returns {Promise<Array>} List of purchasable advantages
 */
export async function getAvailableCatalog() {
  try {
    const { data, error } = await supabase
      .from('advantage_catalog')
      .select('*')
      .order('pulp_cost', { ascending: true });

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('Failed to get advantage catalog', { error: error.message });
    throw new DatabaseError('Failed to get advantage catalog', error);
  }
}

/**
 * Purchase an advantage from the catalog
 *
 * @param {number} playerId - Player ID
 * @param {string} advantageKey - Advantage key from catalog
 * @returns {Promise<object>} Updated player with new advantage
 * @throws {BusinessLogicError} If insufficient PULPs or already owns advantage
 */
export async function purchaseAdvantage(playerId, advantageKey) {
  logger.info('Purchasing advantage', { playerId, advantageKey });

  try {
    // Get advantage from catalog
    const { data: advantage, error: catalogError } = await supabase
      .from('advantage_catalog')
      .select('*')
      .eq('advantage_key', advantageKey)
      .single();

    if (catalogError) throw catalogError;
    if (!advantage) {
      throw new BusinessLogicError(`Advantage "${advantageKey}" not found in catalog`);
    }

    // Get player's current advantages
    const { data: player, error: fetchError } = await supabase
      .from('registered_players')
      .select('active_advantages, player_name')
      .eq('id', playerId)
      .single();

    if (fetchError) throw fetchError;
    if (!player) throw new Error(`Player ${playerId} not found`);

    // Check if player already has this advantage (one per type limit)
    const activeAdvantages = player.active_advantages || [];
    const existingAdvantage = activeAdvantages.find(
      adv => adv.advantage_key === advantageKey && !adv.used_at && new Date(adv.expires_at) > new Date()
    );

    if (existingAdvantage) {
      throw new BusinessLogicError(
        `You already have an active ${advantage.name} (expires ${new Date(existingAdvantage.expires_at).toLocaleString()})`
      );
    }

    // Deduct PULPs from player
    await pulpService.deductTransaction(
      playerId,
      advantage.pulp_cost,
      'advantage_purchase',
      `Purchased ${advantage.name}`,
      { advantage_key: advantageKey }
    );

    // Create advantage instance
    const purchasedAt = new Date();
    const expiresAt = new Date(purchasedAt.getTime() + advantage.expiration_hours * 60 * 60 * 1000);

    const newAdvantage = {
      advantage_key: advantageKey,
      purchased_at: purchasedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      used_at: null,
      round_id: null
    };

    // Add to active_advantages array
    const updatedAdvantages = [...activeAdvantages, newAdvantage];

    // Update player
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('registered_players')
      .update({ active_advantages: updatedAdvantages })
      .eq('id', playerId)
      .select()
      .single();

    if (updateError) throw updateError;

    logger.info('Advantage purchased successfully', {
      playerId,
      advantageKey,
      cost: advantage.pulp_cost,
      expiresAt
    });

    return {
      player: updatedPlayer,
      advantage: newAdvantage,
      catalogEntry: advantage
    };
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    logger.error('Failed to purchase advantage', { error: error.message, playerId, advantageKey });
    throw new DatabaseError('Failed to purchase advantage', error);
  }
}

/**
 * Get player's advantages (active, expired, or used)
 *
 * @param {number} playerId - Player ID
 * @param {object} options - Filter options
 * @param {string} options.status - Filter by status: 'active', 'expired', 'used', or 'all' (default: 'active')
 * @returns {Promise<Array>} Player's advantages with catalog details
 */
export async function getPlayerAdvantages(playerId, options = {}) {
  const { status = 'active' } = options;

  try {
    // Get player's advantages
    const { data: player, error: fetchError } = await supabase
      .from('registered_players')
      .select('active_advantages')
      .eq('id', playerId)
      .single();

    if (fetchError) throw fetchError;
    if (!player) throw new Error(`Player ${playerId} not found`);

    const advantages = player.active_advantages || [];
    const now = new Date();

    // Filter by status
    let filtered = advantages;

    if (status === 'active') {
      filtered = advantages.filter(adv => !adv.used_at && new Date(adv.expires_at) > now);
    } else if (status === 'expired') {
      filtered = advantages.filter(adv => !adv.used_at && new Date(adv.expires_at) <= now);
    } else if (status === 'used') {
      filtered = advantages.filter(adv => adv.used_at !== null);
    }
    // 'all' returns everything

    // Enrich with catalog details
    if (filtered.length === 0) {
      return [];
    }

    const advantageKeys = [...new Set(filtered.map(adv => adv.advantage_key))];
    const { data: catalogEntries, error: catalogError } = await supabase
      .from('advantage_catalog')
      .select('*')
      .in('advantage_key', advantageKeys);

    if (catalogError) throw catalogError;

    // Merge catalog details
    const enriched = filtered.map(adv => {
      const catalogEntry = catalogEntries.find(cat => cat.advantage_key === adv.advantage_key);
      return {
        ...adv,
        name: catalogEntry?.name,
        description: catalogEntry?.description,
        icon: catalogEntry?.icon,
        pulp_cost: catalogEntry?.pulp_cost
      };
    });

    logger.debug('Fetched player advantages', {
      playerId,
      status,
      count: enriched.length
    });

    return enriched;
  } catch (error) {
    logger.error('Failed to get player advantages', { error: error.message, playerId });
    throw new DatabaseError('Failed to get player advantages', error);
  }
}

/**
 * Use an advantage during a round
 *
 * @param {number} playerId - Player ID
 * @param {string} advantageKey - Advantage key to use
 * @param {string} roundId - Round UUID where advantage was used
 * @param {object} metadata - Usage metadata (target player, hole number, etc.)
 * @returns {Promise<object>} Updated player record
 * @throws {BusinessLogicError} If advantage not found or expired
 */
export async function useAdvantage(playerId, advantageKey, roundId, metadata = {}) {
  logger.info('Using advantage', { playerId, advantageKey, roundId });

  try {
    // Get player's advantages
    const { data: player, error: fetchError } = await supabase
      .from('registered_players')
      .select('active_advantages, player_name')
      .eq('id', playerId)
      .single();

    if (fetchError) throw fetchError;
    if (!player) throw new Error(`Player ${playerId} not found`);

    const advantages = player.active_advantages || [];
    const now = new Date();

    // Find the advantage
    const advantageIndex = advantages.findIndex(
      adv => adv.advantage_key === advantageKey && !adv.used_at && new Date(adv.expires_at) > now
    );

    if (advantageIndex === -1) {
      throw new BusinessLogicError(
        `No active ${advantageKey} advantage found (may be used or expired)`
      );
    }

    // Mark as used
    const updatedAdvantages = [...advantages];
    updatedAdvantages[advantageIndex] = {
      ...updatedAdvantages[advantageIndex],
      used_at: new Date().toISOString(),
      round_id: roundId,
      usage_metadata: metadata
    };

    // Update player
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('registered_players')
      .update({ active_advantages: updatedAdvantages })
      .eq('id', playerId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log usage in round's advantages_used JSONB
    const { data: round, error: roundFetchError } = await supabase
      .from('rounds')
      .select('advantages_used')
      .eq('id', roundId)
      .single();

    if (roundFetchError) throw roundFetchError;

    const advantagesUsed = round?.advantages_used || [];
    advantagesUsed.push({
      player_id: playerId,
      player_name: player.player_name,
      advantage_key: advantageKey,
      used_at: updatedAdvantages[advantageIndex].used_at,
      metadata
    });

    const { error: roundUpdateError } = await supabase
      .from('rounds')
      .update({ advantages_used: advantagesUsed })
      .eq('id', roundId);

    if (roundUpdateError) throw roundUpdateError;

    logger.info('Advantage used successfully', {
      playerId,
      advantageKey,
      roundId
    });

    return updatedPlayer;
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    logger.error('Failed to use advantage', { error: error.message, playerId, advantageKey });
    throw new DatabaseError('Failed to use advantage', error);
  }
}

/**
 * Expire old advantages for a player
 * Called periodically or when checking player's advantages
 *
 * @param {number} playerId - Player ID
 * @returns {Promise<object>} Result with expired count
 */
export async function expireAdvantages(playerId) {
  logger.info('Expiring old advantages', { playerId });

  try {
    // Get player's advantages
    const { data: player, error: fetchError } = await supabase
      .from('registered_players')
      .select('active_advantages, player_name')
      .eq('id', playerId)
      .single();

    if (fetchError) throw fetchError;
    if (!player) throw new Error(`Player ${playerId} not found`);

    const advantages = player.active_advantages || [];
    const now = new Date();

    // Filter out expired advantages
    const expired = advantages.filter(adv => !adv.used_at && new Date(adv.expires_at) <= now);
    const remaining = advantages.filter(adv => adv.used_at || new Date(adv.expires_at) > now);

    if (expired.length === 0) {
      logger.debug('No expired advantages to clean up', { playerId });
      return {
        expiredCount: 0,
        expired: []
      };
    }

    // Update player with remaining advantages
    const { error: updateError } = await supabase
      .from('registered_players')
      .update({ active_advantages: remaining })
      .eq('id', playerId);

    if (updateError) throw updateError;

    // Log each expired advantage as a transaction (for transparency)
    for (const adv of expired) {
      // Get advantage cost from catalog
      const { data: catalogEntry } = await supabase
        .from('advantage_catalog')
        .select('pulp_cost, name')
        .eq('advantage_key', adv.advantage_key)
        .single();

      await pulpService.addTransaction(
        playerId,
        0, // No refund
        'advantage_expired',
        `${catalogEntry?.name || adv.advantage_key} expired unused`,
        {
          advantage_key: adv.advantage_key,
          purchased_at: adv.purchased_at,
          expires_at: adv.expires_at
        }
      );
    }

    logger.info('Advantages expired successfully', {
      playerId,
      expiredCount: expired.length
    });

    return {
      expiredCount: expired.length,
      expired
    };
  } catch (error) {
    logger.error('Failed to expire advantages', { error: error.message, playerId });
    throw new DatabaseError('Failed to expire advantages', error);
  }
}

/**
 * Check if player has a specific active advantage
 *
 * @param {number} playerId - Player ID
 * @param {string} advantageKey - Advantage key to check
 * @returns {Promise<boolean>} True if player has active advantage
 */
export async function hasActiveAdvantage(playerId, advantageKey) {
  try {
    const advantages = await getPlayerAdvantages(playerId, { status: 'active' });
    return advantages.some(adv => adv.advantage_key === advantageKey);
  } catch (error) {
    logger.error('Failed to check for active advantage', { error: error.message, playerId, advantageKey });
    throw new DatabaseError('Failed to check for active advantage', error);
  }
}

export default {
  getAvailableCatalog,
  purchaseAdvantage,
  getPlayerAdvantages,
  useAdvantage,
  expireAdvantages,
  hasActiveAdvantage
};
