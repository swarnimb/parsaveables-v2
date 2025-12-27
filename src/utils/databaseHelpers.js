/**
 * Database Helper Utilities
 * Wrapper functions for Supabase queries with consistent error handling
 */

import { DatabaseError } from './errors.js';

/**
 * Execute Supabase query and return data
 * Throws DatabaseError if query fails
 *
 * @param {Function} queryFn - Function that returns a Supabase query builder
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<Array>} Query results
 * @throws {DatabaseError} If query fails
 *
 * @example
 * const players = await executeQuery(
 *   () => supabase.from('players').select('*'),
 *   'Failed to fetch players'
 * );
 */
export async function executeQuery(queryFn, errorMessage = 'Database query failed') {
  const { data, error } = await queryFn();

  if (error) {
    throw new DatabaseError(errorMessage, error);
  }

  return data;
}

/**
 * Execute Supabase query expecting a single result
 * Throws DatabaseError if query fails or returns no results
 *
 * @param {Function} queryFn - Function that returns a Supabase query builder with .single()
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<Object>} Single query result
 * @throws {DatabaseError} If query fails or no result found
 *
 * @example
 * const player = await executeQuerySingle(
 *   () => supabase.from('players').select('*').eq('id', 1).single(),
 *   'Player not found'
 * );
 */
export async function executeQuerySingle(queryFn, errorMessage = 'Database query failed') {
  const { data, error } = await queryFn();

  if (error) {
    // PGRST116 = no rows returned (not found)
    if (error.code === 'PGRST116') {
      throw new DatabaseError(`${errorMessage}: No results found`, error);
    }
    throw new DatabaseError(errorMessage, error);
  }

  if (!data) {
    throw new DatabaseError(`${errorMessage}: No results found`);
  }

  return data;
}

/**
 * Execute Supabase query that may return no results (optional)
 * Returns null if no results found, throws only on actual errors
 *
 * @param {Function} queryFn - Function that returns a Supabase query builder with .single()
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<Object|null>} Single query result or null
 * @throws {DatabaseError} If query fails (excluding not found)
 *
 * @example
 * const event = await executeQueryOptional(
 *   () => supabase.from('events').select('*').eq('name', 'Tournament').single(),
 *   'Failed to fetch event'
 * );
 * // Returns null if no event found, throws only on actual database errors
 */
export async function executeQueryOptional(queryFn, errorMessage = 'Database query failed') {
  const { data, error } = await queryFn();

  if (error) {
    // PGRST116 = no rows returned (this is OK for optional queries)
    if (error.code === 'PGRST116') {
      return null;
    }
    // Any other error is a real problem
    throw new DatabaseError(errorMessage, error);
  }

  return data || null;
}

/**
 * Execute Supabase insert/update/delete mutation
 * Throws DatabaseError if mutation fails
 *
 * @param {Function} mutationFn - Function that returns a Supabase mutation
 * @param {string} errorMessage - Custom error message
 * @returns {Promise<any>} Mutation result
 * @throws {DatabaseError} If mutation fails
 *
 * @example
 * await executeMutation(
 *   () => supabase.from('players').insert({ name: 'John' }),
 *   'Failed to insert player'
 * );
 */
export async function executeMutation(mutationFn, errorMessage = 'Database mutation failed') {
  const { data, error } = await mutationFn();

  if (error) {
    throw new DatabaseError(errorMessage, error);
  }

  return data;
}

export default {
  executeQuery,
  executeQuerySingle,
  executeQueryOptional,
  executeMutation
};
