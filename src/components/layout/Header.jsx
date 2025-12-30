import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/badge'
import NotificationBell from './NotificationBell'
import AdminDropdown from './AdminDropdown'
import ProfileDropdown from './ProfileDropdown'

export default function Header() {
  const { isGuest } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border backdrop-blur-sm bg-opacity-95">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={isGuest ? "/leaderboard" : "/dashboard"} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ParSaveables</h1>
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {isGuest ? (
            /* Guest Badge */
            <Badge variant="outline" className="text-muted-foreground">
              Guest
            </Badge>
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
