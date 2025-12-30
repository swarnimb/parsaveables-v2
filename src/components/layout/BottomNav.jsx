import { NavLink, useLocation } from 'react-router-dom'
import { Trophy, History, Mic2, Bell, Coins } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/rounds', icon: History, label: 'Rounds' },
  { path: '/podcast', icon: Mic2, label: 'Podcast' },
  { path: '/activity', icon: Bell, label: 'Activity' },
  { path: '/betting', icon: Coins, label: 'Betting' },
]

export default function BottomNav() {
  const location = useLocation()

  // Find the index of the active tab
  const activeIndex = navItems.findIndex(item => item.path === location.pathname)

  // Calculate indicator position (each tab is 20% wide since we have 5 tabs with flex-1)
  // Position at center of each tab: 10%, 30%, 50%, 70%, 90%
  const indicatorPosition = activeIndex >= 0 ? (activeIndex * 20) + 10 : 10

  const handleTap = () => {
    // Haptic feedback simulation via CSS animation
    // In a real app with native capabilities, you'd trigger:
    // if (window.navigator && window.navigator.vibrate) {
    //   window.navigator.vibrate(10)
    // }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border bottom-nav shadow-lg">
      <div className="relative flex items-center justify-around">
        {/* Single persistent indicator */}
        <motion.div
          className="absolute top-0 h-1 w-12 bg-primary rounded-full"
          animate={{
            left: `calc(${indicatorPosition}% - 24px)` // 24px is half of w-12 (48px)
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30
          }}
        />

        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={handleTap}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-200',
                'min-h-[60px] py-2',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Icon with press animation */}
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={cn(
                    'relative rounded-xl p-1.5 transition-colors duration-200',
                    isActive && 'bg-primary/10'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    isActive && 'scale-110'
                  )} />

                  {/* Ripple effect container */}
                  <span className="absolute inset-0 rounded-xl overflow-hidden">
                    <span className="absolute inset-0 bg-primary/10 scale-0 group-active:scale-100 transition-transform duration-300 rounded-full" />
                  </span>
                </motion.div>

                {/* Label */}
                <span className={cn(
                  'text-xs font-medium transition-all duration-200',
                  isActive && 'font-semibold scale-105'
                )}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
