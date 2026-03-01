import { useEffect, useState, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Header from './Header'
import BottomNav from './BottomNav'
import OnboardingTutorial from '@/components/tutorial/Tutorial'
import PULPyWindowModal from '@/components/pulps/PULPyWindowModal'

const WINDOW_POLL_INTERVAL = 30000 // 30 seconds

export default function AppLayout() {
  const { isAuthenticated, isGuest, loading, player } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showOnboarding, setShowOnboarding] = useState(false)

  // PULPy window polling state
  const [activeWindow, setActiveWindow] = useState(null)
  const [showWindowModal, setShowWindowModal] = useState(false)

  // Handle auth and route protection
  useEffect(() => {
    if (loading) return

    if (!isAuthenticated && !isGuest) {
      navigate('/login', { replace: true })
      return
    }

    if (isGuest) {
      const guestBlockedRoutes = ['/pulps', '/admin', '/dashboard']
      const isBlocked = guestBlockedRoutes.some(route => location.pathname.startsWith(route))
      if (isBlocked) {
        navigate('/leaderboard', { replace: true })
      }
    }
  }, [isAuthenticated, isGuest, loading, location.pathname, navigate])

  // Show onboarding tutorial for new players
  useEffect(() => {
    if (!loading && player && !player.onboarding_completed) {
      setShowOnboarding(true)
    }
  }, [player, loading])

  // Poll for active PULPy window — show modal if window opens while user is away from /pulps
  const pollWindow = useCallback(async () => {
    try {
      const res = await fetch('/api/pulp/getWindow')
      const data = await res.json()

      if (!data.success) return

      const w = data.window
      setActiveWindow(w)

      // Show modal only if window is open AND user isn't already on /pulps
      if (w?.status === 'open' && location.pathname !== '/pulps') {
        setShowWindowModal(true)
      }

      // Auto-dismiss modal if window locked/settled/expired
      if (!w || w.status !== 'open') {
        setShowWindowModal(false)
      }
    } catch {
      // Non-fatal — network hiccup
    }
  }, [location.pathname])

  useEffect(() => {
    if (!isAuthenticated) return

    pollWindow()
    const interval = setInterval(pollWindow, WINDOW_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [isAuthenticated, pollWindow])

  // Dismiss modal when user navigates to /pulps
  useEffect(() => {
    if (location.pathname === '/pulps') {
      setShowWindowModal(false)
    }
  }, [location.pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated && !isGuest) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showOnboarding && (
        <OnboardingTutorial onComplete={() => setShowOnboarding(false)} />
      )}

      {/* PULPy window notification (shown when on other pages) */}
      {showWindowModal && (
        <PULPyWindowModal
          window={activeWindow}
          onDismiss={() => setShowWindowModal(false)}
        />
      )}

      <Header />

      <main className="pt-16 pb-20">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
