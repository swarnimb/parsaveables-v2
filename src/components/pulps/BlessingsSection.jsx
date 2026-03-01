import { useState, useEffect } from 'react'
import { Target, Award } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

/**
 * BlessingsSection — predict the top 3 finishers during an open PULPy window.
 *
 * Rules:
 * - Window must be open
 * - One blessing per window
 * - Dropdown shows only players registered for the active event
 * - Your blessing is private until settlement
 */
export default function BlessingsSection({ playerId, pulpBalance, window, onBlessingPlaced }) {
  const { toast } = useToast()
  const [eventPlayers, setEventPlayers] = useState([])
  const [myBlessing, setMyBlessing] = useState(null)
  const [predictions, setPredictions] = useState({ first: '', second: '', third: '' })
  const [wagerAmount, setWagerAmount] = useState(20)
  const [loading, setLoading] = useState(false)
  const [activeEventId, setActiveEventId] = useState(null)

  const windowOpen = window?.status === 'open'

  // Fetch players registered for the active event
  useEffect(() => {
    async function fetchEventPlayers() {
      try {
        const { data: event } = await supabase
          .from('events')
          .select('id')
          .eq('is_active', true)
          .order('id')
          .limit(1)
          .maybeSingle()

        if (!event) return
        setActiveEventId(event.id)

        const { data, error } = await supabase
          .from('event_players')
          .select('registered_players!inner(id, player_name)')
          .eq('event_id', event.id)

        if (error) throw error
        setEventPlayers((data || []).map(ep => ep.registered_players))
      } catch (err) {
        console.error('Error fetching event players:', err)
      }
    }

    fetchEventPlayers()
  }, [])

  // Fetch player's blessing for the current window
  useEffect(() => {
    async function fetchMyBlessing() {
      if (!playerId || !window?.id) return

      try {
        const { data, error } = await supabase
          .from('blessings')
          .select('*')
          .eq('player_id', playerId)
          .eq('window_id', window.id)
          .maybeSingle()

        if (error) throw error
        setMyBlessing(data || null)
      } catch (err) {
        console.error('Error fetching blessing:', err)
      }
    }

    fetchMyBlessing()
  }, [playerId, window?.id])

  const handlePlace = async () => {
    const { first, second, third } = predictions

    if (!first || !second || !third) {
      toast({ variant: 'destructive', title: 'Incomplete', description: 'Select all 3 players' })
      return
    }

    if (new Set([first, second, third]).size !== 3) {
      toast({ variant: 'destructive', title: 'Duplicates', description: 'All 3 picks must be different' })
      return
    }

    if (wagerAmount < 20) {
      toast({ variant: 'destructive', title: 'Too low', description: 'Minimum wager is 20 PULPs' })
      return
    }

    if (wagerAmount > pulpBalance) {
      toast({ variant: 'destructive', title: 'Insufficient PULPs', description: `You only have ${pulpBalance} PULPs` })
      return
    }

    if (!window?.id || !activeEventId) {
      toast({ variant: 'destructive', title: 'Not ready', description: 'Window or event not available' })
      return
    }

    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/pulp/placeBlessing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          windowId: window.id,
          predictions,
          wagerAmount,
          eventId: activeEventId
        })
      })

      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to place blessing')

      setMyBlessing(result.blessing)
      onBlessingPlaced(wagerAmount)

      toast({
        title: 'Blessing Placed!',
        description: `${first} → ${second} → ${third} · ${wagerAmount} PULPs wagered`
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const playerOptions = (excluded = []) =>
    eventPlayers.filter(p => !excluded.includes(p.player_name))

  // Already placed a blessing this window
  if (myBlessing) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-blue-600">Your Blessing</h3>
            <Badge variant="outline" className="ml-auto text-xs">
              {myBlessing.status === 'pending' ? 'Awaiting settlement' : myBlessing.status}
            </Badge>
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">1st</span>
              <span className="font-medium">{myBlessing.prediction_first}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">2nd</span>
              <span className="font-medium">{myBlessing.prediction_second}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">3rd</span>
              <span className="font-medium">{myBlessing.prediction_third}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1 mt-2">
              <span className="text-muted-foreground">Offering</span>
              <span className="font-bold text-primary">{myBlessing.wager_amount} PULPs</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Your blessing is locked in. Resolves when the window settles.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 border border-border rounded-lg p-3">
        <h3 className="text-sm font-semibold mb-2">Blessing Rules</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
          <li>Perfect order → 2× offering</li>
          <li>Right 3, wrong order → offering returned</li>
          <li>Miss → offering lost</li>
          <li>Min: 20 PULPs · 1 per window</li>
        </ul>
      </div>

      {!windowOpen && (
        <div className="bg-muted/30 border border-dashed border-border rounded-lg p-4 text-center">
          <Target className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Blessings available during open windows only</p>
        </div>
      )}

      {windowOpen && (
        <>
          {/* 1st pick */}
          <div>
            <Label>1st Place Pick</Label>
            <Select
              value={predictions.first}
              onValueChange={v => setPredictions(p => ({ ...p, first: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>
                {playerOptions([predictions.second, predictions.third]).map(p => (
                  <SelectItem key={p.id} value={p.player_name}>{p.player_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2nd pick */}
          <div>
            <Label>2nd Place Pick</Label>
            <Select
              value={predictions.second}
              onValueChange={v => setPredictions(p => ({ ...p, second: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>
                {playerOptions([predictions.first, predictions.third]).map(p => (
                  <SelectItem key={p.id} value={p.player_name}>{p.player_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3rd pick */}
          <div>
            <Label>3rd Place Pick</Label>
            <Select
              value={predictions.third}
              onValueChange={v => setPredictions(p => ({ ...p, third: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
              <SelectContent>
                {playerOptions([predictions.first, predictions.second]).map(p => (
                  <SelectItem key={p.id} value={p.player_name}>{p.player_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Offering */}
          <div>
            <Label>Offering (PULPs · min 20)</Label>
            <Input
              type="number"
              min="20"
              max={pulpBalance}
              value={wagerAmount}
              onChange={e => setWagerAmount(Number(e.target.value) || 20)}
            />
          </div>

          <Button
            onClick={handlePlace}
            disabled={loading || !predictions.first || !predictions.second || !predictions.third}
            className="w-full"
          >
            <Target className="h-4 w-4 mr-2" />
            {loading ? 'Placing...' : `Give Blessing (${wagerAmount} PULPs)`}
          </Button>
        </>
      )}
    </div>
  )
}
