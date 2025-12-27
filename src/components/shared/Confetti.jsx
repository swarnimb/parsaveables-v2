import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const ConfettiPiece = ({ delay, color, startX, startY, endX, endY, rotation }) => {
  return (
    <motion.div
      initial={{
        x: startX,
        y: startY,
        opacity: 1,
        rotate: 0,
        scale: 1
      }}
      animate={{
        x: endX,
        y: endY,
        opacity: 0,
        rotate: rotation,
        scale: 0.3
      }}
      transition={{
        duration: 2 + Math.random() * 1,
        delay: delay,
        ease: [0.36, 0, 0.66, -0.56]
      }}
      style={{
        position: 'fixed',
        width: '10px',
        height: '10px',
        backgroundColor: color,
        pointerEvents: 'none',
        zIndex: 9999
      }}
      className="rounded-sm"
    />
  )
}

export default function Confetti({
  active = false,
  duration = 3000,
  particleCount = 50,
  colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
  origin = { x: 0.5, y: 0.5 } // { x: 0-1, y: 0-1 } relative to viewport
}) {
  const [pieces, setPieces] = useState([])
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (active) {
      setIsActive(true)

      // Calculate origin position in pixels
      const originX = window.innerWidth * origin.x
      const originY = window.innerHeight * origin.y

      // Generate confetti pieces
      const newPieces = Array.from({ length: particleCount }, (_, i) => {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5
        const velocity = 100 + Math.random() * 300
        const endX = originX + Math.cos(angle) * velocity
        const endY = originY + Math.sin(angle) * velocity + Math.random() * 400 // Add gravity
        const rotation = Math.random() * 720 - 360

        return {
          id: `confetti-${Date.now()}-${i}`,
          delay: Math.random() * 0.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          startX: originX,
          startY: originY,
          endX,
          endY,
          rotation
        }
      })

      setPieces(newPieces)

      // Clear confetti after duration
      const timer = setTimeout(() => {
        setIsActive(false)
        setPieces([])
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [active, duration, particleCount, colors, origin])

  if (!isActive) return null

  return (
    <AnimatePresence>
      {pieces.map(piece => (
        <ConfettiPiece
          key={piece.id}
          delay={piece.delay}
          color={piece.color}
          startX={piece.startX}
          startY={piece.startY}
          endX={piece.endX}
          endY={piece.endY}
          rotation={piece.rotation}
        />
      ))}
    </AnimatePresence>
  )
}

// Preset configurations
export const confettiPresets = {
  achievement: {
    colors: ['#fbbf24', '#f59e0b', '#d97706', '#b45309'],
    particleCount: 60,
    duration: 3000
  },
  win: {
    colors: ['#10b981', '#059669', '#34d399', '#6ee7b7'],
    particleCount: 80,
    duration: 3500
  },
  podium: {
    colors: ['#fbbf24', '#c0c0c0', '#cd7f32', '#8b5cf6'],
    particleCount: 100,
    duration: 4000
  },
  challenge: {
    colors: ['#ef4444', '#dc2626', '#f87171', '#fca5a5'],
    particleCount: 60,
    duration: 3000
  },
  bet: {
    colors: ['#3b82f6', '#2563eb', '#60a5fa', '#93c5fd'],
    particleCount: 50,
    duration: 2500
  }
}

// useConfetti hook for easy integration
export function useConfetti() {
  const [confetti, setConfetti] = useState({ active: false, preset: null })

  const trigger = (preset = 'achievement', customOrigin = null) => {
    setConfetti({
      active: true,
      preset,
      origin: customOrigin || { x: 0.5, y: 0.5 }
    })

    // Reset after a short delay to allow re-triggering
    setTimeout(() => {
      setConfetti({ active: false, preset: null })
    }, 100)
  }

  return { confetti, trigger }
}
