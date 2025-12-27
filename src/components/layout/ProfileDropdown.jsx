import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, LayoutDashboard, Info, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { player, signOut } = useAuth()

  const userName = player?.player_name || player?.email || 'Player'

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors"
        aria-label="Profile menu"
      >
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <User className="h-4 w-4" />
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium">{userName}</p>
              <p className="text-sm text-muted-foreground">View Profile</p>
            </div>

            {/* Menu items */}
            <div className="py-2">
              <Link
                to="/dashboard"
                className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>

              <Link
                to="/about"
                className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Info className="h-4 w-4" />
                <span>About</span>
              </Link>

              <hr className="my-2 border-border" />

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors w-full text-left text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
