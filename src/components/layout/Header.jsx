import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LogIn } from 'lucide-react'
import NotificationBell from './NotificationBell'
import AdminDropdown from './AdminDropdown'
import ProfileDropdown from './ProfileDropdown'
import DemoBanner from './DemoBanner'
import { isDemoMode } from '@/lib/demoMode'

export default function Header() {
  const { isGuest, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLoginClick = () => {
    signOut() // Clear guest mode
    navigate('/login')
  }

  return (
    <header className={`fixed left-0 right-0 z-50 bg-background border-b border-border backdrop-blur-sm bg-opacity-95 ${isDemoMode ? 'top-7 sm:top-8' : 'top-0'}`}>
      <DemoBanner />
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={isGuest ? "/leaderboard" : "/dashboard"} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ParSaveables</h1>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {isGuest ? (
            <>
              <Link
                to="/about"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                About
              </Link>
              {!isDemoMode && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleLoginClick}
                  className="flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              )}
            </>
          ) : (
            <>
              {/* Notifications */}
              <NotificationBell />

              {/* Admin */}
              <AdminDropdown />

              {/* Profile */}
              <ProfileDropdown />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
