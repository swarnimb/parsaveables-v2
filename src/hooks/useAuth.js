import { useState, useEffect } from 'react'
import { authAPI, playerAPI } from '@/services/api'

/**
 * Custom hook for authentication state and actions
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [player, setPlayer] = useState(null)
  const [isGuest, setIsGuest] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize auth state on mount
  useEffect(() => {
    // Check for guest mode first
    const guestFlag = sessionStorage.getItem('guestMode')
    if (guestFlag === 'true') {
      setIsGuest(true)
      setLoading(false)
      return
    }

    // Failsafe: Ensure loading never hangs for more than 10 seconds
    // This should only fire if Supabase is completely unresponsive
    const failsafeTimeout = setTimeout(() => {
      console.warn('Auth initialization taking too long (10s), forcing loading to false')
      setLoading(false)
    }, 10000)

    // Check for existing session with proper error handling
    const initAuth = async () => {
      try {
        const session = await authAPI.getSession()
        if (session?.user) {
          setUser(session.user)
          // Fetch player profile (non-blocking)
          try {
            const playerData = await playerAPI.getPlayerByUserId(session.user.id)
            setPlayer(playerData)
          } catch (playerError) {
            console.error('Error fetching player profile:', playerError)
            // Don't block auth - user can still proceed
          }
        }
      } catch (err) {
        console.error('Error checking session:', err)
        // Clear any stale session data
        setUser(null)
        setPlayer(null)
      } finally {
        // Clear failsafe timeout
        clearTimeout(failsafeTimeout)
        // ALWAYS set loading to false, even on error
        setLoading(false)
      }
    }

    initAuth()

    // Subscribe to auth state changes
    const { data: { subscription } } = authAPI.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)

        // Fetch player profile when user signs in
        if (session?.user) {
          try {
            const playerData = await playerAPI.getPlayerByUserId(session.user.id)
            setPlayer(playerData)
          } catch (err) {
            console.error('Error fetching player profile:', err)
          }
        } else {
          setPlayer(null)
        }
      }
    )

    // Cleanup subscription and timeout on unmount
    return () => {
      subscription?.unsubscribe()
      clearTimeout(failsafeTimeout)
    }
  }, [])

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    try {
      setError(null)
      setLoading(true)
      await authAPI.signIn(email, password)
      // User state will be updated via onAuthStateChange
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign up new user and link to existing player
   */
  const signUp = async (email, password, playerId) => {
    try {
      setError(null)
      setLoading(true)
      const { user } = await authAPI.signUp(email, password)

      // Link auth user to existing player
      if (user && playerId) {
        await playerAPI.linkPlayerToUser(playerId, user.id)
      }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign out current user
   */
  const signOut = async () => {
    try {
      setError(null)

      // Clear guest mode if active
      if (isGuest) {
        sessionStorage.removeItem('guestMode')
        setIsGuest(false)
        return
      }

      await authAPI.signOut()
      setUser(null)
      setPlayer(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  /**
   * Continue as guest (no authentication)
   */
  const continueAsGuest = () => {
    sessionStorage.setItem('guestMode', 'true')
    setIsGuest(true)
    setUser(null)
    setPlayer(null)
  }

  return {
    user,
    player,
    isGuest,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    continueAsGuest,
    isAuthenticated: !!user,
    isPlayer: !!player,
  }
}
