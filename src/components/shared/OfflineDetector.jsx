import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/**
 * Offline Detection Component
 * Monitors network connectivity and displays banner/toast when offline
 */
export default function OfflineDetector() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showBanner, setShowBanner] = useState(!navigator.onLine)
  const { toast } = useToast()

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowBanner(false)

      // Show success toast when connection restored
      toast({
        title: 'Connection Restored',
        description: 'You are back online',
        duration: 3000
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)

      // Show warning toast when offline
      toast({
        variant: 'destructive',
        title: 'No Internet Connection',
        description: 'Some features may not work offline',
        duration: 5000
      })
    }

    // Add event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast])

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-3">
              <WifiOff className="h-5 w-5 animate-pulse" />
              <p className="text-sm font-medium">
                You are currently offline. Some features may not be available.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Hook to check online status
 * @returns {boolean} isOnline - Current online status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * Component to conditionally render content based on online status
 */
export function OnlineOnly({ children, fallback = null }) {
  const isOnline = useOnlineStatus()
  return isOnline ? children : fallback
}

/**
 * Component to render content only when offline
 */
export function OfflineOnly({ children }) {
  const isOnline = useOnlineStatus()
  return !isOnline ? children : null
}
