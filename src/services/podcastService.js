/**
 * Podcast Service
 *
 * Handles all podcast-related operations:
 * - Fetching episode metadata from database
 * - Triggering podcast generation
 * - Managing episode lifecycle
 *
 * Follows ParSaveables architecture:
 * - Pure functions
 * - Configuration-driven
 * - No hardcoded values
 * - Comprehensive error handling
 */

import { logger } from '../utils/logger.js';

/**
 * Fetch all published podcast episodes
 * @param {object} supabase - Supabase client
 * @param {number} limit - Maximum episodes to fetch
 * @returns {Promise<Array>} Published episodes, newest first
 */
export async function getPublishedEpisodes(supabase, limit = 10) {
    try {
        logger.info('Fetching published podcast episodes', { limit });

        const { data, error } = await supabase
            .from('podcast_episodes')
            .select('*')
            .eq('is_published', true)
            .order('episode_number', { ascending: false })
            .limit(limit);

        if (error) throw error;

        logger.info('Successfully fetched episodes', { count: data.length });
        return data;
    } catch (error) {
        logger.error('Failed to fetch published episodes', { error });
        throw new Error(`Failed to fetch episodes: ${error.message}`);
    }
}

/**
 * Fetch single episode by ID
 * @param {object} supabase - Supabase client
 * @param {number} episodeId - Episode ID
 * @returns {Promise<object>} Episode data
 */
export async function getEpisodeById(supabase, episodeId) {
    try {
        logger.info('Fetching episode by ID', { episodeId });

        const { data, error } = await supabase
            .from('podcast_episodes')
            .select('*')
            .eq('id', episodeId)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Episode not found');

        return data;
    } catch (error) {
        logger.error('Failed to fetch episode', { episodeId, error });
        throw new Error(`Failed to fetch episode: ${error.message}`);
    }
}

/**
 * Fetch latest episode
 * @param {object} supabase - Supabase client
 * @returns {Promise<object|null>} Latest episode or null if none exist
 */
export async function getLatestEpisode(supabase) {
    try {
        logger.info('Fetching latest episode');

        const { data, error } = await supabase
            .from('podcast_episodes')
            .select('*')
            .eq('is_published', true)
            .order('episode_number', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

        return data || null;
    } catch (error) {
        logger.error('Failed to fetch latest episode', { error });
        throw new Error(`Failed to fetch latest episode: ${error.message}`);
    }
}

/**
 * Create new episode record
 * @param {object} supabase - Supabase client
 * @param {object} episodeData - Episode metadata
 * @returns {Promise<object>} Created episode
 */
export async function createEpisode(supabase, episodeData) {
    try {
        logger.info('Creating new episode', { title: episodeData.title });

        const { data, error } = await supabase
            .from('podcast_episodes')
            .insert([episodeData])
            .select()
            .single();

        if (error) throw error;

        logger.info('Successfully created episode', { episodeId: data.id });
        return data;
    } catch (error) {
        logger.error('Failed to create episode', { error });
        throw new Error(`Failed to create episode: ${error.message}`);
    }
}

/**
 * Update episode record
 * @param {object} supabase - Supabase client
 * @param {number} episodeId - Episode ID
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} Updated episode
 */
export async function updateEpisode(supabase, episodeId, updates) {
    try {
        logger.info('Updating episode', { episodeId, updates });

        const { data, error } = await supabase
            .from('podcast_episodes')
            .update(updates)
            .eq('id', episodeId)
            .select()
            .single();

        if (error) throw error;

        logger.info('Successfully updated episode', { episodeId });
        return data;
    } catch (error) {
        logger.error('Failed to update episode', { episodeId, error });
        throw new Error(`Failed to update episode: ${error.message}`);
    }
}

/**
 * Publish episode (make publicly visible)
 * @param {object} supabase - Supabase client
 * @param {number} episodeId - Episode ID
 * @returns {Promise<object>} Published episode
 */
export async function publishEpisode(supabase, episodeId) {
    try {
        logger.info('Publishing episode', { episodeId });

        const updates = {
            is_published: true,
            published_at: new Date().toISOString()
        };

        return await updateEpisode(supabase, episodeId, updates);
    } catch (error) {
        logger.error('Failed to publish episode', { episodeId, error });
        throw new Error(`Failed to publish episode: ${error.message}`);
    }
}

/**
 * Get next episode number
 * @param {object} supabase - Supabase client
 * @returns {Promise<number>} Next episode number
 */
export async function getNextEpisodeNumber(supabase) {
    try {
        logger.info('Getting next episode number');

        const { data, error } = await supabase
            .from('podcast_episodes')
            .select('episode_number')
            .order('episode_number', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        const nextNumber = data ? data.episode_number + 1 : 1;
        logger.info('Next episode number', { nextNumber });

        return nextNumber;
    } catch (error) {
        logger.error('Failed to get next episode number', { error });
        throw new Error(`Failed to get next episode number: ${error.message}`);
    }
}

/**
 * Log podcast generation stage
 * @param {object} supabase - Supabase client
 * @param {object} logData - Log entry data
 * @returns {Promise<object>} Created log entry
 */
export async function logGenerationStage(supabase, logData) {
    try {
        const { data, error } = await supabase
            .from('podcast_generation_logs')
            .insert([{
                ...logData,
                started_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Failed to log generation stage', { error });
        // Don't throw - logging failures shouldn't break generation
        return null;
    }
}

/**
 * Update generation log with completion status
 * @param {object} supabase - Supabase client
 * @param {number} logId - Log entry ID
 * @param {boolean} success - Whether stage succeeded
 * @param {string} errorMessage - Error message if failed
 * @returns {Promise<void>}
 */
export async function completeGenerationLog(supabase, logId, success, errorMessage = null) {
    try {
        const completedAt = new Date().toISOString();

        const { error } = await supabase
            .from('podcast_generation_logs')
            .update({
                completed_at: completedAt,
                success,
                error_message: errorMessage
            })
            .eq('id', logId);

        if (error) throw error;
    } catch (error) {
        logger.error('Failed to update generation log', { logId, error });
        // Don't throw - logging failures shouldn't break generation
    }
}

/**
 * Determine date range for next episode
 * @param {object} supabase - Supabase client
 * @returns {Promise<object>} { periodStart, periodEnd, type }
 */
export async function determineNextEpisodePeriod(supabase) {
    try {
        logger.info('Determining next episode period');

        const latestEpisode = await getLatestEpisode(supabase);

        if (!latestEpisode) {
            // First episode - cover all historical data
            logger.info('No previous episode found - creating initial episode');
            return {
                periodStart: '2025-01-01',
                periodEnd: '2025-12-31',
                type: 'season_recap'
            };
        }

        // Calculate next period based on last episode's end date
        const lastEnd = new Date(latestEpisode.period_end);
        const periodStart = new Date(lastEnd);
        periodStart.setDate(periodStart.getDate() + 1);

        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        periodEnd.setDate(0); // Last day of month

        logger.info('Calculated next period', {
            periodStart: periodStart.toISOString().split('T')[0],
            periodEnd: periodEnd.toISOString().split('T')[0]
        });

        return {
            periodStart: periodStart.toISOString().split('T')[0],
            periodEnd: periodEnd.toISOString().split('T')[0],
            type: 'monthly_recap'
        };
    } catch (error) {
        logger.error('Failed to determine episode period', { error });
        throw new Error(`Failed to determine episode period: ${error.message}`);
    }
}
