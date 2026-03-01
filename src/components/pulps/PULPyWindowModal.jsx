import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'

/**
 * PULPyWindowModal — non-blocking overlay that appears when a window opens
 * while the user is on a page other than /pulps.
 *
 * Auto-dismisses when the window transitions to 'locked'.
 *
 * Props:
 * - window: active window object (with secondsRemaining)
 * - onDismiss: callback to hide modal
 */
export default function PULPyWindowModal({ window, onDismiss }) {
  const navigate = useNavigate()
  const [timeDisplay, setTimeDisplay] = useState('')

  useEffect(() => {
    if (!window?.secondsRemaining && window?.secondsRemaining !== 0) return

    const update = () => {
      const s = Math.max(0, window.secondsRemaining - Math.floor((Date.now() - loadedAt) / 1000))
      const mins = Math.floor(s / 60)
      const secs = s % 60
      setTimeDisplay(`${mins}:${String(secs).padStart(2, '0')}`)

      if (s === 0) onDismiss()
    }

    const loadedAt = Date.now()
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [window?.secondsRemaining])

  return (
    <AnimatePresence>
      {window?.status === 'open' && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/20 via-background to-primary/5 shadow-2xl shadow-primary/30 p-5">
            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0"
              >
                <Zap className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <p className="font-bold text-base">PULPy Window Open!</p>
                <p className="text-sm text-muted-foreground">
                  {timeDisplay ? `${timeDisplay} remaining` : 'Window is live'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  navigate('/pulps')
                  onDismiss()
                }}
              >
                Go to PULPs
              </Button>
              <Button size="sm" variant="outline" onClick={onDismiss} className="flex-1">
                Dismiss
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
