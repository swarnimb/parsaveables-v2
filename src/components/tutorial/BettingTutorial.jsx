import { useState } from 'react'
import { ChevronRight, Check } from 'lucide-react'
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
 * Shown when user tries to access /betting for the first time
 * Includes interest confirmation before blocking access
 */
export default function BettingTutorial({ onClose }) {
  const [currentScreen, setCurrentScreen] = useState(0)
  const [showThankYou, setShowThankYou] = useState(false)
  const { player } = useAuth()

  const screen = bettingScreens[currentScreen]
  const isInterestScreen = screen.isInterestScreen
  const isLastScreen = currentScreen === bettingScreens.length - 1
  const progress = ((currentScreen + 1) / bettingScreens.length) * 100

  const handleNext = () => {
    if (isLastScreen || isInterestScreen) {
      // On interest screen, do nothing - wait for user to choose
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

    // Show thank you message
    setShowThankYou(true)

    // Close after 3 seconds
    setTimeout(() => {
      onClose?.()
    }, 3000)
  }

  const handleNotNow = async () => {
    // Just close without confirming interest
    // betting_interest_shown is already set when dialog opened
    onClose?.()
  }

  // Thank you screen
  if (showThankYou) {
    return (
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Thank You!</h3>
              <p className="text-muted-foreground">
                Thank you for showing interest, your ParSaveables betting economy is coming soon.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

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
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          {isInterestScreen ? (
            // Interest confirmation buttons
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleNotNow}
                className="flex-1"
              >
                Not Now
              </Button>
              <Button
                onClick={handleInterested}
                className="flex-1"
              >
                I'm Interested
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
