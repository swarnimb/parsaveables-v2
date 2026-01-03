import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

/**
 * TutorialSpotlight Component
 * Creates a semi-transparent overlay with spotlight effect on target element
 * Shows tutorial content positioned near the highlighted element
 */
export default function TutorialSpotlight({ target, children, position = 'above' }) {
  const [targetRect, setTargetRect] = useState(null)

  useEffect(() => {
    if (!target) {
      setTargetRect(null)
      return
    }

    const updatePosition = () => {
      const element = document.querySelector(`[data-tutorial-target="${target}"]`)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
      }
    }

    // Initial position
    updatePosition()

    // Update on resize/scroll
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [target])

  if (!target || !targetRect) {
    // No spotlight, show centered content
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Semi-transparent backdrop */}
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

        {/* Centered content */}
        <div className="relative z-10 w-full max-w-2xl">
          {children}
        </div>
      </div>
    )
  }

  // Calculate content position based on target and position prop
  const getContentStyle = () => {
    const spacing = 20 // Gap between spotlight and content

    if (position === 'above') {
      return {
        left: '50%',
        bottom: `${window.innerHeight - targetRect.top + spacing}px`,
        transform: 'translateX(-50%)',
        maxWidth: '90vw'
      }
    } else if (position === 'below') {
      return {
        left: '50%',
        top: `${targetRect.bottom + spacing}px`,
        transform: 'translateX(-50%)',
        maxWidth: '90vw'
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Semi-transparent backdrop with cutout effect */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Spotlight effect - glowing box around target */}
      <div
        className="absolute rounded-lg"
        style={{
          left: `${targetRect.left - 8}px`,
          top: `${targetRect.top - 8}px`,
          width: `${targetRect.width + 16}px`,
          height: `${targetRect.height + 16}px`,
          boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.8)',
          pointerEvents: 'none'
        }}
      />

      {/* Animated arrow pointing to target */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: position === 'above' ? 10 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-20"
          style={{
            left: `${targetRect.left + targetRect.width / 2}px`,
            [position === 'above' ? 'bottom' : 'top']: position === 'above'
              ? `${window.innerHeight - targetRect.top + 12}px`
              : `${targetRect.bottom + 12}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <motion.div
            animate={{
              y: position === 'above' ? [-4, 4, -4] : [4, -4, 4]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <ChevronDown
              className={`h-8 w-8 text-primary ${position === 'above' ? 'rotate-180' : ''}`}
              strokeWidth={3}
            />
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Tutorial content */}
      <div
        className="absolute z-10"
        style={getContentStyle()}
      >
        {children}
      </div>
    </div>
  )
}
