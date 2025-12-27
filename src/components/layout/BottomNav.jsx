import { NavLink } from 'react-router-dom'
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
  const handleTap = () => {
    // Haptic feedback simulation via CSS animation
    // In a real app with native capabilities, you'd trigger:
    // if (window.navigator && window.navigator.vibrate) {
    //   window.navigator.vibrate(10)
    // }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border bottom-nav shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={handleTap}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-200',
                'min-h-[60px] py-2',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground active:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

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
