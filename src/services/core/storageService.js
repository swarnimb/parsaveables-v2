/**
 * Storage Service
 * Handles file uploads to Supabase Storage
 */

import { createClient } from '@supabase/supabase-js';
import config from '../../config/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('StorageService');

// Initialize Supabase client for storage operations
const supabase = createClient(config.supabase.url, config.supabase.anonKey);

/**
 * Upload scorecard image to Supabase Storage
 *
 * @param {string} base64DataUrl - Image as base64 data URL (from Gmail)
 * @param {string} filename - Filename for the uploaded image
 * @returns {Promise<string>} Public URL of uploaded image
 */
export async function uploadScorecardImage(base64DataUrl, filename) {
  logger.info('Uploading scorecard image', { filename });

  try {
    // Extract base64 data from data URL
    // Format: data:image/jpeg;base64,/9j/4AAQ...
    const matches = base64DataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);

    if (!matches) {
      throw new Error('Invalid base64 data URL format');
    }

    const mimeType = matches[1];  // e.g., 'image/jpeg'
    const base64Data = matches[2]; // Base64 string without prefix

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    logger.debug('Image data extracted', {
      mimeType,
      sizeBytes: buffer.length,
      sizeMB: (buffer.length / 1024 / 1024).toFixed(2)
    });

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('scorecards')
      .upload(filename, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // Cache for 1 year (images don't change)
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      logger.error('Supabase Storage upload failed', { error: error.message });
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('scorecards')
      .getPublicUrl(filename);

    logger.info('Image uploaded successfully', {
      filename,
      publicUrl,
      sizeMB: (buffer.length / 1024 / 1024).toFixed(2)
    });

    return publicUrl;
  } catch (error) {
    logger.error('Failed to upload scorecard image', {
      filename,
      error: error.message
    });
    throw error;
  }
}

/**
 * Delete scorecard image from Supabase Storage
 *
 * @param {string} filename - Filename to delete
 * @returns {Promise<void>}
 */
export async function deleteScorecardImage(filename) {
  logger.info('Deleting scorecard image', { filename });

  try {
    const { error } = await supabase.storage
      .from('scorecards')
      .remove([filename]);

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }

    logger.info('Image deleted successfully', { filename });
  } catch (error) {
    logger.error('Failed to delete scorecard image', {
      filename,
      error: error.message
    });
    throw error;
  }
}

/**
 * Generate unique filename for scorecard image
 *
 * @param {string} courseName - Course name from scorecard
 * @param {string} date - Date from scorecard (YYYY-MM-DD)
 * @returns {string} Unique filename
 */
export function generateScorecardFilename(courseName, date) {
  // Sanitize course name (remove special characters)
  const sanitizedCourse = courseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Format: bryant-lake-2025-01-15-abc123.jpg
  const timestamp = Date.now().toString(36); // Short unique ID
  return `${sanitizedCourse}-${date}-${timestamp}.jpg`;
}

export default {
  uploadScorecardImage,
  deleteScorecardImage,
  generateScorecardFilename
};
