import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Animated PULP counter with color flash on value change
 * @param {number} value - Current PULP value
 * @param {number} previousValue - Previous PULP value (for detecting increase/decrease)
 * @param {string} className - Additional CSS classes
 * @param {boolean} showDelta - Show +/- change indicator
 * @param {number} duration - Animation duration in seconds
 */
export default function PulpCounter({
  value = 0,
  previousValue = null,
  className = '',
  showDelta = false,
  duration = 0.5
}) {
  const [displayValue, setDisplayValue] = useState(value)
  const [flashColor, setFlashColor] = useState(null)
  const [delta, setDelta] = useState(null)

  useEffect(() => {
    if (previousValue !== null && previousValue !== value) {
      const change = value - previousValue

      // Determine flash color based on change
      if (change > 0) {
        setFlashColor('text-green-500')
        setDelta(`+${change}`)
      } else if (change < 0) {
        setFlashColor('text-red-500')
        setDelta(`${change}`)
      }

      // Animate the counter
      const startValue = previousValue
      const endValue = value
      const startTime = Date.now()
      const animationDuration = duration * 1000

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / animationDuration, 1)

        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3)

        const currentValue = Math.round(
          startValue + (endValue - startValue) * easeProgress
        )

        setDisplayValue(currentValue)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          // Clear flash color after animation
          setTimeout(() => {
            setFlashColor(null)
            setDelta(null)
          }, 300)
        }
      }

      requestAnimationFrame(animate)
    } else {
      setDisplayValue(value)
    }
  }, [value, previousValue, duration])

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <motion.span
        key={displayValue}
        initial={{ scale: 1 }}
        animate={{
          scale: flashColor ? [1, 1.2, 1] : 1,
          color: flashColor || 'inherit'
        }}
        transition={{
          duration: 0.3,
          ease: 'easeOut'
        }}
        className={`font-bold tabular-nums ${flashColor || ''}`}
      >
        {displayValue.toLocaleString()}
      </motion.span>

      {/* Delta indicator */}
      <AnimatePresence>
        {showDelta && delta && (
          <motion.span
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className={`text-sm font-semibold ${flashColor || ''}`}
          >
            {delta}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Hook for managing PULP counter state
 * Returns current value, previous value, and update function
 */
export function usePulpCounter(initialValue = 0) {
  const [value, setValue] = useState(initialValue)
  const [previousValue, setPreviousValue] = useState(null)

  const updateValue = (newValue) => {
    setPreviousValue(value)
    setValue(newValue)
  }

  const increment = (amount = 1) => {
    updateValue(value + amount)
  }

  const decrement = (amount = 1) => {
    updateValue(value - amount)
  }

  return {
    value,
    previousValue,
    updateValue,
    increment,
    decrement
  }
}
