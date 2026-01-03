import { supabase } from './supabase'

/**
 * Authentication API helpers
 */

export const authAPI = {
  /**
   * Sign in with email and password
   */
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  },

  /**
   * Sign up new user
   */
  signUp: async (email, password, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    if (error) throw error
    return data
  },

  /**
   * Sign out current user
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  /**
   * Get current session
   */
  getSession: async () => {
    // Add 5-second timeout to prevent infinite loading on mobile
    // Mobile browsers can be slow when returning to the app
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
    )
    const sessionPromise = supabase.auth.getSession()

    try {
      const result = await Promise.race([sessionPromise, timeoutPromise])
      // If session fetch succeeds, result is {data, error} from Supabase
      if (result.error) {
        console.error('Session fetch error:', result.error)
        return null
      }
      return result.data.session
    } catch (error) {
      // If timeout wins, error is thrown
      if (error.message === 'Session fetch timeout') {
        console.warn('Session fetch timed out after 5s, returning null')
        return null
      }
      // Other errors should be thrown
      console.error('Unexpected session fetch error:', error)
      return null
    }
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  },
}

/**
 * Player API helpers
 */

export const playerAPI = {
  /**
   * Get player profile by user_id
   */
  getPlayerByUserId: async (userId) => {
    const { data, error } = await supabase
      .from('registered_players')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get unclaimed players (no user_id assigned yet)
   */
  getUnclaimedPlayers: async () => {
    const { data, error } = await supabase
      .from('registered_players')
      .select('id, player_name')
      .is('user_id', null)
      .order('player_name')

    if (error) throw error
    return data
  },

  /**
   * Link existing player to auth user
   */
  linkPlayerToUser: async (playerId, userId) => {
    const { data, error } = await supabase
      .from('registered_players')
      .update({ user_id: userId })
      .eq('id', playerId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create player profile after signup (for new players not in v1)
   */
  createPlayer: async (userId, playerData) => {
    const { data, error } = await supabase
      .from('registered_players')
      .insert({
        user_id: userId,
        ...playerData,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update player profile
   */
  updatePlayer: async (playerId, updates) => {
    const { data, error } = await supabase
      .from('registered_players')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Get all players (basic info only)
   */
  getAllPlayers: async () => {
    const { data, error } = await supabase
      .from('registered_players')
      .select('id, player_name, user_id, active')
      .order('player_name')

    if (error) throw error
    return data
  },
}

/**
 * Event API helpers
 */

export const eventAPI = {
  /**
   * Get all events (seasons + tournaments)
   */
  getAllEvents: async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, type, year, start_date, end_date, is_active')
      .order('year', { ascending: false })
      .order('start_date', { ascending: false })

    if (error) throw error
    return data
  },

  /**
   * Get leaderboard for a specific event
   * Aggregates player_rounds by player_name
   * - For seasons: sums top 10 individual round scores only
   * - For tournaments: sums all round scores
   */
  getLeaderboardForEvent: async (eventId) => {
    // First, fetch the event to determine if it's a season or tournament
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('type')
      .eq('id', eventId)
      .single()

    if (eventError) throw eventError

    const isSeason = event.type === 'season'

    // Fetch all player rounds for this event
    const { data, error } = await supabase
      .from('player_rounds')
      .select('player_name, final_total, rank, rank_points, birdie_points, eagle_points, ace_points, birdies, eagles, aces, pars, bogeys, double_bogeys, total_strokes, total_score')
      .eq('event_id', eventId)

    if (error) throw error

    console.log('Raw player_rounds data:', data)
    console.log('Number of rounds fetched:', data.length)

    // Aggregate by player
    const playerStats = {}
    const playerRounds = {} // Track individual round scores for top 10 logic

    data.forEach(round => {
      const name = round.player_name
      if (!playerStats[name]) {
        playerStats[name] = {
          player_name: name,
          total_points: 0,
          rounds_played: 0,
          total_birdies: 0,
          total_eagles: 0,
          total_aces: 0,
          total_pars: 0,
          total_bogeys: 0,
          total_double_bogeys: 0,
          total_strokes: 0,
          best_score: null,
          wins: 0,
          podiums: 0,
        }
        playerRounds[name] = []
      }

      // Store individual round scores for top 10 calculation
      playerRounds[name].push(Number(round.final_total) || 0)

      playerStats[name].rounds_played += 1
      playerStats[name].total_birdies += round.birdies || 0
      playerStats[name].total_eagles += round.eagles || 0
      playerStats[name].total_aces += round.aces || 0
      playerStats[name].total_pars += round.pars || 0
      playerStats[name].total_bogeys += round.bogeys || 0
      playerStats[name].total_double_bogeys += round.double_bogeys || 0
      playerStats[name].total_strokes += round.total_strokes || 0

      // Count wins and podiums based on round rank (not season rank)
      if (round.rank === 1) {
        playerStats[name].wins += 1
      }
      if (round.rank <= 3) {
        playerStats[name].podiums += 1
      }

      if (playerStats[name].best_score === null || round.total_score < playerStats[name].best_score) {
        playerStats[name].best_score = round.total_score
      }
    })

    // Calculate total_points based on event type
    Object.keys(playerStats).forEach(name => {
      if (isSeason) {
        // For seasons: sum only top 10 scores
        const sortedScores = playerRounds[name].sort((a, b) => b - a) // Sort descending
        const top10Scores = sortedScores.slice(0, 10) // Take exactly top 10 (or fewer if less than 10 rounds)
        playerStats[name].total_points = top10Scores.reduce((sum, score) => sum + score, 0)
      } else {
        // For tournaments: sum all scores
        playerStats[name].total_points = playerRounds[name].reduce((sum, score) => sum + score, 0)
      }
    })

    // Convert to array and sort by total points
    const sortedPlayers = Object.values(playerStats).sort((a, b) => b.total_points - a.total_points)

    console.log('Aggregated player stats:', sortedPlayers.map(p => ({
      name: p.player_name,
      points: p.total_points,
      rounds: p.rounds_played,
      wins: p.wins,
      podiums: p.podiums
    })))

    return sortedPlayers
  },
}

/**
 * Tutorial API helpers
 */

export const tutorialAPI = {
  /**
   * Mark onboarding tutorial as completed
   */
  completeOnboarding: async (playerId) => {
    const { error } = await supabase
      .from('registered_players')
      .update({ onboarding_completed: true })
      .eq('id', playerId)

    if (error) throw error
  },

  /**
   * Mark betting tutorial as shown
   */
  markBettingInterestShown: async (playerId) => {
    const { error } = await supabase
      .from('registered_players')
      .update({ betting_interest_shown: true })
      .eq('id', playerId)

    if (error) throw error
  },

  /**
   * Confirm user interest in betting feature
   */
  confirmBettingInterest: async (playerId) => {
    const { error } = await supabase
      .from('registered_players')
      .update({ betting_interest_confirmed: true })
      .eq('id', playerId)

    if (error) throw error
  },
}

/**
 * Round API helpers
 */

export const roundAPI = {
  /**
   * Get all rounds with player count
   */
  getAllRounds: async () => {
    const { data, error } = await supabase
      .from('rounds')
      .select('id, date, course_name, scorecard_image_url, created_at')

    if (error) throw error

    // Get player count for each round
    const roundsWithPlayerCount = await Promise.all(
      data.map(async (round) => {
        const { count } = await supabase
          .from('player_rounds')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', round.id)

        return {
          ...round,
          player_count: count || 0,
        }
      })
    )

    // Sort by date (most recent first), null dates at bottom
    return roundsWithPlayerCount.sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date) - new Date(a.date)
    })
  },

  /**
   * Get players for a specific round
   */
  getPlayersForRound: async (roundId) => {
    const { data, error } = await supabase
      .from('player_rounds')
      .select('player_name, final_total, rank, total_score, birdies, eagles, aces')
      .eq('round_id', roundId)
      .order('final_total', { ascending: false })

    if (error) throw error
    return data
  },
}
