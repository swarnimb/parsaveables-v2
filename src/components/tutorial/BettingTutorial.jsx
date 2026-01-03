import { useState } from 'react'
import { ChevronRight, Check, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { bettingScreens } from './tutorialData'
import { tutorialAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'

/**
 * BettingTutorial Component
 * 5 screens introducing PULP economy with interest confirmation
 */
export default function BettingTutorial({ onClose }) {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [responseType, setResponseType] = useState(null) // 'interested' | 'not-interested'
  const { player } = useAuth()
  const navigate = useNavigate()

  const screen = bettingScreens[currentScreen]
  const isInterestScreen = screen?.isInterestScreen
  const isLastScreen = currentScreen === bettingScreens.length - 1
  const progress = ((currentScreen + 1) / bettingScreens.length) * 100

  const handleNext = () => {
    if (isInterestScreen) {
      // On interest screen, wait for user to choose
      return
    }
    setCurrentScreen(prev => prev + 1)
  }

  const handleInterested = async () => {
    // Update database: betting_interest_confirmed = true
    try {
      if (player?.id) {
        await tutorialAPI.confirmBettingInterest(player.id)
      }
    } catch (error) {
      console.error('Error confirming betting interest:', error)
    }

    setResponseType('interested')
  }

  const handleNotInterested = () => {
    // Don't update confirmation, just show chicken message
    setResponseType('not-interested')
  }

  const handleGotIt = () => {
    // Navigate to leaderboard and close
    navigate('/leaderboard')
    onClose?.()
  }

  // Response screen (after user chooses)
  if (responseType) {
    const isInterested = responseType === 'interested'

    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className={`h-16 w-16 rounded-full ${isInterested ? 'bg-green-500/20' : 'bg-orange-500/20'} flex items-center justify-center`}>
              {isInterested ? (
                <Check className="h-8 w-8 text-green-500" />
              ) : (
                <span className="text-4xl">🐔</span>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">
                {isInterested ? 'Thank You!' : "Someone's a chicken"}
              </h3>
              <p className="text-muted-foreground">
                {isInterested
                  ? 'Thank you for showing interest, a new betting economy is coming to you shortly.'
                  : 'No worries, you can check it out later!'}
              </p>
            </div>

            <Button onClick={handleGotIt} size="lg">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Main tutorial screens
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="mb-6">
          <DialogDescription className="text-sm text-muted-foreground">
            Screen {currentScreen + 1} of {bettingScreens.length}
          </DialogDescription>
          <DialogTitle className="sr-only">
            Betting Tutorial - {screen.title}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Bar */}
        <Progress value={progress} className="mb-6" />

        {/* Screen Content */}
        <div className="py-6">
          <div className="text-center space-y-4">
            {/* Emoji */}
            <div className="text-6xl">{screen.emoji}</div>

            {/* Title */}
            <h2 className="text-2xl font-bold">{screen.title}</h2>

            {/* Content */}
            <p className="text-muted-foreground leading-relaxed">
              {screen.content}
            </p>

            {/* Advantages Grid (Screen 4) */}
            {screen.showAdvantages && screen.advantages && (
              <div className="grid grid-cols-2 gap-3 mt-6 max-w-xs mx-auto">
                {screen.advantages.map((advantage, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <span className="text-2xl">{advantage.icon}</span>
                    <span className="text-sm font-medium">{advantage.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          {isInterestScreen ? (
            // Interest confirmation buttons
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleNotInterested}
                className="flex-1"
              >
                Nah, I'm good
              </Button>
              <Button
                onClick={handleInterested}
                className="flex-1"
              >
                I'm interested
              </Button>
            </div>
          ) : (
            // Normal navigation
            <>
              <div className="flex gap-1.5">
                {bettingScreens.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      idx === currentScreen
                        ? 'bg-primary'
                        : idx < currentScreen
                        ? 'bg-primary/50'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              <Button onClick={handleNext}>
                {isLastScreen ? (
                  'Finish'
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-5 w-5 ml-1" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
