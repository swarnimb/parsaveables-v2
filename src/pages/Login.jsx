import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { playerAPI } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

// SVG icons for OAuth providers
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}


export default function Login() {
  const { toast } = useToast()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [unclaimedPlayers, setUnclaimedPlayers] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null) // 'google' | 'apple' | null

  const { user, signIn, signUp, signInWithOAuth, continueAsGuest, isAuthenticated, isGuest, player, loading } = useAuth()
  const navigate = useNavigate()

  // Fetch unclaimed players for signup and for OAuth player-claim flow
  useEffect(() => {
    if (mode === 'signup' || (isAuthenticated && !player && !loading)) {
      playerAPI.getUnclaimedPlayers()
        .then(setUnclaimedPlayers)
        .catch(err => console.error('Error fetching players:', err))
    }
  }, [mode, isAuthenticated, player, loading])

  // Redirect once authenticated AND player is linked
  useEffect(() => {
    if ((isGuest || (isAuthenticated && player)) && !loading) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, isGuest, player, loading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (mode === 'signin') {
        await signIn(email, password)
        toast({ title: 'Signed In!', description: 'Welcome back to ParSaveables' })
      } else {
        if (!selectedPlayerId) {
          toast({ variant: 'destructive', title: 'Player Not Selected', description: 'Please select your player name to create an account' })
          setIsSubmitting(false)
          return
        }
        await signUp(email, password, parseInt(selectedPlayerId))
        toast({ title: 'Account Created!', description: 'Welcome to ParSaveables' })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: mode === 'signin' ? 'Sign In Failed' : 'Sign Up Failed', description: error.message || `Failed to ${mode === 'signin' ? 'sign in' : 'sign up'}` })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuth = async (provider) => {
    setOauthLoading(provider)
    try {
      await signInWithOAuth(provider)
      // Browser redirects to provider — execution stops here
    } catch (error) {
      toast({ variant: 'destructive', title: 'Sign In Failed', description: error.message })
      setOauthLoading(null)
    }
  }

  // After OAuth redirect: user is authenticated but hasn't claimed a player name yet
  const handleClaimPlayer = async () => {
    if (!selectedPlayerId) {
      toast({ variant: 'destructive', title: 'Player Not Selected', description: 'Please select your player name' })
      return
    }
    setIsSubmitting(true)
    try {
      await playerAPI.linkPlayerToUser(parseInt(selectedPlayerId), user.id)
      toast({ title: 'Welcome!', description: 'Your player name has been linked.' })
      // useAuth will re-fetch player via onAuthStateChange — redirect happens automatically
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to link player', description: error.message })
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

  // OAuth completed but player not yet claimed — show player selection
  if (isAuthenticated && !player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">ParSaveables</h1>
            <p className="text-muted-foreground text-sm">One last step — select your player name</p>
          </div>

          <div className="border border-border rounded-lg p-6 bg-card space-y-4">
            <div>
              <label htmlFor="player-claim" className="block text-sm font-medium mb-2">
                Select Your Player Name
              </label>
              <select
                id="player-claim"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Choose your name...</option>
                {unclaimedPlayers.map(p => (
                  <option key={p.id} value={p.id}>{p.player_name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                {unclaimedPlayers.length === 0 ? 'Loading players...' : `${unclaimedPlayers.length} player(s) available`}
              </p>
            </div>

            <button
              onClick={handleClaimPlayer}
              disabled={isSubmitting || !selectedPlayerId}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Linking...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">ParSaveables</h1>
        </div>

        {/* Auth Form */}
        <div className="border border-border rounded-lg p-6 bg-card">

          {/* OAuth Buttons */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              disabled={!!oauthLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-input rounded-md bg-background hover:bg-accent font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              {oauthLoading === 'google' ? 'Redirecting...' : 'Continue with Google'}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-card text-muted-foreground">or</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`pb-2 px-4 font-medium transition-colors ${
                mode === 'signin' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`pb-2 px-4 font-medium transition-colors ${
                mode === 'signup' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
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
              <label htmlFor="password" className="block text-sm font-medium mb-2">Password</label>
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
                <label htmlFor="player" className="block text-sm font-medium mb-2">Select Your Player Name</label>
                <select
                  id="player"
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose your name...</option>
                  {unclaimedPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.player_name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {unclaimedPlayers.length === 0 ? 'Loading players...' : `${unclaimedPlayers.length} player(s) available`}
                </p>
              </div>
            )}

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

          {mode === 'signin' ? (
            <p className="mt-4 text-xs text-muted-foreground text-center">Don't have an account? Click "Sign Up" above</p>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground text-center">Select your name from existing players to create your account</p>
          )}
        </div>

        {/* Guest Access */}
        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">OR</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { continueAsGuest(); navigate('/dashboard') }}
            className="mt-4 w-full py-2 px-4 border border-border rounded-md font-medium text-foreground hover:bg-accent transition-colors"
          >
            Continue as Guest
          </button>
          <p className="mt-2 text-xs text-muted-foreground">Browse and view content without creating an account</p>
        </div>
      </div>
    </div>
  )
}
