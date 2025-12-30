import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Header from './Header'
import BottomNav from './BottomNav'

export default function AppLayout() {
  const { isAuthenticated, isGuest, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
