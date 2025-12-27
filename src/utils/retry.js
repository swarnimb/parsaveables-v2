/**
 * Retry utility with exponential backoff
 * Used for resilient API calls to external services (Claude Vision, Gmail, etc.)
 */

/**
 * Determine if an error should trigger a retry attempt
 *
 * @param {Error} error - Error object from failed operation
 * @returns {boolean} True if error is retryable
 */
export function isRetryableError(error) {
  // Network errors (connection refused, timeout, DNS)
  if (error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET') {
    return true;
  }

  // HTTP status codes that should be retried
  const retryableStatusCodes = [
    408, // Request Timeout
    429, // Too Many Requests (rate limit)
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504  // Gateway Timeout
  ];

  if (error.response && retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  // Anthropic API specific errors
  if (error.status && retryableStatusCodes.includes(error.status)) {
    return true;
  }

  // Rate limit errors (common in APIs)
  if (error.message && error.message.toLowerCase().includes('rate limit')) {
    return true;
  }

  // Default: don't retry
  return false;
}

/**
 * Retry a function with exponential backoff
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {Function} options.shouldRetry - Custom retry check function (default: isRetryableError)
 * @param {string} options.context - Context for logging (optional)
 * @returns {Promise<any>} Result of successful function call
 * @throws {Error} Last error if all retries fail
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    shouldRetry = isRetryableError,
    context = 'Operation'
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attempt the operation
      const result = await fn();

      // Success - return result
      if (attempt > 0) {
        console.log(`${context} succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`);
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === maxRetries;
      const shouldRetryThisError = shouldRetry(error);

      if (isLastAttempt || !shouldRetryThisError) {
        // Don't retry - throw error
        if (attempt > 0) {
          console.error(`${context} failed after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}:`, error.message);
        }
        throw error;
      }

      // Log retry attempt
      console.warn(
        `${context} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
        `retrying in ${delay}ms...`,
        error.message
      );

      // Wait before retrying (exponential backoff)
      await sleep(delay);

      // Double the delay for next attempt (exponential backoff)
      delay *= 2;
    }
  }

  // Should never reach here, but just in case
  throw lastError;
}

/**
 * Sleep utility for delays
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  retryWithBackoff,
  isRetryableError
};
