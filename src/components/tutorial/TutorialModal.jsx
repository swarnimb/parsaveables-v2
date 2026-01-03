import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

/**
 * TutorialModal Component
 * Used for manual tutorials triggered by buttons (e.g., in About page)
 * Supports skip, back/forward navigation, and close
 * Works with new array-based tutorial structure
 */
export default function TutorialModal({ title, screens, trigger, onComplete }) {
  const [open, setOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const screen = screens[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === screens.length - 1
  const progress = ((currentStep + 1) / screens.length) * 100

  const handleNext = () => {
    if (isLastStep) {
      setOpen(false)
      setCurrentStep(0)
      onComplete?.()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setCurrentStep(0)
  }

  const handleSkip = () => {
    setOpen(false)
    setCurrentStep(0)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip Tutorial
              </button>
              <button
                onClick={handleClose}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <DialogDescription>
            Screen {currentStep + 1} of {screens.length}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <Progress value={progress} className="mb-4" />

        {/* Screen Content */}
        <div className="py-6 px-2">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{screen.emoji}</div>
            <h3 className="text-xl font-bold mb-3">{screen.title}</h3>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
              {screen.content}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex gap-1">
            {screens.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-2 rounded-full transition-colors ${
                  idx === currentStep
                    ? 'bg-primary'
                    : idx < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          <Button onClick={handleNext}>
            {isLastStep ? (
              'Finish'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
