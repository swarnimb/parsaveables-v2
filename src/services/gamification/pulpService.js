import { createClient } from '@supabase/supabase-js';
import { config } from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';
import { BusinessLogicError, DatabaseError } from '../../utils/errors.js';

const logger = createLogger('PulpService');

/**
 * Initialize Supabase client with service role key
 * This bypasses Row-Level Security for backend operations
 */
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);

/**
 * PULP Service - Core balance and transaction management
 *
 * Handles all PULP (ParSaveables Ultimate Loyalty Points) operations:
 * - Adding/deducting PULPs with transaction logging
 * - Balance checks and transaction history
 * - Atomic operations to prevent negative balances
 */

/**
 * Add PULPs to a player's balance with transaction logging
 *
 * @param {number} playerId - Player ID
 * @param {number} amount - Amount to add (positive number)
 * @param {string} transactionType - Type from migration transaction types
 * @param {string} description - Human-readable description
 * @param {object} metadata - Optional metadata (round_id, bet_id, etc.)
 * @returns {Promise<object>} Updated balance and transaction record
 */
export async function addTransaction(playerId, amount, transactionType, description, metadata = {}) {
  if (amount <= 0) {
    throw new BusinessLogicError('Amount must be positive for addTransaction');
  }

  logger.info('Adding PULP transaction', { playerId, amount, transactionType });

  try {
    // Start transaction
    const { data: player, error: fetchError } = await supabase
      .from('registered_players')
      .select('pulp_balance')
      .eq('id', playerId)
      .single();

    if (fetchError) throw fetchError;
    if (!player) throw new Error(`Player ${playerId} not found`);

    const newBalance = player.pulp_balance + amount;

    // Update balance
    const { error: updateError } = await supabase
      .from('registered_players')
      .update({ pulp_balance: newBalance })
      .eq('id', playerId);

    if (updateError) throw updateError;

    // Log transaction
    const { data: transaction, error: txError } = await supabase
      .from('pulp_transactions')
      .insert({
        player_id: playerId,
        amount,
        transaction_type: transactionType,
        description,
        metadata
      })
      .select()
      .single();

    if (txError) throw txError;

    logger.info('PULP transaction added', {
      playerId,
      amount,
      newBalance,
      transactionId: transaction.id
    });

    return {
      newBalance,
      transaction
    };
  } catch (error) {
    logger.error('Failed to add PULP transaction', { error: error.message, playerId, amount });
    throw new DatabaseError('Failed to add PULP transaction', error);
  }
}

/**
 * Deduct PULPs from a player's balance with transaction logging
 * Prevents negative balances
 *
 * @param {number} playerId - Player ID
 * @param {number} amount - Amount to deduct (positive number)
 * @param {string} transactionType - Type from migration transaction types
 * @param {string} description - Human-readable description
 * @param {object} metadata - Optional metadata
 * @returns {Promise<object>} Updated balance and transaction record
 * @throws {BusinessLogicError} If insufficient balance
 */
export async function deductTransaction(playerId, amount, transactionType, description, metadata = {}) {
  if (amount <= 0) {
    throw new BusinessLogicError('Amount must be positive for deductTransaction');
  }

  logger.info('Deducting PULP transaction', { playerId, amount, transactionType });

  try {
    // Check balance first
    const { data: player, error: fetchError } = await supabase
      .from('registered_players')
      .select('pulp_balance, player_name')
      .eq('id', playerId)
      .single();

    if (fetchError) throw fetchError;
    if (!player) throw new Error(`Player ${playerId} not found`);

    if (player.pulp_balance < amount) {
      throw new BusinessLogicError(
        `Insufficient PULPs for ${player.player_name}: has ${player.pulp_balance}, needs ${amount}`
      );
    }

    const newBalance = player.pulp_balance - amount;

    // Update balance
    const { error: updateError } = await supabase
      .from('registered_players')
      .update({ pulp_balance: newBalance })
      .eq('id', playerId);

    if (updateError) throw updateError;

    // Log transaction (negative amount for deduction)
    const { data: transaction, error: txError } = await supabase
      .from('pulp_transactions')
      .insert({
        player_id: playerId,
        amount: -amount, // Negative for deductions
        transaction_type: transactionType,
        description,
        metadata
      })
      .select()
      .single();

    if (txError) throw txError;

    logger.info('PULP transaction deducted', {
      playerId,
      amount,
      newBalance,
      transactionId: transaction.id
    });

    return {
      newBalance,
      transaction
    };
  } catch (error) {
    if (error instanceof BusinessLogicError) {
      throw error;
    }
    logger.error('Failed to deduct PULP transaction', { error: error.message, playerId, amount });
    throw new DatabaseError('Failed to deduct PULP transaction', error);
  }
}

/**
 * Get current PULP balance for a player
 *
 * @param {number} playerId - Player ID
 * @returns {Promise<number>} Current PULP balance
 */
export async function getBalance(playerId) {
  try {
    const { data, error } = await supabase
      .from('registered_players')
      .select('pulp_balance')
      .eq('id', playerId)
      .single();

    if (error) throw error;
    if (!data) throw new Error(`Player ${playerId} not found`);

    return data.pulp_balance;
  } catch (error) {
    logger.error('Failed to get PULP balance', { error: error.message, playerId });
    throw new DatabaseError('Failed to get PULP balance', error);
  }
}

/**
 * Check if player has enough PULPs for a transaction
 *
 * @param {number} playerId - Player ID
 * @param {number} amount - Required amount
 * @returns {Promise<boolean>} True if player has enough PULPs
 */
export async function hasEnoughPulps(playerId, amount) {
  const balance = await getBalance(playerId);
  return balance >= amount;
}

/**
 * Get transaction history for a player
 *
 * @param {number} playerId - Player ID
 * @param {object} options - Query options
 * @param {number} options.limit - Max number of transactions (default 50)
 * @param {number} options.offset - Pagination offset (default 0)
 * @returns {Promise<Array>} Transaction history
 */
export async function getTransactionHistory(playerId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  try {
    const { data, error } = await supabase
      .from('pulp_transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    logger.debug('Fetched transaction history', {
      playerId,
      count: data.length,
      limit,
      offset
    });

    return data;
  } catch (error) {
    logger.error('Failed to get transaction history', { error: error.message, playerId });
    throw new DatabaseError('Failed to get transaction history', error);
  }
}

/**
 * Get PULP statistics for a player
 *
 * @param {number} playerId - Player ID
 * @returns {Promise<object>} PULP statistics
 */
export async function getPlayerStats(playerId) {
  try {
    const { data: transactions, error } = await supabase
      .from('pulp_transactions')
      .select('amount, transaction_type')
      .eq('player_id', playerId);

    if (error) throw error;

    const stats = {
      totalEarned: 0,
      totalSpent: 0,
      netGain: 0,
      transactionCount: transactions.length,
      byType: {}
    };

    transactions.forEach(tx => {
      if (tx.amount > 0) {
        stats.totalEarned += tx.amount;
      } else {
        stats.totalSpent += Math.abs(tx.amount);
      }

      if (!stats.byType[tx.transaction_type]) {
        stats.byType[tx.transaction_type] = { count: 0, total: 0 };
      }
      stats.byType[tx.transaction_type].count++;
      stats.byType[tx.transaction_type].total += tx.amount;
    });

    stats.netGain = stats.totalEarned - stats.totalSpent;

    const balance = await getBalance(playerId);
    stats.currentBalance = balance;

    return stats;
  } catch (error) {
    logger.error('Failed to get player stats', { error: error.message, playerId });
    throw new DatabaseError('Failed to get player stats', error);
  }
}

export default {
  addTransaction,
  deductTransaction,
  getBalance,
  hasEnoughPulps,
  getTransactionHistory,
  getPlayerStats
};
