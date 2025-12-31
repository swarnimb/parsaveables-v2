import * as emailService from '../src/services/core/emailService.js';
import * as visionService from '../src/services/core/visionService.js';
import * as eventService from '../src/services/core/eventService.js';
import * as scoringService from '../src/services/core/scoringService.js';
import * as playerService from '../src/services/core/playerService.js';
import * as configService from '../src/services/core/configService.js';
import * as pointsService from '../src/services/core/pointsService.js';
import * as db from '../src/services/core/databaseService.js';
import * as storageService from '../src/services/core/storageService.js';
import * as gamificationService from '../src/services/gamification/index.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger('ProcessScorecard');

/**
 * Main orchestrator for scorecard processing
 * Ties together all 9 services in a 13-step workflow
 *
 * This function is designed to be called by:
 * 1. Vercel Cron Job (scheduled polling)
 * 2. Vercel Serverless Function (manual trigger)
 * 3. Local testing/development
 *
 * @param {Object} options - Processing options
 * @param {string} options.emailFrom - Filter emails from specific sender (optional)
 * @param {number} options.maxEmails - Max emails to process per run (default: 5)
 * @param {boolean} options.skipNotifications - Skip sending email notifications (default: false)
 * @returns {Promise<Object>} Processing results with stats
 */
export async function processNewScorecards(options = {}) {
  const {
    emailFrom = null,
    maxEmails = 5,
    skipNotifications = false
  } = options;

  logger.info('Starting scorecard processing', { emailFrom, maxEmails });

  const results = {
    processed: [],
    failed: [],
    skipped: [],
    stats: {
      emailsChecked: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    }
  };

  try {
    // Step 1: Poll Gmail for new emails
    logger.info('Step 1: Checking for new emails');
    const emails = await emailService.checkForNewEmails({
      from: emailFrom,
      maxResults: maxEmails
    });

    results.stats.emailsChecked = emails.length;

    if (emails.length === 0) {
      logger.info('No new emails found');
      return results;
    }

    logger.info(`Found ${emails.length} emails to process`);

    // Process each email
    for (const email of emails) {
      try {
        logger.info('Processing email', {
          id: email.id,
          from: email.from,
          subject: email.subject
        });

        const result = await processSingleEmail(email, { skipNotifications });

        results.processed.push(result);
        results.stats.successful++;

        logger.info('Email processed successfully', {
          emailId: email.id,
          roundId: result.round.id
        });
      } catch (error) {
        logger.error('Failed to process email', {
          emailId: email.id,
          error: error.message
        });

        results.failed.push({
          emailId: email.id,
          from: email.from,
          subject: email.subject,
          error: error.message
        });

        results.stats.failed++;

        // Send error notification
        if (!skipNotifications) {
          try {
            const senderEmail = extractEmailAddress(email.from);
            await emailService.sendErrorNotification(senderEmail, {
              subject: email.subject,
              error: error.message,
              timestamp: new Date().toISOString()
            });

            // Add error label
            await emailService.addLabel(email.id, 'ParSaveables/Error');
          } catch (notificationError) {
            logger.error('Failed to send error notification', {
              error: notificationError.message
            });
          }
        }

        // Mark as read even if processing failed (to avoid reprocessing)
        await emailService.markAsProcessed(email.id);
      }
    }

    logger.info('Scorecard processing complete', results.stats);

    return results;
  } catch (error) {
    logger.error('Critical error in scorecard processing', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Process a single email with scorecard
 * Executes the complete 12-step workflow
 *
 * @param {Object} email - Email object from emailService
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
async function processSingleEmail(email, options = {}) {
  const { skipNotifications = false } = options;

  logger.info('Starting single email processing', { emailId: email.id });

  // Step 2: Extract images from email
  logger.info('Step 2: Extracting images');
  const images = await emailService.getImageAttachments(email);

  if (images.length === 0) {
    throw new Error('No images found in email');
  }

  logger.info(`Found ${images.length} images`);

  // Use the first image (assuming one scorecard per email)
  const scorecardImage = images[0];

  // Step 2b: Upload image to Supabase Storage (before Claude Vision)
  logger.info('Step 2b: Uploading scorecard image to Supabase Storage');
  let scorecardImageUrl = null;

  try {
    // Generate unique filename (will use actual data after extraction)
    const tempFilename = storageService.generateScorecardFilename(
      'temp',
      new Date().toISOString().split('T')[0]
    );

    scorecardImageUrl = await storageService.uploadScorecardImage(
      scorecardImage.imageUrl,
      tempFilename
    );

    logger.info('Scorecard image uploaded', { url: scorecardImageUrl });
  } catch (uploadError) {
    // Log error but continue (image upload is not critical for processing)
    logger.warn('Failed to upload scorecard image, continuing without it', {
      error: uploadError.message
    });
  }

  // Step 3: Send image to Claude Vision API
  logger.info('Step 3: Extracting scorecard data with Claude Vision');
  const scorecardData = await visionService.extractScorecardData(scorecardImage.imageUrl);

  // Step 4: Validate scorecard data
  logger.info('Step 4: Validating scorecard data');
  if (!scorecardData.valid) {
    throw new Error(scorecardData.reason || 'Invalid scorecard');
  }

  if (!scorecardData.date) {
    throw new Error('Scorecard missing date');
  }

  logger.info('Scorecard validated', {
    course: scorecardData.courseName,
    players: scorecardData.players.length,
    holes: scorecardData.holes.length,
    date: scorecardData.date
  });

  // Step 5: Assign event (season/tournament)
  logger.info('Step 5: Assigning event');
  const event = await eventService.assignEvent(scorecardData.date);

  logger.info('Event assigned', {
    eventId: event.id,
    eventName: event.name,
    eventType: event.type
  });

  // Step 6: Process scorecard (calculate stats, rank players)
  logger.info('Step 6: Processing scorecard stats and rankings');
  const processedData = scoringService.processScorecard(scorecardData);

  logger.info('Scorecard processed', {
    playerCount: processedData.players.length,
    topPlayer: processedData.players[0]?.name
  });

  // Step 7: Validate players
  logger.info('Step 7: Validating players');
  let playerValidation;

  try {
    playerValidation = await playerService.validatePlayers(
      processedData.players
    );

    // Log what we got back for debugging
    logger.info('Player validation result', {
      hasMatched: !!playerValidation?.matched,
      hasUnmatched: !!playerValidation?.unmatched,
      hasWarnings: !!playerValidation?.warnings,
      hasStats: !!playerValidation?.stats,
      matchedCount: playerValidation?.matched?.length || 0,
      unmatchedCount: playerValidation?.unmatched?.length || 0,
      warningsCount: playerValidation?.warnings?.length || 0
    });
  } catch (error) {
    logger.error('Error validating players', error);
    throw new Error(`Player validation failed: ${error.message}`);
  }

  // Defensive check for expected structure
  if (!playerValidation || typeof playerValidation !== 'object') {
    throw new Error('Player validation returned invalid result');
  }

  // Log warnings for fuzzy matches and unmatched players
  if (playerValidation.warnings && playerValidation.warnings.length > 0) {
    logger.warn('Player validation warnings', {
      count: playerValidation.warnings.length,
      warnings: playerValidation.warnings
    });
  }

  // Use matched players only
  const validPlayers = playerValidation.matched || [];

  if (validPlayers.length === 0) {
    throw new Error('No registered players found in scorecard');
  }

  logger.info('Players validated', {
    matched: validPlayers.length,
    unmatched: playerValidation.unmatched?.length || 0,
    fuzzyMatches: playerValidation.stats?.fuzzyMatches || 0
  });

  // Step 8: Load configuration
  logger.info('Step 8: Loading configuration');
  const configuration = await configService.loadConfiguration(
    event,
    scorecardData.courseName
  );

  logger.info('Configuration loaded', {
    pointsSystem: configuration.pointsSystem.name,
    course: configuration.course.course_name,
    multiplier: configuration.course.multiplier
  });

  // Step 9: Calculate points
  logger.info('Step 9: Calculating points');
  const playersWithPoints = pointsService.calculatePoints(
    validPlayers,
    configuration
  );

  logger.info('Points calculated', {
    playerCount: playersWithPoints.length,
    topScore: playersWithPoints[0]?.points.finalTotal
  });

  // Step 10: Store in Supabase
  logger.info('Step 10: Storing data in Supabase');

  // 10a: Insert round
  const roundData = {
    date: scorecardData.date,
    time: scorecardData.time || null,
    course_name: configuration.course.course_name, // Use matched canonical name
    layout_name: scorecardData.layoutName || null,
    location: scorecardData.location || null,
    temperature: scorecardData.temperature || null,
    wind: scorecardData.wind || null,
    course_multiplier: configuration.course.multiplier,
    event_id: event.id,
    event_type: event.type,
    scorecard_image_url: scorecardImageUrl // Add uploaded image URL
  };

  const round = await db.insertRound(roundData);
  logger.info('Round created', { roundId: round.id });

  // 10b: Insert player rounds
  const playerRoundsData = playersWithPoints.map(player => ({
    round_id: round.id,
    player_id: player.playerId, // Foreign key to registered_players
    player_name: player.registeredName || player.name,
    rank: player.rank,
    total_strokes: player.totalStrokes,
    total_score: player.totalScore,
    aces: player.aces || 0,
    eagles: player.eagles || 0,
    birdies: player.birdies || 0,
    pars: player.pars || 0,
    bogeys: player.bogeys || 0,
    double_bogeys: player.doubleBogeys || 0,
    rank_points: player.points.rankPoints,
    birdie_points: player.points.birdiePoints,
    eagle_points: player.points.eaglePoints,
    ace_points: player.points.acePoints,
    raw_total: player.points.rawTotal,
    final_total: player.points.finalTotal,
    hole_by_hole: player.holeByHole,
    event_id: event.id
  }));

  const playerRounds = await db.insertPlayerRounds(playerRoundsData);
  logger.info('Player rounds created', { count: playerRounds.length });

  // Step 11: Process PULP gamification (earnings, challenges, bets)
  logger.info('Step 11: Processing PULP gamification');
  let gamificationResults = null;
  try {
    gamificationResults = await gamificationService.processRoundGamification(
      round.id,
      event.id,
      event.type
    );
    logger.info('Gamification processing complete', {
      playersProcessed: gamificationResults.playersProcessed,
      totalPulpsAwarded: gamificationResults.totalPulpsAwarded,
      challengesResolved: gamificationResults.challengesResolved,
      betsResolved: gamificationResults.betsResolved
    });
  } catch (error) {
    logger.error('Gamification processing failed (non-fatal)', {
      error: error.message,
      roundId: round.id
    });
    // Don't throw - gamification failure shouldn't break the scorecard flow
  }

  // Step 12: Mark email as processed
  logger.info('Step 12: Marking email as processed');
  await emailService.markAsProcessed(email.id);
  await emailService.addLabel(email.id, 'ParSaveables/Processed');

  // Step 13: Send success notification
  if (!skipNotifications) {
    logger.info('Step 13: Sending success notification');
    try {
      const senderEmail = extractEmailAddress(email.from);
      await emailService.sendSuccessNotification(senderEmail, {
        courseName: scorecardData.courseName,
        eventName: event.name,
        playerCount: validPlayers.length,
        dashboardUrl: 'https://par-saveables.vercel.app'
      });
    } catch (error) {
      logger.error('Failed to send success notification', {
        error: error.message
      });
      // Don't throw - notification failure shouldn't break the flow
    }
  }

  // Step 14: Reset betting lock after PULP settlement
  logger.info('Step 14: Resetting betting lock after PULP settlement');
  try {
    // Clear betting lock for ALL active events (since admin sets it on all)
    // This ensures consistency: if admin locks all events, processing unlocks all events
    const activeEvents = await db.getActiveEvents();

    if (activeEvents && activeEvents.length > 0) {
      for (const evt of activeEvents) {
        if (evt.betting_lock_time) {
          await db.updateEvent(evt.id, { betting_lock_time: null });
          logger.info('Betting lock reset for event', {
            eventId: evt.id,
            eventName: evt.name,
            previousLockTime: evt.betting_lock_time,
            roundId: round.id
          });
        }
      }
      logger.info('All active events betting locks cleared', {
        roundId: round.id,
        eventsCleared: activeEvents.filter(e => e.betting_lock_time).length,
        pulpSettled: gamificationResults ? 'yes' : 'attempted'
      });
    } else {
      logger.info('No active events found to reset betting lock');
    }
  } catch (error) {
    logger.error('Failed to reset betting lock (non-fatal)', {
      error: error.message,
      roundId: round.id
    });
    // Don't throw - lock reset failure shouldn't break the flow
  }

  logger.info('Single email processing complete', {
    emailId: email.id,
    roundId: round.id,
    playerCount: playerRounds.length
  });

  return {
    emailId: email.id,
    round: round,
    playerRounds: playerRounds,
    event: event,
    scorecardData: scorecardData,
    playerValidation: playerValidation,
    configuration: configuration,
    gamificationResults: gamificationResults
  };
}

/**
 * Extract email address from "Name <email@domain.com>" format
 *
 * @param {string} emailString - Email string from Gmail API
 * @returns {string} Email address
 */
function extractEmailAddress(emailString) {
  const match = emailString.match(/<(.+)>/);
  return match ? match[1] : emailString;
}

/**
 * Process a single scorecard image URL directly
 * Useful for manual testing or admin-triggered processing
 *
 * @param {string} imageUrl - Scorecard image URL or base64 data URL
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
export async function processSingleScorecard(imageUrl, options = {}) {
  logger.info('Processing single scorecard', { imageUrl: imageUrl.substring(0, 50) + '...' });

  // Step 1: Send image to Claude Vision API
  logger.info('Extracting scorecard data with Claude Vision');
  const scorecardData = await visionService.extractScorecardData(imageUrl);

  // Step 2: Validate scorecard data
  if (!scorecardData.valid) {
    throw new Error(scorecardData.reason || 'Invalid scorecard');
  }

  if (!scorecardData.date) {
    throw new Error('Scorecard missing date');
  }

  // Step 3: Assign event
  const event = await eventService.assignEvent(scorecardData.date);

  // Step 4: Process scorecard
  const processedData = scoringService.processScorecard(scorecardData);

  // Step 5: Validate players
  const playerValidation = await playerService.validatePlayers(
    processedData.players
  );

  const validPlayers = playerValidation.matched;

  if (validPlayers.length === 0) {
    throw new Error('No registered players found in scorecard');
  }

  // Step 6: Load configuration
  const configuration = await configService.loadConfiguration(
    event,
    scorecardData.courseName
  );

  // Step 7: Calculate points
  const playersWithPoints = pointsService.calculatePoints(
    validPlayers,
    configuration
  );

  // Step 8: Store in Supabase
  const roundData = {
    date: scorecardData.date,
    time: scorecardData.time || null,
    course_name: scorecardData.courseName,
    layout_name: scorecardData.layoutName || null,
    location: scorecardData.location || null,
    temperature: scorecardData.temperature || null,
    wind: scorecardData.wind || null,
    course_multiplier: configuration.course.multiplier,
    event_id: event.id,
    event_type: event.type
  };

  const round = await db.insertRound(roundData);

  const playerRoundsData = playersWithPoints.map(player => ({
    round_id: round.id,
    player_id: player.playerId, // Foreign key to registered_players
    player_name: player.registeredName || player.name,
    rank: player.rank,
    total_score: player.totalScore,
    score_relative_to_par: player.relativeToPar,
    aces: player.aces || 0,
    eagles: player.eagles || 0,
    birdies: player.birdies || 0,
    pars: player.pars || 0,
    bogeys: player.bogeys || 0,
    double_bogeys: player.doubleBogeys || 0,
    worse: player.worse || 0,
    rank_points: player.points.rankPoints,
    birdie_points: player.points.birdiePoints,
    eagle_points: player.points.eaglePoints,
    ace_points: player.points.acePoints,
    raw_total: player.points.rawTotal,
    course_multiplier_applied: player.points.courseMultiplier !== 1.0,
    final_total: player.points.finalTotal,
    event_id: event.id
  }));

  const playerRounds = await db.insertPlayerRounds(playerRoundsData);

  logger.info('Single scorecard processing complete', {
    roundId: round.id,
    playerCount: playerRounds.length
  });

  return {
    round: round,
    playerRounds: playerRounds,
    event: event,
    scorecardData: scorecardData,
    playerValidation: playerValidation,
    configuration: configuration
  };
}

/**
 * Vercel Serverless Function Handler
 * Supports both cron triggers and manual invocations
 *
 * @param {Object} req - Vercel request object
 * @param {Object} res - Vercel response object
 */
export default async function handler(req, res) {
  logger.info('Vercel handler invoked', {
    method: req.method,
    cron: req.headers['x-vercel-cron'] || 'false'
  });

  // Only allow POST requests (or cron GET)
  if (req.method !== 'POST' && !req.headers['x-vercel-cron']) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const options = req.body || {};

    const results = await processNewScorecards(options);

    return res.status(200).json({
      success: true,
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Handler error', { error: error.message });

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
