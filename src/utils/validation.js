/**
 * Validation utilities
 * Common validation functions used across services
 */

import { ValidationError } from './errors.js';

/**
 * Validate ISO date format (YYYY-MM-DD)
 *
 * @param {string} dateString - Date string to validate
 * @param {string} fieldName - Field name for error message (e.g., 'scorecard date')
 * @throws {ValidationError} If date is invalid
 */
export function validateISODate(dateString, fieldName = 'date') {
  // Check format with regex
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!isoDateRegex.test(dateString)) {
    throw new ValidationError(
      `Invalid ${fieldName} format. Expected YYYY-MM-DD, got: ${dateString}`,
      fieldName
    );
  }

  // Validate it's a real date
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new ValidationError(
      `Invalid ${fieldName}: ${dateString} is not a valid date`,
      fieldName
    );
  }

  // Validate year is reasonable (1900-2100)
  const year = date.getFullYear();
  if (year < 1900 || year > 2100) {
    throw new ValidationError(
      `Invalid ${fieldName}: Year ${year} is out of reasonable range (1900-2100)`,
      fieldName
    );
  }
}

/**
 * Validate email format
 *
 * @param {string} email - Email to validate
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If email is invalid
 */
export function validateEmail(email, fieldName = 'email') {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new ValidationError(
      `Invalid ${fieldName} format: ${email}`,
      fieldName
    );
  }
}

/**
 * Validate required field is not null/undefined/empty
 *
 * @param {any} value - Value to check
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If value is missing
 */
export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(
      `${fieldName} is required`,
      fieldName
    );
  }
}

/**
 * Validate number is within range
 *
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @param {string} fieldName - Field name for error message
 * @throws {ValidationError} If number is out of range
 */
export function validateRange(value, min, max, fieldName = 'value') {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(
      `${fieldName} must be a number`,
      fieldName
    );
  }

  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}, got: ${value}`,
      fieldName
    );
  }
}

export default {
  validateISODate,
  validateEmail,
  validateRequired,
  validateRange
};
