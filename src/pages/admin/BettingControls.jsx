import { Lock } from 'lucide-react'
import BettingControlsModal from '@/components/admin/BettingControlsModal'
import { Button } from '@/components/ui/button'
import PageContainer from '@/components/layout/PageContainer'

export default function BettingControls() {
  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Betting Controls</h1>
        <p className="text-muted-foreground">
          Manage betting locks for upcoming events
        </p>
      </div>

      {/* Main Control */}
      <div className="border border-border rounded-lg p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">Lock Event Betting</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Lock betting for an event to prevent new bets and finalize all pending bets.
              This action is permanent and should be done approximately 15 minutes after the round starts.
            </p>

            <BettingControlsModal
              trigger={
                <Button>
                  <Lock className="h-4 w-4 mr-2" />
                  Manage Betting Locks
                </Button>
              }
            />
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2">When to Lock</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• ~15 min after round start time</li>
              <li>• Before scorecards are submitted</li>
              <li>• While players can still adjust picks</li>
            </ul>
          </div>

          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2">What Happens</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• All pending bets → locked status</li>
              <li>• No new bets can be placed</li>
              <li>• Bets resolve when round completes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <p className="text-sm text-yellow-600 font-semibold mb-1">
          ⚠️ Admin Access
        </p>
        <p className="text-sm text-muted-foreground">
          All authenticated users currently have access to betting controls. In production, implement proper admin role checks.
        </p>
      </div>
    </PageContainer>
  )
}
