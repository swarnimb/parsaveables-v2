import { useNavigate } from 'react-router-dom'
import { Rocket, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageContainer from '@/components/layout/PageContainer'

/**
 * ComingSoon Component
 * Shown when users who confirmed interest try to access /betting
 * Blocks access until feature is enabled
 */
export default function ComingSoon() {
  const navigate = useNavigate()

  return (
    <PageContainer className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="flex flex-col items-center justify-center text-center space-y-8">
        {/* Icon */}
        <div className="relative">
          <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center">
            <Rocket className="h-16 w-16 text-primary" />
          </div>
          {/* Animated ring */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        </div>

        {/* Title */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold">Coming Soon!</h1>
          <p className="text-xl text-muted-foreground">
            The PULP Economy is on its way
          </p>
        </div>

        {/* Description */}
        <div className="space-y-4 max-w-md">
          <p className="text-muted-foreground leading-relaxed">
            Thanks for showing interest! We're building the betting system and it'll be ready shortly.
          </p>
          <p className="text-sm text-muted-foreground">
            You'll be notified when it launches. In the meantime, keep playing rounds and climbing the leaderboard!
          </p>
        </div>

        {/* Back Button */}
        <Button
          onClick={() => navigate('/leaderboard')}
          size="lg"
          className="mt-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Leaderboard
        </Button>
      </div>
    </PageContainer>
  )
}
