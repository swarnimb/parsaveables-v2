import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Header from './Header'
import BottomNav from './BottomNav'
import OnboardingTutorial from '@/components/tutorial/Tutorial'
import BettingTutorial from '@/components/tutorial/BettingTutorial'
import ComingSoon from '@/components/betting/ComingSoon'
import { tutorialAPI } from '@/services/api'

export default function AppLayout() {
  const { isAuthenticated, isGuest, loading, player } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showBettingTutorial, setShowBettingTutorial] = useState(false)

  // Handle authentication and route protection in single effect to prevent race conditions
  useEffect(() => {
    if (loading) return // Wait for auth to load

    // Priority 1: Not authenticated and not guest → redirect to login
    if (!isAuthenticated && !isGuest) {
      navigate('/login', { replace: true })
      return
    }

    // Priority 2: Guest accessing blocked routes → redirect to leaderboard
    if (isGuest) {
      const guestBlockedRoutes = ['/betting', '/admin', '/dashboard']
      const isBlocked = guestBlockedRoutes.some(route =>
        location.pathname.startsWith(route)
      )

      if (isBlocked) {
        navigate('/leaderboard', { replace: true })
      }
    }
  }, [isAuthenticated, isGuest, loading, location.pathname, navigate])

  // Check if onboarding tutorial should be shown
  useEffect(() => {
    if (!loading && player && !player.onboarding_completed) {
      setShowOnboarding(true)
    }
  }, [player, loading])

  // Intercept betting navigation
  useEffect(() => {
    if (!loading && player && location.pathname === '/betting') {
      if (player.betting_interest_confirmed === true) {
        // User confirmed interest - do nothing, ComingSoon will render via Outlet
      } else {
        // User hasn't confirmed - show tutorial
        tutorialAPI.markBettingInterestShown(player.id).catch(err => {
          console.error('Error marking betting interest shown:', err)
        })
        setShowBettingTutorial(true)
      }
    }
  }, [location.pathname, player, loading])

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Don't render protected content if not authenticated and not guest
  if (!isAuthenticated && !isGuest) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Onboarding Tutorial */}
      {showOnboarding && (
        <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Betting Tutorial */}
      {showBettingTutorial && (
        <BettingTutorial onClose={() => {
          setShowBettingTutorial(false)
          // Navigate away from betting page if still there
          if (location.pathname === '/betting') {
            navigate('/leaderboard')
          }
        }} />
      )}

      {/* Sticky header */}
      <Header />

      {/* Main content area with padding for header and bottom nav */}
      <main className="pt-16 pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
