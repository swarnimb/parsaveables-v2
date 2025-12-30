import { useState, useEffect } from 'react'
import { Swords, Check, X } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ChallengesSection({ playerId, pulpBalance, onChallengeAction }) {
  const [players, setPlayers] = useState([])
  const [pendingChallenges, setPendingChallenges] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [wagerAmount, setWagerAmount] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fetch players - only higher ranked
  useEffect(() => {
    async function fetchPlayers() {
      try {
        // Get current player's name
        const { data: currentPlayer } = await supabase
          .from('registered_players')
          .select('player_name')
          .eq('id', playerId)
          .single()

        if (!currentPlayer) return

        // Get active season event
        const { data: activeEvent } = await supabase
          .from('events')
          .select('id')
          .eq('active', true)
          .eq('type', 'season')
          .single()

        if (!activeEvent) {
          // No active season, show all players
          const { data, error } = await supabase
            .from('registered_players')
            .select('id, player_name')
            .neq('id', playerId)
            .order('player_name')

          if (error) throw error
          setPlayers(data || [])
          return
        }

        // Get leaderboard for current season
        const { data: leaderboard, error: leaderboardError } = await supabase
          .from('player_rounds')
          .select('player_name, final_total')
          .eq('event_id', activeEvent.id)

        if (leaderboardError) throw leaderboardError

        // Calculate total points and rank for each player
        const playerScores = {}
        leaderboard.forEach(round => {
          if (!playerScores[round.player_name]) {
            playerScores[round.player_name] = []
          }
          playerScores[round.player_name].push(Number(round.final_total) || 0)
        })

        const rankings = Object.entries(playerScores).map(([name, scores]) => {
          const top10 = scores.sort((a, b) => b - a).slice(0, 10)
          const totalPoints = top10.reduce((sum, score) => sum + score, 0)
          return { player_name: name, totalPoints }
        })

        // Sort by points descending (higher points = better rank)
        rankings.sort((a, b) => b.totalPoints - a.totalPoints)

        // Find current player's rank
        const currentPlayerRank = rankings.findIndex(p => p.player_name === currentPlayer.player_name)

        // Get players ranked higher (lower index = better rank)
        const higherRankedPlayers = rankings
          .slice(0, currentPlayerRank)
          .map(p => p.player_name)

        // Fetch player IDs for higher ranked players
        const { data: playerData, error } = await supabase
          .from('registered_players')
          .select('id, player_name')
          .in('player_name', higherRankedPlayers)
          .order('player_name')

        if (error) throw error
        setPlayers(playerData || [])
      } catch (err) {
        console.error('Error fetching players:', err)
      }
    }

    if (playerId) fetchPlayers()
  }, [playerId])

  // Fetch pending challenges (where I'm challenged)
  useEffect(() => {
    async function fetchPendingChallenges() {
      if (!playerId) return

      try {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:registered_players!challenges_challenger_id_fkey(player_name),
            round:rounds(date, course_name)
          `)
          .eq('challenged_id', playerId)
          .eq('status', 'pending')
          .order('issued_at', { ascending: false })

        if (error) throw error
        setPendingChallenges(data || [])
      } catch (err) {
        console.error('Error fetching challenges:', err)
      }
    }

    fetchPendingChallenges()
  }, [playerId])

  const handleIssueChallenge = async () => {
    setError(null)
    setSuccess(null)

    if (!selectedPlayer) {
      setError('Please select an opponent')
      return
    }

    if (wagerAmount < 20) {
      setError('Minimum wager is 20 PULPs')
      return
    }

    if (wagerAmount > pulpBalance) {
      setError('Insufficient PULPs')
      return
    }

    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch('/api/pulp/issueChallenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          challengedId: parseInt(selectedPlayer),
          roundId: null, // Next round (determined when scorecard processed)
          wagerAmount
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to issue challenge')
      }

      setSuccess(`Challenge issued! ${wagerAmount} PULPs wagered on next round.`)
      setSelectedPlayer('')
      setWagerAmount(20)
      onChallengeAction()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRespondToChallenge = async (challengeId, accept) => {
    setLoading(true)
    setError(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch('/api/pulp/respondToChallenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          challengeId,
          accept
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to respond')
      }

      setSuccess(accept ? 'Challenge accepted!' : 'Challenge rejected')
      // Refresh pending challenges
      setPendingChallenges(prev => prev.filter(c => c.id !== challengeId))
      onChallengeAction()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tabs defaultValue="issue" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="issue">Issue Challenge</TabsTrigger>
        <TabsTrigger value="respond">
          Pending ({pendingChallenges.length})
        </TabsTrigger>
      </TabsList>

      {/* Issue Challenge Tab */}
      <TabsContent value="issue" className="space-y-6 mt-4">
        <div className="bg-muted/50 border border-border rounded-lg p-3">
          <h3 className="text-sm font-semibold mb-2">Challenge Rules</h3>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Lowest score wins 2x</li>
            <li>Reject = 50% tax</li>
            <li>Tie = refund</li>
            <li>Min: 20 PULPs</li>
          </ul>
        </div>

        {/* Next Round Info */}
        <div className="bg-muted/50 border border-border rounded-lg p-3">
          <p className="text-xs font-semibold mb-1">Challenging for: Next Round</p>
          <p className="text-xs text-muted-foreground">
            Challenge applies to next round both players join.
          </p>
        </div>

        <div>
          <Label>Challenge Opponent</Label>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger>
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              {players.map(player => (
                <SelectItem key={player.id} value={player.id.toString()}>
                  {player.player_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Wager Amount (PULPs)</Label>
          <Input
            type="number"
            min="20"
            value={wagerAmount}
            onChange={(e) => setWagerAmount(parseInt(e.target.value) || 20)}
          />
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 text-green-600 rounded-lg p-3 text-sm">
            {success}
          </div>
        )}

        <Button
          onClick={handleIssueChallenge}
          disabled={loading}
          className="w-full"
        >
          <Swords className="h-4 w-4 mr-2" />
          {loading ? 'Issuing...' : `Issue Challenge (${wagerAmount} PULPs)`}
        </Button>
      </TabsContent>

      {/* Respond to Challenges Tab */}
      <TabsContent value="respond" className="mt-4">
        {pendingChallenges.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No pending challenges
          </div>
        ) : (
          <div className="space-y-3">
            {pendingChallenges.map(challenge => (
              <div
                key={challenge.id}
                className="border border-border rounded-lg p-4 space-y-3"
              >
                <div>
                  <p className="font-semibold">
                    {challenge.challenger.player_name} challenges you!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {challenge.round.date} - {challenge.round.course_name}
                  </p>
                  <p className="text-sm font-bold text-primary mt-1">
                    Wager: {challenge.wager_amount} PULPs
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleRespondToChallenge(challenge.id, true)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRespondToChallenge(challenge.id, false)}
                    disabled={loading}
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject (Pay {Math.floor(challenge.wager_amount * 0.5)})
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
