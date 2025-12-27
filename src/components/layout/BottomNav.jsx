import { NavLink } from 'react-router-dom'
import { Trophy, History, Mic2, Bell, Coins } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/rounds', icon: History, label: 'Rounds' },
  { path: '/podcast', icon: Mic2, label: 'Podcast' },
  { path: '/activity', icon: Bell, label: 'Activity' },
  { path: '/betting', icon: Coins, label: 'Betting' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
