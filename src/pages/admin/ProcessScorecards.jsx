import { useState } from 'react'
import { FileText, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import PageContainer from '@/components/layout/PageContainer'

export default function ProcessScorecards() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleProcessScorecards = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch('/api/processScorecard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process scorecards')
      }

      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Process Scorecards</h1>
        <p className="text-muted-foreground">
          Manually trigger scorecard processing from email
        </p>
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold mb-2">How It Works</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                This triggers the scorecard processing workflow that normally runs automatically via email:
              </p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Fetches unread emails from Gmail</li>
                <li>Finds UDisc scorecard screenshots</li>
                <li>Extracts scores using Claude Vision API</li>
                <li>Updates round data in database</li>
                <li>Calculates points and updates leaderboard</li>
                <li>Awards PULPs for achievements and placements</li>
                <li>Resolves bets and challenges</li>
              </ol>
            </div>
          </div>
        </div>

        <Button
          onClick={handleProcessScorecards}
          disabled={loading}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Processing...' : 'Process Scorecards'}
        </Button>
      </Card>

      {/* Results */}
      {result && (
        <Card className="p-6 bg-green-500/10 border-green-500/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-600 mb-2">
                Scorecard processing completed successfully
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Emails processed: {result.emailsProcessed || 0}</p>
                <p>Scorecards extracted: {result.scorecardsExtracted || 0}</p>
                <p>Points updated: {result.pointsUpdated || 0}</p>
                <p>PULPs awarded: {result.pulpsAwarded || 0}</p>
                <p>Bets resolved: {result.betsResolved || 0}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="p-6 bg-destructive/10 border-destructive/20">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive mb-2">
                Error processing scorecards
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Info */}
      <div className="mt-6 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-sm text-blue-600 font-semibold mb-1">
          ℹ️ Note
        </p>
        <p className="text-sm text-muted-foreground">
          This is the same workflow that runs automatically when scorecards are emailed.
          Use this for manual processing or debugging.
        </p>
      </div>
    </PageContainer>
  )
}
