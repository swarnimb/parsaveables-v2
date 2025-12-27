import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';
import { retryWithBackoff, isRetryableError } from '../utils/retry.js';
import { ExternalAPIError, ValidationError } from '../utils/errors.js';

const logger = createLogger('VisionService');

/**
 * Initialize Anthropic client
 */
const anthropic = new Anthropic({
  apiKey: config.anthropic.apiKey
});

/**
 * Prompt for extracting scorecard data
 */
const SCORECARD_EXTRACTION_PROMPT = `Analyze this image to determine if it's a valid UDisc disc golf scorecard.

VALIDATION RULES:
1. Must look like a UDisc scorecard format
2. Must have at least 4 players visible
3. Must contain hole-by-hole scoring data

If NOT valid, return: {"valid": false, "reason": "explanation"}

If VALID, extract ALL data and return ONLY valid JSON (no markdown, no code blocks):

{
  "valid": true,
  "courseName": "Extract from line 1 OR line 2 (see rules below)",
  "layoutName": "Layout name if visible on line 2",
  "date": "YYYY-MM-DD format from bottom section. IMPORTANT: the year most probably will not be visible on the scorecard, use ${new Date().getFullYear()} as the year.",
  "time": "Time from bottom section (e.g., '2:30 PM')",
  "location": "Location/city from bottom section",
  "temperature": "Temperature from bottom section (e.g., '75°F')",
  "wind": "Wind condition from bottom section (e.g., '5 mph NW')",
  "holes": [
    {
      "hole": "Exact hole identifier as shown (could be 1, 18, A, 2A, 2B, etc.)",
      "distance": number in feet,
      "par": number
    }
    // Include ALL holes shown (could be 9, 18, 27, or any number)
  ],
  "players": [
    {
      "name": "Player name - if truncated with '...' try to match full name from common disc golf names",
      "totalStrokes": total strokes,
      "totalScore": score relative to par,
      "holeByHole": [3, 4, 2, ...],  // Array matching number of holes
      "birdies": count,
      "eagles": count,
      "aces": count,
      "pars": count,
      "bogeys": count,
      "doubleBogeys": count
    }
    // Must have at least 4 players
  ]
}

COURSE NAME EXTRACTION RULES:
- Line 1 = Custom title (optional, user-added)
- Line 2 = Course name + layout
- If Line 1 is a custom title: courseName from Line 2 (before layout)
- If Line 1 is course name: use Line 1 as courseName, Line 2 as layoutName

PLAYER NAME RULES:
- If name ends with "..." it's truncated
- Common truncations: "Intern..." → "Intern Line Cook", "Jabba..." → "Jabba the Putt"
- Extract the full visible portion before "..."
- If you see a bird emoji (🦅) or bird image instead of a text name, use "Bird" as the player name
- Bird emoji/image is visually distinct from text - detect and replace with "Bird"

Use null for any field not visible. Return valid JSON only.`;

/**
 * Extract scorecard data from image using Claude Vision API
 *
 * @param {string} imageUrl - URL to the scorecard image
 * @returns {Promise<Object>} Extracted scorecard data with {valid, ...data}
 * @throws {Error} If API call fails or response is invalid
 */
export async function extractScorecardData(imageUrl) {
  logger.info('Extracting scorecard data from image');

  try {
    // Parse data URL to extract base64 data
    let imageSource;

    if (imageUrl.startsWith('data:')) {
      // Data URL format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
      const matches = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);

      if (!matches) {
        throw new ValidationError('Invalid data URL format', 'imageUrl');
      }

      const mediaType = matches[1];  // e.g., 'image/jpeg'
      const base64Data = matches[2]; // Base64 string without prefix

      imageSource = {
        type: 'base64',
        media_type: mediaType,
        data: base64Data
      };

      logger.info('Using base64 image data', { mediaType, dataLength: base64Data.length });
    } else {
      // Regular URL
      imageSource = {
        type: 'url',
        url: imageUrl
      };

      logger.info('Using image URL', { url: imageUrl });
    }

    // Call Claude Vision API with retry logic for resilience
    const message = await retryWithBackoff(
      () => anthropic.messages.create({
        model: config.anthropic.model,
        max_tokens: 4096,
        temperature: 0.3, // Lower = more deterministic
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: imageSource
              },
              {
                type: 'text',
                text: SCORECARD_EXTRACTION_PROMPT
              }
            ]
          }
        ]
      }),
      {
        maxRetries: 3,
        initialDelay: 2000,  // 2s, 4s, 8s backoff
        shouldRetry: isRetryableError,
        context: 'Claude Vision API'
      }
    );

    // Extract text from Claude response
    const responseText = message.content[0].text;
    logger.debug('Claude Vision response received', { length: responseText.length });

    // Parse JSON response - strip markdown code blocks if present
let scorecardData;
try {
  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  let cleanedText = responseText.trim();
  
  if (cleanedText.startsWith('```')) {
    // Extract content between code fences
    const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleanedText = match[1].trim();
    }
  }
  
  scorecardData = JSON.parse(cleanedText);
} catch (parseError) {
  logger.error('Failed to parse Claude response as JSON', {
    response: responseText,
    error: parseError.message
  });
  throw new ExternalAPIError('Anthropic Vision', 'Invalid JSON response from Claude Vision API', parseError);
}

    // Check if scorecard is valid
    if (!scorecardData.valid) {
      logger.warn('Invalid scorecard detected', { reason: scorecardData.reason });
      return scorecardData; // Return {valid: false, reason: "..."}
    }

    // Validate required fields
    if (!scorecardData.players || scorecardData.players.length < 4) {
      logger.warn('Scorecard has fewer than 4 players', {
        playerCount: scorecardData.players?.length
      });
      return {
        valid: false,
        reason: `Only ${scorecardData.players?.length || 0} players found, minimum 4 required`
      };
    }

    logger.info('Scorecard extracted successfully', {
      course: scorecardData.courseName,
      players: scorecardData.players.length,
      holes: scorecardData.holes?.length
    });

    return scorecardData;

  } catch (error) {
    logger.error('Claude Vision API call failed', {
      error: error.message,
      stack: error.stack
    });
    throw new ExternalAPIError('Anthropic Vision', error.message, error);
  }
}

export default {
  extractScorecardData
};
