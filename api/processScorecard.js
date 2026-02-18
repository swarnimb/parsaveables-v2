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

        if (result.rounds.length > 0) {
          results.processed.push(result);
          results.stats.successful++;
        } else {
          results.skipped.push(result);
          results.stats.skipped++;
        }

        logger.info('Email processed', {
          emailId: email.id,
          roundIds: result.rounds.map(r => r.round.id),
          skippedImages: result.skippedImages?.length || 0
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
 * Process a single image from an email
 * Handles steps 2b through 11 for one scorecard image
 *
 * @param {Object} scorecardImage - Image object with imageUrl, filename, etc.
 * @param {number} imageIndex - Index of this image in the email (for logging)
 * @param {number} totalImages - Total number of images in the email (for logging)
 * @returns {Promise<Object>} Processing result for this image
 */
async function processSingleImage(scorecardImage, imageIndex, totalImages) {
  logger.info(`Processing image ${imageIndex + 1} of ${totalImages}`, {
    filename: scorecardImage.filename
  });

  // Step 2b: Upload image to Supabase Storage (before Claude Vision)
  logger.info('Step 2b: Uploading scorecard image to Supabase Storage');
  let scorecardImageUrl = null;

  try {
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
    logger.warn('Failed to upload scorecard image, continuing without it', {
      error: uploadError.message
    });
  }

  // Step 3: Send image to Claude Vision API
  logger.info('Step 3: Extracting scorecard data with Claude Vision');
  const scorecardData = await visionService.extractScorecardData(scorecardImage.imageUrl);

  // Step 4: Validate scorecard data
  logger.info('Step 4: Validating scorecard data');
  if (!scorecardData.valid && scorecardData.reason?.includes('minimum 4 required')) {
    logger.info('Scorecard skipped: too few players', { reason: scorecardData.reason });
    return { skipped: true, reason: scorecardData.reason };
  }
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

  if (!playerValidation || typeof playerValidation !== 'object') {
    throw new Error('Player validation returned invalid result');
  }

  if (playerValidation.warnings && playerValidation.warnings.length > 0) {
    logger.warn('Player validation warnings', {
      count: playerValidation.warnings.length,
      warnings: playerValidation.warnings
    });
  }

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

  const roundData = {
    date: scorecardData.date,
    time: scorecardData.time || null,
    course_name: configuration.course.course_name,
    layout_name: scorecardData.layoutName || null,
    location: scorecardData.location || null,
    temperature: scorecardData.temperature || null,
    wind: scorecardData.wind || null,
    course_multiplier: configuration.course.multiplier,
    event_id: event.id,
    event_type: event.type,
    scorecard_image_url: scorecardImageUrl
  };

  const round = await db.insertRound(roundData);
  logger.info('Round created', { roundId: round.id });

  try {
    await db.createNewRoundNotifications(
      round.id,
      scorecardData.courseName,
      scorecardData.date,
      event.id,
      event.name
    );
  } catch (notifError) {
    logger.error('Failed to create notifications (non-fatal)', {
      error: notifError.message,
      roundId: round.id
    });
  }

  const playerRoundsData = playersWithPoints.map(player => ({
    round_id: round.id,
    player_id: player.playerId,
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
  }

  return {
    round,
    playerRounds,
    event,
    scorecardData,
    playerValidation,
    configuration,
    gamificationResults
  };
}

/**
 * Process a single email with scorecard(s)
 * Processes ALL images in the email, each as a separate round
 *
 * @param {Object} email - Email object from emailService
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result with array of rounds
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

  logger.info(`Found ${images.length} image(s) to process`);

  // Process each image as a separate round
  const processedRounds = [];
  const failedImages = [];
  const skippedImages = [];

  for (let i = 0; i < images.length; i++) {
    try {
      const result = await processSingleImage(images[i], i, images.length);
      if (result.skipped) {
        skippedImages.push({
          index: i,
          filename: images[i].filename,
          reason: result.reason
        });
      } else {
        processedRounds.push(result);
      }
    } catch (error) {
      logger.error(`Failed to process image ${i + 1} of ${images.length}`, {
        filename: images[i].filename,
        error: error.message
      });
      failedImages.push({
        index: i,
        filename: images[i].filename,
        error: error.message
      });
    }
  }

  // If no images processed successfully and none were skipped, throw error
  if (processedRounds.length === 0 && skippedImages.length === 0) {
    throw new Error(`All ${images.length} image(s) failed to process`);
  }

  // Step 12: Mark email as processed
  logger.info('Step 12: Marking email as processed');
  await emailService.markAsProcessed(email.id);

  // Label based on results: processed > skipped > error
  if (processedRounds.length > 0) {
    await emailService.addLabel(email.id, 'ParSaveables/Processed');
  } else {
    await emailService.addLabel(email.id, 'ParSaveables/Skipped');
  }

  // Step 13: Reset betting lock after PULP settlement (only if rounds were processed)
  if (processedRounds.length === 0) {
    logger.info('Step 13: Skipping betting lock reset (no rounds processed)');
  } else {
    logger.info('Step 13: Resetting betting lock after PULP settlement');
    try {
      const activeEvents = await db.getActiveEvents();

      if (activeEvents && activeEvents.length > 0) {
        for (const evt of activeEvents) {
          if (evt.betting_lock_time) {
            await db.updateEvent(evt.id, { betting_lock_time: null });
            logger.info('Betting lock reset for event', {
              eventId: evt.id,
              eventName: evt.name,
              previousLockTime: evt.betting_lock_time
            });
          }
        }
        logger.info('All active events betting locks cleared', {
          eventsCleared: activeEvents.filter(e => e.betting_lock_time).length
        });
      } else {
        logger.info('No active events found to reset betting lock');
      }
    } catch (error) {
      logger.error('Failed to reset betting lock (non-fatal)', {
        error: error.message
      });
    }
  }

  logger.info('Email processing complete', {
    emailId: email.id,
    imagesProcessed: processedRounds.length,
    imagesSkipped: skippedImages.length,
    imagesFailed: failedImages.length,
    roundIds: processedRounds.map(r => r.round.id)
  });

  return {
    emailId: email.id,
    rounds: processedRounds,
    skippedImages: skippedImages,
    failedImages: failedImages,
    stats: {
      totalImages: images.length,
      successful: processedRounds.length,
      skipped: skippedImages.length,
      failed: failedImages.length
    }
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
