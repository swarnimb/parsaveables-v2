import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { playerAPI } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

export default function Login() {
  const { toast } = useToast()
  const [mode, setMode] = useState('signin') // 'signin' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [unclaimedPlayers, setUnclaimedPlayers] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signIn, signUp, continueAsGuest, isAuthenticated, isGuest, loading } = useAuth()
  const navigate = useNavigate()

  // Fetch unclaimed players when switching to signup mode
  useEffect(() => {
    if (mode === 'signup') {
      playerAPI.getUnclaimedPlayers()
        .then(setUnclaimedPlayers)
        .catch(err => {
          console.error('Error fetching players:', err)
          console.error('Error message:', err.message)
          console.error('Error details:', err.details)
        })
    }
  }, [mode])

  // Redirect if already authenticated or in guest mode
  useEffect(() => {
    if ((isAuthenticated || isGuest) && !loading) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isGuest, loading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (mode === 'signin') {
        await signIn(email, password)
        toast({
          title: 'Signed In!',
          description: 'Welcome back to ParSaveables'
        })
      } else {
        // Sign up mode
        if (!selectedPlayerId) {
          toast({
            variant: 'destructive',
            title: 'Player Not Selected',
            description: 'Please select your player name to create an account'
          })
          setIsSubmitting(false)
          return
        }
        await signUp(email, password, parseInt(selectedPlayerId))
        toast({
          title: 'Account Created!',
          description: 'Welcome to ParSaveables'
        })
      }
      // Navigation will happen via useEffect when isAuthenticated becomes true
    } catch (error) {
      toast({
        variant: 'destructive',
        title: mode === 'signin' ? 'Sign In Failed' : 'Sign Up Failed',
        description: error.message || `Failed to ${mode === 'signin' ? 'sign in' : 'sign up'}`
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">ParSaveables v2</h1>
        </div>

        {/* Auth Form */}
        <div className="border border-border rounded-lg p-6 bg-card">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`pb-2 px-4 font-medium transition-colors ${
                mode === 'signin'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`pb-2 px-4 font-medium transition-colors ${
                mode === 'signup'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>

            {/* Player Selection (Sign Up only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="player" className="block text-sm font-medium mb-2">
                  Select Your Player Name
                </label>
                <select
                  id="player"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose your name...</option>
                  {unclaimedPlayers.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.player_name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {unclaimedPlayers.length === 0
                    ? 'Loading players...'
                    : `${unclaimedPlayers.length} player(s) available`}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting
                ? mode === 'signin' ? 'Signing in...' : 'Creating account...'
                : mode === 'signin' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {/* Note */}
          {mode === 'signin' ? (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Don't have an account? Click "Sign Up" above
            </p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Select your name from existing players to create your account
            </p>
          )}
        </div>

        {/* Guest Access */}
        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">OR</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              continueAsGuest()
              navigate('/dashboard')
            }}
            className="mt-4 w-full py-2 px-4 border border-border rounded-md font-medium text-foreground hover:bg-accent transition-colors"
          >
            Continue as Guest
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Browse and view content without creating an account
          </p>
        </div>
      </div>
    </div>
  )
}
