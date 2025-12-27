/**
 * Custom error classes for ParSaveables
 * Provides better error context and type checking
 */

/**
 * Base error class for all ParSaveables errors
 */
export class ParSaveablesError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - thrown when input validation fails
 *
 * @example
 * throw new ValidationError('Invalid email format', 'email');
 */
export class ValidationError extends ParSaveablesError {
  constructor(message, field = null) {
    super(message);
    this.field = field;
    this.statusCode = 400; // Bad Request
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      field: this.field
    };
  }
}

/**
 * External API error - thrown when third-party API call fails
 *
 * @example
 * throw new ExternalAPIError('Anthropic Vision', 'Rate limit exceeded', originalError);
 */
export class ExternalAPIError extends ParSaveablesError {
  constructor(service, message, originalError = null) {
    const fullMessage = `${service} API error: ${message}`;
    super(fullMessage);
    this.service = service;
    this.originalError = originalError;
    this.statusCode = 502; // Bad Gateway
  }

  toJSON() {
    return {
      error: this.name,
      service: this.service,
      message: this.message,
      originalError: this.originalError?.message
    };
  }
}

/**
 * Database error - thrown when Supabase operation fails
 *
 * @example
 * throw new DatabaseError('Failed to insert round', originalError);
 */
export class DatabaseError extends ParSaveablesError {
  constructor(message, originalError = null) {
    super(message);
    this.originalError = originalError;
    this.statusCode = 500; // Internal Server Error
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      details: this.originalError?.message
    };
  }
}

/**
 * Authentication error - thrown when auth fails
 *
 * @example
 * throw new AuthenticationError('Invalid token');
 */
export class AuthenticationError extends ParSaveablesError {
  constructor(message) {
    super(message);
    this.statusCode = 401; // Unauthorized
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message
    };
  }
}

/**
 * Authorization error - thrown when user lacks permissions
 *
 * @example
 * throw new AuthorizationError('Admin access required');
 */
export class AuthorizationError extends ParSaveablesError {
  constructor(message) {
    super(message);
    this.statusCode = 403; // Forbidden
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message
    };
  }
}

/**
 * Not Found error - thrown when resource doesn't exist
 *
 * @example
 * throw new NotFoundError('Player', playerId);
 */
export class NotFoundError extends ParSaveablesError {
  constructor(resource, identifier = null) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message);
    this.resource = resource;
    this.identifier = identifier;
    this.statusCode = 404; // Not Found
  }

  toJSON() {
    return {
      error: this.name,
      resource: this.resource,
      identifier: this.identifier,
      message: this.message
    };
  }
}

/**
 * Business Logic error - thrown when business rules are violated
 *
 * @example
 * throw new BusinessLogicError('Cannot process scorecard from future date');
 */
export class BusinessLogicError extends ParSaveablesError {
  constructor(message, details = null) {
    super(message);
    this.details = details;
    this.statusCode = 422; // Unprocessable Entity
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      details: this.details
    };
  }
}

export default {
  ParSaveablesError,
  ValidationError,
  ExternalAPIError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BusinessLogicError
};
