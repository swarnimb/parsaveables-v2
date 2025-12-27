import { useState, useEffect } from 'react'
import { Trophy, Lock } from 'lucide-react'
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

export default function PredictionsSection({ playerId, pulpBalance, onBetPlaced }) {
  const [rounds, setRounds] = useState([])
  const [selectedRound, setSelectedRound] = useState(null)
  const [players, setPlayers] = useState([])
  const [predictions, setPredictions] = useState({ first: '', second: '', third: '' })
  const [wagerAmount, setWagerAmount] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fetch active event (for next round betting)
  useEffect(() => {
    async function fetchActiveEvent() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, betting_lock_time')
          .eq('active', true)
          .single()

        if (error) throw error
        setSelectedRound({ events: data }) // Store event in selectedRound for compatibility
      } catch (err) {
        console.error('Error fetching active event:', err)
      }
    }

    fetchActiveEvent()
  }, [])

  // Fetch registered players when round selected
  useEffect(() => {
    async function fetchPlayers() {
      if (!selectedRound) return

      try {
        const { data, error } = await supabase
          .from('registered_players')
          .select('id, player_name')
          .order('player_name')

        if (error) throw error
        setPlayers(data || [])
      } catch (err) {
        console.error('Error fetching players:', err)
      }
    }

    fetchPlayers()
  }, [selectedRound])

  const handlePlaceBet = async () => {
    setError(null)
    setSuccess(null)

    // Validation
    if (!predictions.first || !predictions.second || !predictions.third) {
      setError('Please select all 3 predictions')
      return
    }

    if (predictions.first === predictions.second ||
        predictions.first === predictions.third ||
        predictions.second === predictions.third) {
      setError('Predictions must be different players')
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
      // Call API to place bet (roundId will be null, bet applies to next round)
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch('/api/pulp/placeBet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          roundId: null, // Next round (determined when scorecard processed)
          eventId: selectedRound?.events?.id,
          predictions,
          wagerAmount
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to place bet')
      }

      setSuccess(`Bet placed successfully! ${wagerAmount} PULPs wagered on next round.`)
      setPredictions({ first: '', second: '', third: '' })
      setWagerAmount(20)
      onBetPlaced()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isBettingLocked = selectedRound?.events?.betting_lock_time &&
    new Date(selectedRound.events.betting_lock_time) < new Date()

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <h3 className="font-semibold mb-2">How to Play</h3>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Perfect match (all 3 in order) = 2x payout</li>
          <li>Partial match (right 3, wrong order) = 1x payout</li>
          <li>No match = lose wager</li>
          <li>Minimum wager: 20 PULPs</li>
        </ul>
      </div>

      {/* Next Round Info */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <p className="font-semibold mb-1">Betting on: Next Round</p>
        <p className="text-sm text-muted-foreground">
          Your predictions will apply to the next round that gets played and processed.
        </p>
        {isBettingLocked && (
          <p className="text-sm text-destructive mt-2 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Betting is currently locked
          </p>
        )}
      </div>

      {/* Predictions */}
      {!isBettingLocked && (
        <div className="space-y-4">
          <div>
            <Label>1st Place</Label>
            <Select value={predictions.first} onValueChange={(v) => setPredictions(p => ({ ...p, first: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.player_name}>{player.player_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>2nd Place</Label>
            <Select value={predictions.second} onValueChange={(v) => setPredictions(p => ({ ...p, second: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.player_name}>{player.player_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>3rd Place</Label>
            <Select value={predictions.third} onValueChange={(v) => setPredictions(p => ({ ...p, third: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                {players.map(player => (
                  <SelectItem key={player.id} value={player.player_name}>{player.player_name}</SelectItem>
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
            onClick={handlePlaceBet}
            disabled={loading}
            className="w-full"
          >
            <Trophy className="h-4 w-4 mr-2" />
            {loading ? 'Placing Bet...' : `Place Bet (${wagerAmount} PULPs)`}
          </Button>
        </div>
      )}

      {isBettingLocked && (
        <div className="text-center text-muted-foreground py-8">
          Betting is currently locked. Check back after the current round is processed.
        </div>
      )}
    </div>
  )
}
