/**
 * Timeout wrapper for Supabase queries to prevent mobile network hangs
 *
 * Mobile browsers can hang 30-60s on network requests when:
 * - Switching between apps (background throttling)
 * - Poor network conditions
 * - localStorage access delays
 *
 * This wrapper ensures all database calls fail fast instead of hanging indefinitely.
 */

/**
 * Wraps a Supabase query with timeout protection
 * @param {Function} queryFn - Async function that returns a Supabase query result
 * @param {number} timeoutMs - Timeout in milliseconds (default: 8000ms)
 * @returns {Promise} - Query result or timeout error
 */
export const queryWithTimeout = async (queryFn, timeoutMs = 8000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
  })

  try {
    const result = await Promise.race([queryFn(), timeoutPromise])
    return result
  } catch (error) {
    if (error.message === 'Query timeout') {
      console.warn(`Supabase query timed out after ${timeoutMs}ms`)
      // Return error format matching Supabase response structure
      return { data: null, error: { message: 'Request timed out' } }
    }
    throw error
  }
}

/**
 * Wraps an auth query with timeout protection
 * Auth queries can return different structures, so handle both cases
 */
export const authQueryWithTimeout = async (queryFn, timeoutMs = 8000) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Auth query timeout')), timeoutMs)
  })

  try {
    const result = await Promise.race([queryFn(), timeoutPromise])
    return result
  } catch (error) {
    if (error.message === 'Auth query timeout') {
      console.warn(`Supabase auth query timed out after ${timeoutMs}ms`)
      // Return error format matching Supabase auth response
      return { data: { user: null, session: null }, error: { message: 'Request timed out' } }
    }
    throw error
  }
}
