import { motion } from 'framer-motion'
import { FileText, ArrowRight, Calculator, Trophy } from 'lucide-react'

/**
 * AnimatedFlow Component
 * Shows animated transformation: Scorecard → Points → Leaderboard
 */
export default function AnimatedFlow() {
  return (
    <div className="flex items-center justify-center gap-4 py-8">
      {/* Scorecard */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{
            y: [0, -8, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="h-16 w-16 rounded-lg bg-primary/20 flex items-center justify-center"
        >
          <FileText className="h-8 w-8 text-primary" />
        </motion.div>
        <span className="text-xs text-muted-foreground font-medium">Scorecard</span>
      </motion.div>

      {/* Arrow 1 */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <motion.div
          animate={{ x: [0, 8, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        >
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
        </motion.div>
      </motion.div>

      {/* Points Calculation */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="h-16 w-16 rounded-lg bg-green-500/20 flex items-center justify-center"
        >
          <Calculator className="h-8 w-8 text-green-500" />
        </motion.div>
        <motion.span
          className="text-xs text-muted-foreground font-medium"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          +10 pts
        </motion.span>
      </motion.div>

      {/* Arrow 2 */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <motion.div
          animate={{ x: [0, 8, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 0.5
          }}
        >
          <ArrowRight className="h-6 w-6 text-muted-foreground" />
        </motion.div>
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="h-16 w-16 rounded-lg bg-yellow-500/20 flex items-center justify-center relative"
        >
          <Trophy className="h-8 w-8 text-yellow-500" />

          {/* Update pulse */}
          <motion.div
            animate={{
              scale: [1, 1.4],
              opacity: [0.6, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="absolute inset-0 rounded-lg bg-yellow-500/30"
          />
        </motion.div>
        <span className="text-xs text-muted-foreground font-medium">Updated!</span>
      </motion.div>
    </div>
  )
}
