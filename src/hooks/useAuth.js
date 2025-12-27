import { useState, useEffect } from 'react'
import { authAPI, playerAPI } from '@/services/api'

/**
 * Custom hook for authentication state and actions
 */
export function useAuth() {
  const [user, setUser] = useState(null)
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize auth state on mount
  useEffect(() => {
    // Check for existing session
    authAPI.getSession().then((session) => {
      if (session?.user) {
        setUser(session.user)
        // Fetch player profile
        playerAPI.getPlayerByUserId(session.user.id)
          .then(setPlayer)
          .catch(console.error)
      }
      setLoading(false)
    })

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

    // Cleanup subscription on unmount
    return () => {
      subscription?.unsubscribe()
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
      await authAPI.signOut()
      setUser(null)
      setPlayer(null)
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  return {
    user,
    player,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  }
}
