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

    let subscription = null
    let failsafeTimeout = null

    // Initialize auth and then subscribe - CRITICAL: Must be sequential
    const initAuth = async () => {
      try {
        // Failsafe timeout
        failsafeTimeout = setTimeout(() => {
          console.warn('Auth initialization taking too long (8s), forcing loading to false')
          setLoading(false)
        }, 8000)

        // Step 1: Check for existing session FIRST
        const session = await authAPI.getSession()

        if (session?.user) {
          setUser(session.user)
          // Fetch player profile
          try {
            const playerData = await playerAPI.getPlayerByUserId(session.user.id)
            setPlayer(playerData)
          } catch (playerError) {
            console.error('Error fetching player profile:', playerError)
          }
        }

        // Clear failsafe - initial auth completed successfully
        clearTimeout(failsafeTimeout)
        setLoading(false)

        // Step 2: ONLY subscribe AFTER initial auth is complete
        // This prevents race condition where subscription fires during init
        const { data: subData } = authAPI.onAuthStateChange(
          async (event, newSession) => {
            console.log('Auth state changed:', event)
            setUser(newSession?.user || null)

            if (newSession?.user) {
              try {
                const playerData = await playerAPI.getPlayerByUserId(newSession.user.id)
                setPlayer(playerData)
              } catch (err) {
                console.error('Error fetching player profile:', err)
              }
            } else {
              setPlayer(null)
            }
          }
        )

        subscription = subData.subscription
      } catch (err) {
        console.error('Error initializing auth:', err)
        setUser(null)
        setPlayer(null)
        clearTimeout(failsafeTimeout)
        setLoading(false)
      }
    }

    initAuth()

    // Cleanup
    return () => {
      subscription?.unsubscribe()
      if (failsafeTimeout) clearTimeout(failsafeTimeout)
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
