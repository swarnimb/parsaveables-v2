import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Header from './Header'
import BottomNav from './BottomNav'
import OnboardingTutorial from '@/components/tutorial/Tutorial'
import BettingTutorial from '@/components/tutorial/BettingTutorial'
import { tutorialAPI } from '@/services/api'

export default function AppLayout() {
  const { isAuthenticated, isGuest, loading, player } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showBettingTutorial, setShowBettingTutorial] = useState(false)

  // Redirect to login if not authenticated and not guest
  useEffect(() => {
    if (!loading && !isAuthenticated && !isGuest) {
      navigate('/login')
    }
  }, [isAuthenticated, isGuest, loading, navigate])

  // Block guests from restricted routes
  useEffect(() => {
    if (!loading && isGuest) {
      const guestBlockedRoutes = ['/betting', '/admin', '/dashboard']
      const isBlocked = guestBlockedRoutes.some(route =>
        location.pathname.startsWith(route)
      )

      if (isBlocked) {
        navigate('/leaderboard', { replace: true })
      }
    }
  }, [isGuest, loading, location.pathname, navigate])

  // Check if onboarding tutorial should be shown
  useEffect(() => {
    if (!loading && player && !player.onboarding_completed) {
      setShowOnboarding(true)
    }
  }, [player, loading])

  // Intercept betting navigation for tutorial
  useEffect(() => {
    // Show tutorial if user hasn't confirmed interest (undefined or false)
    if (!loading && player && location.pathname === '/betting' && player.betting_interest_confirmed !== true) {
      // Mark as shown in database
      tutorialAPI.markBettingInterestShown(player.id).catch(err => {
        console.error('Error marking betting interest shown:', err)
      })

      // Show tutorial (it will handle navigation on close)
      setShowBettingTutorial(true)
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
