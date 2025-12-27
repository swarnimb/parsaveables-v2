import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, Sparkles } from 'lucide-react'
import Confetti, { confettiPresets } from './Confetti'

export default function CelebrationModal({
  isOpen,
  onClose,
  title,
  description,
  icon = <Trophy className="h-12 w-12" />,
  accentColor = 'yellow',
  confettiPreset = 'achievement',
  reward
}) {
  const accentColors = {
    yellow: 'from-yellow-500 to-amber-600',
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-cyan-600',
    purple: 'from-purple-500 to-pink-600',
    red: 'from-red-500 to-orange-600'
  }

  const pulseAnimation = {
    scale: [1, 1.1, 1],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 1
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Confetti */}
          <Confetti
            active={isOpen}
            {...confettiPresets[confettiPreset]}
            origin={{ x: 0.5, y: 0.4 }}
          />

          {/* Modal Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-card border-2 border-primary rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Animated Background Effect */}
                <div className="absolute inset-0 opacity-10">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 90, 180, 270, 360]
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: 'linear'
                    }}
                    className={`absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br ${accentColors[accentColor]} rounded-full blur-3xl`}
                  />
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors z-10"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Content */}
                <div className="relative z-10 text-center">
                  {/* Icon */}
                  <motion.div
                    animate={pulseAnimation}
                    className={`inline-flex h-24 w-24 rounded-full bg-gradient-to-br ${accentColors[accentColor]} items-center justify-center mb-6 shadow-lg`}
                  >
                    <div className="text-white">{icon}</div>
                  </motion.div>

                  {/* Sparkles */}
                  <motion.div
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0.8, 1.2, 0.8]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className="absolute top-16 left-1/2 -translate-x-1/2"
                  >
                    <Sparkles className="h-6 w-6 text-yellow-400" />
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold mb-3"
                  >
                    {title}
                  </motion.h2>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-muted-foreground mb-6 leading-relaxed"
                  >
                    {description}
                  </motion.p>

                  {/* Reward Badge */}
                  {reward && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, type: 'spring' }}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r ${accentColors[accentColor]} text-white font-bold text-lg shadow-lg`}
                    >
                      <Sparkles className="h-5 w-5" />
                      {reward}
                    </motion.div>
                  )}

                  {/* Action Button */}
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="mt-8 w-full py-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
                  >
                    Awesome!
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Example usage:
// <CelebrationModal
//   isOpen={showCelebration}
//   onClose={() => setShowCelebration(false)}
//   title="Achievement Unlocked!"
//   description="You've just earned the 'Birdie Master' achievement for getting 10 birdies in a single round!"
//   icon={<Trophy className="h-12 w-12" />}
//   accentColor="yellow"
//   confettiPreset="achievement"
//   reward="+100 PULPs"
// />
