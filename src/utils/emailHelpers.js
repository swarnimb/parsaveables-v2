/**
 * Email Utilities
 *
 * Provides reusable email formatting and encoding functions.
 * Eliminates duplicate base64url encoding logic in emailService.
 *
 * @module utils/emailHelpers
 */

/**
 * Encodes email content to base64url format for Gmail API
 *
 * Gmail API requires base64url encoding (base64 with URL-safe characters).
 * Replaces duplicate encoding logic throughout emailService.
 *
 * @param {string} content - Raw email content (RFC 2822 format)
 * @returns {string} Base64url encoded string
 *
 * @example
 * const encoded = encodeEmailContent('To: user@example.com\nSubject: Test\n\nBody');
 */
export function encodeEmailContent(content) {
  return Buffer.from(content)
    .toString('base64')
    .replace(/\+/g, '-')    // Replace + with -
    .replace(/\//g, '_')    // Replace / with _
    .replace(/=+$/, '');    // Remove trailing =
}

/**
 * Creates RFC 2822 formatted email message
 *
 * Formats email with proper headers for Gmail API.
 * Supports HTML email bodies.
 *
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.htmlBody - HTML email body content
 * @param {string} [options.from] - Sender email (optional, Gmail API uses authenticated user)
 * @returns {string} RFC 2822 formatted email message
 *
 * @example
 * const message = createEmailMessage({
 *   to: 'user@example.com',
 *   subject: 'Scorecard Processed',
 *   htmlBody: '<h1>Success!</h1>'
 * });
 */
export function createEmailMessage({ to, subject, htmlBody, from = null }) {
  const headers = [];

  if (from) {
    headers.push(`From: ${from}`);
  }

  headers.push(`To: ${to}`);
  headers.push(`Subject: ${subject}`);
  headers.push('Content-Type: text/html; charset=utf-8');
  headers.push('MIME-Version: 1.0');
  headers.push(''); // Empty line separates headers from body

  return [...headers, htmlBody].join('\r\n');
}

/**
 * Creates encoded email ready for Gmail API send
 *
 * Combines createEmailMessage and encodeEmailContent for convenience.
 *
 * @param {Object} options - Email options (same as createEmailMessage)
 * @returns {string} Base64url encoded email ready for Gmail API
 *
 * @example
 * const raw = createEncodedEmail({
 *   to: 'user@example.com',
 *   subject: 'Test',
 *   htmlBody: '<p>Content</p>'
 * });
 *
 * await gmail.users.messages.send({
 *   userId: 'me',
 *   requestBody: { raw }
 * });
 */
export function createEncodedEmail(options) {
  const message = createEmailMessage(options);
  return encodeEmailContent(message);
}

/**
 * Extracts email address from Gmail API format
 *
 * Gmail API returns addresses in format: "Name <email@example.com>"
 * This extracts just the email part.
 *
 * @param {string} emailString - Email string from Gmail API
 * @returns {string} Extracted email address
 *
 * @example
 * extractEmailAddress('John Doe <john@example.com>');  // 'john@example.com'
 * extractEmailAddress('simple@example.com');           // 'simple@example.com'
 */
export function extractEmailAddress(emailString) {
  if (!emailString) {
    return null;
  }

  // Match email in angle brackets: "Name <email@example.com>"
  const match = emailString.match(/<([^>]+)>/);
  if (match) {
    return match[1];
  }

  // No angle brackets, assume entire string is email
  return emailString.trim();
}

export default {
  encodeEmailContent,
  createEmailMessage,
  createEncodedEmail,
  extractEmailAddress
};
