import { useState } from 'react'
import { FileText, CheckCircle, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import PageContainer from '@/components/layout/PageContainer'
import { motion, AnimatePresence } from 'framer-motion'

const PROCESSING_STEPS = [
  'Fetching emails from Gmail...',
  'Finding UDisc scorecards...',
  'Extracting scores with AI...',
  'Updating round data...',
  'Calculating points...',
  'Updating leaderboard...',
  'Awarding PULPs...',
  'Resolving bets & challenges...'
]

export default function ProcessScorecards() {
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState(null)

  const simulateProcessing = async () => {
    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      setCurrentStep(i)
      setProgress(((i + 1) / PROCESSING_STEPS.length) * 100)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const handleProcessScorecards = async () => {
    setLoading(true)
    setCompleted(false)
    setError(null)
    setCurrentStep(0)
    setProgress(0)

    try {
      // Start step simulation
      const simulationPromise = simulateProcessing()

      // Make actual API call
      const response = await fetch('/api/processScorecard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      // Wait for simulation to complete
      await simulationPromise

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process scorecards')
      }

      setCompleted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      <Card className="p-8 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10 opacity-50"></div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Main Button / Status Display */}
          <AnimatePresence mode="wait">
            {!loading && !completed && !error && (
              <motion.button
                key="button"
                initial={{ scale: 0.9, opacity: 0, rotateY: -15 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  rotateY: 0,
                  y: [0, -5, 0]
                }}
                transition={{
                  y: {
                    repeat: Infinity,
                    duration: 2,
                    ease: "easeInOut"
                  }
                }}
                exit={{ scale: 0.9, opacity: 0 }}
                whileHover={{
                  scale: 1.08,
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
                whileTap={{
                  scale: 0.92,
                  transition: { duration: 0.1 }
                }}
                onClick={handleProcessScorecards}
                className="relative w-48 h-48 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-2xl flex items-center justify-center group overflow-hidden"
                style={{
                  boxShadow: '0 25px 70px -12px rgba(0, 0, 0, 0.4), 0 10px 25px -5px rgba(0, 0, 0, 0.3), inset 0 -8px 16px rgba(0, 0, 0, 0.15), inset 0 2px 8px rgba(255, 255, 255, 0.3)',
                  transform: 'perspective(1000px) rotateX(8deg)',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Animated shine effect */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{
                    x: ['-200%', '200%']
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                    repeatDelay: 2
                  }}
                />

                {/* Inner glow */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/10 to-transparent" />

                {/* Bottom shadow for 3D depth */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent via-transparent to-black/30" />

                {/* Hover overlay */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Content */}
                <div className="relative z-10 text-center" style={{ transform: 'translateZ(20px)' }}>
                  <motion.div
                    animate={{
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 4,
                      ease: "easeInOut"
                    }}
                  >
                    <FileText className="h-14 w-14 text-primary-foreground mx-auto mb-3 drop-shadow-lg" />
                  </motion.div>
                  <p className="text-lg font-bold text-primary-foreground drop-shadow-md">
                    Process Scorecard
                  </p>
                </div>
              </motion.button>
            )}

            {loading && (
              <motion.div
                key="loading"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center w-full"
              >
                {/* Spinner */}
                <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-2xl flex items-center justify-center mb-6">
                  <div className="absolute inset-0 rounded-full border-8 border-primary/20"></div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-8 border-t-primary-foreground border-r-transparent border-b-transparent border-l-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  ></motion.div>
                  <FileText className="h-12 w-12 text-primary-foreground" />
                </div>

                {/* Current Step */}
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-center mb-4"
                >
                  <p className="text-lg font-semibold text-foreground">
                    {PROCESSING_STEPS[currentStep]}
                  </p>
                </motion.div>

                {/* Progress Bar */}
                <div className="w-full max-w-md">
                  <Progress value={progress} className="h-3" />
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Step {currentStep + 1} of {PROCESSING_STEPS.length}
                  </p>
                </div>
              </motion.div>
            )}

            {completed && (
              <motion.div
                key="completed"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                {/* Success Checkmark */}
                <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-2xl flex items-center justify-center mb-6">
                  <CheckCircle className="h-24 w-24 text-white" strokeWidth={2} />
                </div>

                <div className="text-center">
                  <p className="text-xl font-bold text-green-600 mb-2">
                    Scorecard processed, points updated, and bets resolved
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setCompleted(false)
                      setProgress(0)
                    }}
                    className="mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Process Another
                  </motion.button>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                {/* Error Icon */}
                <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-2xl flex items-center justify-center mb-6">
                  <XCircle className="h-24 w-24 text-white" strokeWidth={2} />
                </div>

                <div className="text-center max-w-md">
                  <p className="text-xl font-bold text-red-600 mb-2">
                    Error processing scorecards
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setError(null)
                      setProgress(0)
                    }}
                    className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Try Again
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Info */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-600 font-semibold mb-1">
          ℹ️ Note
        </p>
        <p className="text-sm text-muted-foreground">
          This triggers the same workflow that runs automatically when scorecards are emailed.
        </p>
      </div>
    </PageContainer>
  )
}
