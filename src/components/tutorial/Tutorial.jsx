import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { onboardingScreens } from './tutorialData'
import { tutorialAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import AnimatedFlow from './AnimatedFlow'

/**
 * OnboardingTutorial Component
 * Mandatory full-screen tutorial shown on first login after signup
 * No skip button - must complete all 7 screens
 */
export default function OnboardingTutorial({ onComplete }) {
  const [currentScreen, setCurrentScreen] = useState(0)
  const { player } = useAuth()

  const screen = onboardingScreens[currentScreen]
  const isLastScreen = currentScreen === onboardingScreens.length - 1
  const progress = ((currentScreen + 1) / onboardingScreens.length) * 100

  const handleNext = async () => {
    if (isLastScreen) {
      // Mark onboarding as completed in database
      try {
        if (player?.id) {
          await tutorialAPI.completeOnboarding(player.id)
        }
        onComplete?.()
      } catch (error) {
        console.error('Error completing onboarding:', error)
        // Still allow user to proceed even if API fails
        onComplete?.()
      }
    } else {
      setCurrentScreen(prev => prev + 1)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className="w-screen h-screen max-w-full max-h-full m-0 p-0 rounded-none"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full p-6 sm:p-8 md:p-12">
          <DialogHeader className="mb-6">
            <DialogDescription className="text-sm text-muted-foreground">
              Screen {currentScreen + 1} of {onboardingScreens.length}
            </DialogDescription>
            <DialogTitle className="sr-only">
              Onboarding Tutorial - {screen.title}
            </DialogTitle>
          </DialogHeader>

          {/* Progress Bar */}
          <Progress value={progress} className="mb-8" />

          {/* Screen Content */}
          <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
            <div className="text-center space-y-6">
              {/* Emoji */}
              <div className="text-8xl sm:text-9xl">{screen.emoji}</div>

              {/* Title */}
              <h2 className="text-3xl sm:text-4xl font-bold">{screen.title}</h2>

              {/* Content */}
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-xl">
                {screen.content}
              </p>

              {/* Animated Flow (if applicable) */}
              {screen.showAnimation && (
                <div className="mt-8">
                  <AnimatedFlow />
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
            <div className="flex gap-1.5">
              {onboardingScreens.map((_, idx) => (
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

            <Button onClick={handleNext} size="lg">
              {isLastScreen ? (
                'Get Started'
              ) : (
                <>
                  Next
                  <ChevronRight className="h-5 w-5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
