import { NavLink, useLocation } from 'react-router-dom'
import { Trophy, History, Mic2, Bell, Coins } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { usePodcastNotifications } from '@/hooks/usePodcastNotifications'

const navItems = [
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/rounds', icon: History, label: 'Rounds' },
  { path: '/podcast', icon: Mic2, label: 'Podcast' },
  { path: '/activity', icon: Bell, label: 'Activity' },
  { path: '/pulps', icon: Coins, label: 'PULPs' },
]

export default function BottomNav() {
  const location = useLocation()
  const { isGuest } = useAuth()
  const { unreadCount } = usePodcastNotifications()

  const noHighlightPaths = [
    '/dashboard',
    '/about',
    '/admin/control-center',
    '/admin/process-scorecards'
  ]

  const shouldHideIndicator = noHighlightPaths.includes(location.pathname)

  const activeIndex = shouldHideIndicator
    ? -1
    : navItems.findIndex(item => item.path === location.pathname)

  const indicatorPosition = activeIndex >= 0 ? (activeIndex * 20) + 10 : 10

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border bottom-nav shadow-lg">
      <div className="relative flex items-center justify-around">
        {activeIndex >= 0 && (
          <motion.div
            className="absolute top-0 h-1 w-12 bg-primary rounded-full"
            animate={{ left: `calc(${indicatorPosition}% - 24px)` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}

        {navItems.map(({ path, icon: Icon, label }) => {
          const isPulpsTab = path === '/pulps'
          const isPodcastTab = path === '/podcast'
          const isDisabled = isGuest && isPulpsTab
          const showBadge = isPodcastTab && unreadCount > 0

          return (
            <NavLink
              key={path}
              to={path}
              data-tutorial-target={label.toLowerCase()}
              onClick={(e) => { if (isDisabled) e.preventDefault() }}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-200',
                  'min-h-[60px] py-2',
                  isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                  isDisabled && 'opacity-50 pointer-events-none'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <motion.div
                    whileTap={{ scale: 0.85 }}
                    className={cn(
                      'relative rounded-xl p-1.5 transition-colors duration-200',
                      isActive && 'bg-primary/10'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-110')} />

                    {showBadge && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </motion.div>

                  <span className={cn('text-xs font-medium transition-all duration-200', isActive && 'font-semibold scale-105')}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
