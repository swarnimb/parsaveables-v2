import { google } from 'googleapis';
import config from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('EmailService');

/**
 * Initialize Gmail API client with OAuth2 credentials
 * Uses refresh token for persistent access
 *
 * @returns {Object} Authenticated Gmail API client
 */
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    'https://developers.google.com/oauthplayground' // Redirect URI used for obtaining refresh token
  );

  oauth2Client.setCredentials({
    refresh_token: config.gmail.refreshToken
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  return gmail;
}

/**
 * Check for new unread emails with image attachments
 * Searches for emails from specific sender (e.g., UDisc) with attachments
 *
 * @param {Object} options - Search options
 * @param {string} options.from - Email sender to filter (optional)
 * @param {string} options.subject - Subject filter (optional)
 * @param {number} options.maxResults - Maximum number of emails to return (default: 10)
 * @returns {Promise<Array<Object>>} Array of email objects with metadata
 */
export async function checkForNewEmails(options = {}) {
  const {
    from = null,
    subject = null,
    maxResults = 10
  } = options;

  logger.info('Checking for new emails', { from, subject, maxResults });

  try {
    const gmail = getGmailClient();

    // Build Gmail search query
    const queryParts = ['is:unread', 'has:attachment'];
    if (from) queryParts.push(`from:${from}`);
    if (subject) queryParts.push(`subject:${subject}`);

    const query = queryParts.join(' ');

    logger.debug('Gmail search query', { query });

    // Search for matching emails
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults
    });

    const messages = response.data.messages || [];

    logger.info('Emails found', { count: messages.length });

    if (messages.length === 0) {
      return [];
    }

    // Fetch full details for each message
    const emailDetails = await Promise.all(
      messages.map(async (message) => {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        return parseEmailDetails(details.data);
      })
    );

    logger.info('Email details retrieved', { count: emailDetails.length });

    return emailDetails;
  } catch (error) {
    logger.error('Failed to check emails', { error: error.message });
    throw new Error(`Gmail API error: ${error.message}`);
  }
}

/**
 * Parse Gmail API message object into simplified format
 *
 * @param {Object} message - Gmail API message object
 * @returns {Object} Parsed email object
 */
function parseEmailDetails(message) {
  const headers = message.payload.headers;

  const getHeader = (name) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : null;
  };

  const parsed = {
    id: message.id,
    threadId: message.threadId,
    from: getHeader('From'),
    to: getHeader('To'),
    subject: getHeader('Subject'),
    date: getHeader('Date'),
    snippet: message.snippet,
    attachments: []
  };

  // Extract attachments
  if (message.payload.parts) {
    parsed.attachments = extractAttachments(message.payload.parts, message.id);
  }

  logger.debug('Email parsed', {
    id: parsed.id,
    from: parsed.from,
    subject: parsed.subject,
    attachmentCount: parsed.attachments.length
  });

  return parsed;
}

/**
 * Recursively extract attachments from email parts
 *
 * @param {Array<Object>} parts - Email payload parts
 * @param {string} messageId - Gmail message ID
 * @returns {Array<Object>} Array of attachment objects
 */
function extractAttachments(parts, messageId) {
  const attachments = [];

  for (const part of parts) {
    // Check if part has attachment
    if (part.filename && part.body && part.body.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
        messageId: messageId
      });
    }

    // Recursively check nested parts (multipart emails)
    if (part.parts) {
      attachments.push(...extractAttachments(part.parts, messageId));
    }
  }

  return attachments;
}

/**
 * Extract image URL from email attachments
 * Downloads attachment and returns accessible URL or base64 data
 *
 * @param {string} messageId - Gmail message ID
 * @param {string} attachmentId - Attachment ID from Gmail API
 * @returns {Promise<string>} Image URL or base64 data URL
 */
export async function extractImageUrl(messageId, attachmentId, mimeType = 'image/jpeg') {
  logger.info('Extracting image URL', { messageId, attachmentId });

  try {
    const gmail = getGmailClient();

    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });

    const data = attachment.data.data;

    // Gmail API returns base64url encoded data
    // Convert to standard base64 for data URL
    const base64Data = data.replace(/-/g, '+').replace(/_/g, '/');

    // Return as data URL (works directly with Claude Vision API)
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    logger.info('Image URL extracted', {
      messageId,
      attachmentId,
      size: base64Data.length
    });

    return dataUrl;
  } catch (error) {
    logger.error('Failed to extract image', {
      messageId,
      attachmentId,
      error: error.message
    });
    throw new Error(`Failed to extract image: ${error.message}`);
  }
}

/**
 * Get all image attachments from an email
 * Filters for common image MIME types
 *
 * @param {Object} email - Email object from checkForNewEmails()
 * @returns {Promise<Array<Object>>} Array of {filename, mimeType, imageUrl}
 */
export async function getImageAttachments(email) {
  logger.info('Getting image attachments', {
    emailId: email.id,
    totalAttachments: email.attachments.length
  });

  const imageMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
  ];

  const imageAttachments = email.attachments.filter(att =>
    imageMimeTypes.includes(att.mimeType.toLowerCase())
  );

  logger.info('Image attachments filtered', { count: imageAttachments.length });

  // Download each image
  const images = await Promise.all(
    imageAttachments.map(async (attachment) => {
      const imageUrl = await extractImageUrl(email.id, attachment.attachmentId, attachment.mimeType);

      return {
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        imageUrl: imageUrl
      };
    })
  );

  return images;
}

/**
 * Mark email as read (processed)
 *
 * @param {string} messageId - Gmail message ID
 * @returns {Promise<void>}
 */
export async function markAsProcessed(messageId) {
  logger.info('Marking email as processed', { messageId });

  try {
    const gmail = getGmailClient();

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD']
      }
    });

    logger.info('Email marked as read', { messageId });
  } catch (error) {
    logger.error('Failed to mark email as read', {
      messageId,
      error: error.message
    });
    throw new Error(`Failed to mark email as processed: ${error.message}`);
  }
}

/**
 * Add label to email for organization
 *
 * @param {string} messageId - Gmail message ID
 * @param {string} labelName - Label name (e.g., 'ParSaveables/Processed', 'ParSaveables/Error')
 * @returns {Promise<void>}
 */
export async function addLabel(messageId, labelName) {
  logger.info('Adding label to email', { messageId, labelName });

  try {
    const gmail = getGmailClient();

    // First, get or create the label
    const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
    let label = labelsResponse.data.labels.find(l => l.name === labelName);

    if (!label) {
      // Create label if it doesn't exist
      logger.info('Creating new label', { labelName });

      const createResponse = await gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name: labelName,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show'
        }
      });

      label = createResponse.data;
    }

    // Add label to message
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [label.id]
      }
    });

    logger.info('Label added to email', { messageId, labelName, labelId: label.id });
  } catch (error) {
    logger.error('Failed to add label', {
      messageId,
      labelName,
      error: error.message
    });
    throw new Error(`Failed to add label: ${error.message}`);
  }
}

/**
 * Send error notification email to user
 *
 * @param {string} recipient - Recipient email address
 * @param {Object} errorDetails - Error information
 * @param {string} errorDetails.subject - Original email subject
 * @param {string} errorDetails.error - Error message
 * @param {string} errorDetails.timestamp - When error occurred
 * @returns {Promise<void>}
 */
export async function sendErrorNotification(recipient, errorDetails) {
  logger.info('Sending error notification', { recipient });

  const { subject, error, timestamp } = errorDetails;

  const emailContent = [
    'From: ParSaveables Bot <me>',
    `To: ${recipient}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ⚠️ ParSaveables Scorecard Processing Error`,
    '',
    '<html><body>',
    '<h2>Scorecard Processing Failed</h2>',
    '<p>There was an error processing your scorecard submission.</p>',
    '<hr>',
    `<p><strong>Original Subject:</strong> ${subject || 'N/A'}</p>`,
    `<p><strong>Error:</strong> ${error}</p>`,
    `<p><strong>Timestamp:</strong> ${timestamp || new Date().toISOString()}</p>`,
    '<hr>',
    '<p>Please check the following:</p>',
    '<ul>',
    '<li>Is the image a valid UDisc scorecard screenshot?</li>',
    '<li>Is the scorecard clearly visible and not blurry?</li>',
    '<li>Does the scorecard have at least 4 players?</li>',
    '</ul>',
    '<p>If the issue persists, please contact the league administrator.</p>',
    '</body></html>'
  ].join('\n');

  // Encode email in base64url format (required by Gmail API)
  const encodedEmail = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const gmail = getGmailClient();

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    logger.info('Error notification sent', { recipient });
  } catch (error) {
    logger.error('Failed to send error notification', {
      recipient,
      error: error.message
    });
    // Don't throw - we don't want email failures to break the flow
  }
}

/**
 * Send success notification email to user
 *
 * @param {string} recipient - Recipient email address
 * @param {Object} details - Processing details
 * @param {string} details.courseName - Course name
 * @param {string} details.eventName - Event/season name
 * @param {number} details.playerCount - Number of players processed
 * @param {string} details.dashboardUrl - URL to view results
 * @returns {Promise<void>}
 */
export async function sendSuccessNotification(recipient, details) {
  logger.info('Sending success notification', { recipient });

  const { courseName, eventName, playerCount, dashboardUrl } = details;

  const emailContent = [
    'From: ParSaveables Bot <me>',
    `To: ${recipient}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ParSaveables Scorecard Processed Successfully`,
    '',
    '<html><body>',
    '<h2>Scorecard Successfully Processed! 🎯</h2>',
    '<p>Your disc golf scorecard has been added to the leaderboard.</p>',
    '<hr>',
    `<p><strong>Course:</strong> ${courseName}</p>`,
    `<p><strong>Event:</strong> ${eventName}</p>`,
    `<p><strong>Players:</strong> ${playerCount}</p>`,
    '<hr>',
    `<p><a href="${dashboardUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Leaderboard</a></p>`,
    '<p style="color: #666; font-size: 12px; margin-top: 20px;">ParSaveables - Automated Disc Golf League Tracking</p>',
    '</body></html>'
  ].join('\n');

  const encodedEmail = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const gmail = getGmailClient();

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    });

    logger.info('Success notification sent', { recipient });
  } catch (error) {
    logger.error('Failed to send success notification', {
      recipient,
      error: error.message
    });
    // Don't throw - we don't want email failures to break the flow
  }
}

export default {
  checkForNewEmails,
  extractImageUrl,
  getImageAttachments,
  markAsProcessed,
  addLabel,
  sendErrorNotification,
  sendSuccessNotification
};
