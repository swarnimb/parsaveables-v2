import NotificationBell from './NotificationBell'
import AdminDropdown from './AdminDropdown'
import ProfileDropdown from './ProfileDropdown'

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border backdrop-blur-sm bg-opacity-95">
      <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">ParSaveables</h1>
          <span className="text-xs font-medium text-muted-foreground px-1.5 py-0.5 bg-muted rounded">v2</span>
        </div>

        {/* Right side actions - 3 icons */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <NotificationBell />

          {/* Admin */}
          <AdminDropdown />

          {/* Profile */}
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}
