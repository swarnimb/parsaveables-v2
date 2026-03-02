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
import { pulpScreens } from './tutorialData'

/**
 * PULPy Tutorial Component
 * Auto-shown on first visit to the PULPs page — introduces the PULP economy.
 */
export default function BettingTutorial({ onClose }) {
  const [currentScreen, setCurrentScreen] = useState(0)

  const screen = pulpScreens[currentScreen]
  const isLastScreen = currentScreen === pulpScreens.length - 1
  const progress = ((currentScreen + 1) / pulpScreens.length) * 100

  const handleNext = () => {
    if (isLastScreen) {
      onClose?.()
    } else {
      setCurrentScreen(prev => prev + 1)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="mb-6">
          <DialogDescription className="text-sm text-muted-foreground">
            Screen {currentScreen + 1} of {pulpScreens.length}
          </DialogDescription>
          <DialogTitle className="sr-only">
            PULP Economy Tutorial — {screen.title}
          </DialogTitle>
        </DialogHeader>

        <Progress value={progress} className="mb-6" />

        <div className="py-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">{screen.emoji}</div>
            <h2 className="text-2xl font-bold">{screen.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{screen.content}</p>

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

        <div className="flex items-center justify-between pt-6 border-t border-border">
          <div className="flex gap-1.5">
            {pulpScreens.map((_, idx) => (
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
              'Let\'s Go!'
            ) : (
              <>
                Next
                <ChevronRight className="h-5 w-5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
