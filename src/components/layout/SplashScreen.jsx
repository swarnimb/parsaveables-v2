import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    // Check if splash has been shown in this session
    const splashShown = sessionStorage.getItem('splashShown')

    if (!splashShown) {
      setShowSplash(true)

      // Hide after 2.5 seconds and mark as shown
      const timer = setTimeout(() => {
        setShowSplash(false)
        sessionStorage.setItem('splashShown', 'true')
      }, 2500)

      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-white flex items-center justify-center"
        >
          <div className="relative flex items-center justify-center h-screen w-full">
            {/* Branding Logo - vertically aligned to screen height */}
            <div className="flex items-center justify-center h-full">
              <img
                src="/branding-logo.jpeg"
                alt="ParSaveables"
                className="h-full w-auto object-contain"
                style={{ maxHeight: '100vh' }}
              />
            </div>

            {/* Spinner wheel in the center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
