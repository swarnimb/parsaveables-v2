import { useState, useEffect } from 'react'
import { Swords, Check, X, Clock } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

/**
 * ChallengesSection — issue and respond to challenges during a PULPy window.
 *
 * Rules:
 * - Window must be open for new challenges / responses
 * - One challenge issued per window per challenger
 * - Can only challenge higher-ranked players (season leaderboard)
 * - A player can receive multiple challenges (extras go to waitlist)
 */
export default function ChallengesSection({ playerId, pulpBalance, window, onChallengeAction }) {
  const { toast } = useToast()
  const [higherRankedPlayers, setHigherRankedPlayers] = useState([])
  const [myChallenge, setMyChallenge] = useState(null)           // challenge I issued this window
  const [pendingChallenges, setPendingChallenges] = useState([]) // challenges where I'm challenged
  const [activeChallenges, setActiveChallenges] = useState([])   // accepted challenges I'm in
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [wagerAmount, setWagerAmount] = useState(20)
  const [loading, setLoading] = useState(false)

  const windowOpen = window?.status === 'open'
  const windowId = window?.id

  // Fetch higher-ranked players (season leaderboard)
  useEffect(() => {
    async function fetchHigherRanked() {
      if (!playerId) return

      try {
        const currentYear = new Date().getFullYear()

        const { data: event } = await supabase
          .from('events')
          .select('id')
          .eq('type', 'season')
          .ilike('name', `%${currentYear}%`)
          .maybeSingle()

        if (!event) {
          setHigherRankedPlayers([])
          return
        }

        const { data: rounds, error } = await supabase
          .from('player_rounds')
          .select('player_id, final_total')
          .eq('event_id', event.id)

        if (error) throw error

        // Aggregate points
        const totals = {}
        for (const row of rounds || []) {
          totals[row.player_id] = (totals[row.player_id] || 0) + (row.final_total || 0)
        }

        const ranked = Object.entries(totals)
          .map(([id, total]) => ({ id: Number(id), total }))
          .sort((a, b) => b.total - a.total)

        const myIdx = ranked.findIndex(p => p.id === playerId)
        if (myIdx <= 0) {
          setHigherRankedPlayers([])
          return
        }

        const higherIds = ranked.slice(0, myIdx).map(p => p.id)

        const { data: players, error: playersError } = await supabase
          .from('registered_players')
          .select('id, player_name')
          .in('id', higherIds)
          .order('player_name')

        if (playersError) throw playersError
        setHigherRankedPlayers(players || [])
      } catch (err) {
        console.error('Error fetching higher-ranked players:', err)
      }
    }

    fetchHigherRanked()
  }, [playerId])

  // Fetch my issued challenge for the current window
  useEffect(() => {
    async function fetchMyChallenge() {
      if (!playerId || !windowId) return

      try {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenged:registered_players!challenges_challenged_id_fkey(player_name)
          `)
          .eq('challenger_id', playerId)
          .eq('window_id', windowId)
          .not('status', 'eq', 'cancelled_waitlist')
          .maybeSingle()

        if (error) throw error
        setMyChallenge(data || null)
      } catch (err) {
        console.error('Error fetching my challenge:', err)
      }
    }

    fetchMyChallenge()
  }, [playerId, windowId])

  // Fetch pending challenges (where I'm being challenged)
  useEffect(() => {
    async function fetchPending() {
      if (!playerId || !windowId) return

      try {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:registered_players!challenges_challenger_id_fkey(player_name)
          `)
          .eq('challenged_id', playerId)
          .eq('window_id', windowId)
          .eq('status', 'pending')

        if (error) throw error
        setPendingChallenges(data || [])
      } catch (err) {
        console.error('Error fetching pending challenges:', err)
      }
    }

    fetchPending()
  }, [playerId, windowId])

  // Fetch active (accepted) challenges I'm in — from any window, still pending settlement
  useEffect(() => {
    async function fetchActive() {
      if (!playerId) return

      try {
        const { data, error } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:registered_players!challenges_challenger_id_fkey(player_name),
            challenged:registered_players!challenges_challenged_id_fkey(player_name)
          `)
          .or(`challenger_id.eq.${playerId},challenged_id.eq.${playerId}`)
          .eq('status', 'accepted')
          .is('round_id', null)
          .order('issued_at', { ascending: false })

        if (error) throw error
        setActiveChallenges(data || [])
      } catch (err) {
        console.error('Error fetching active challenges:', err)
      }
    }

    fetchActive()
  }, [playerId])

  const handleIssue = async () => {
    if (!selectedPlayer) {
      toast({ variant: 'destructive', title: 'No opponent', description: 'Select an opponent' })
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

    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/pulp/issueChallenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ challengedId: Number(selectedPlayer), windowId, wagerAmount })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to issue challenge')

      setMyChallenge(result.challenge)
      onChallengeAction()

      const name = higherRankedPlayers.find(p => p.id === Number(selectedPlayer))?.player_name
      const isWaitlisted = result.challenge.status === 'waiting'

      toast({
        title: isWaitlisted ? 'On Waitlist' : 'Challenge Issued!',
        description: isWaitlisted
          ? `${name} already has a pending challenge. You're on the waitlist — no PULPs deducted yet.`
          : `${wagerAmount} PULPs offered against ${name}`
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleRespond = async (challengeId, accept) => {
    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/pulp/respondToChallenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ challengeId, accept })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to respond')

      setPendingChallenges(prev => prev.filter(c => c.id !== challengeId))

      toast({
        title: accept ? 'Challenge Accepted!' : 'Challenge Declined',
        description: accept
          ? 'Good luck in your head-to-head battle!'
          : '50% cowardice tax deducted'
      })

      onChallengeAction()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tabs defaultValue={activeChallenges.length > 0 ? 'active' : 'issue'} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="issue">Issue</TabsTrigger>
        <TabsTrigger value="respond">
          Pending {pendingChallenges.length > 0 && `(${pendingChallenges.length})`}
        </TabsTrigger>
        <TabsTrigger value="active">
          Active {activeChallenges.length > 0 && `(${activeChallenges.length})`}
        </TabsTrigger>
      </TabsList>

      {/* Issue Tab */}
      <TabsContent value="issue" className="space-y-4 mt-4">
        {!windowOpen && (
          <div className="bg-muted/30 border border-dashed border-border rounded-lg p-4 text-center">
            <Swords className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Challenges can only be issued during open windows</p>
          </div>
        )}

        {windowOpen && myChallenge && (
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Challenge Issued</p>
              <Badge variant="outline" className="text-xs">
                {myChallenge.status === 'waiting' ? 'Waitlisted' : 'Sent'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              vs {myChallenge.challenged?.player_name} · {myChallenge.wager_amount} PULPs
            </p>
            {myChallenge.status === 'waiting' && (
              <p className="text-xs text-muted-foreground">
                They have a pending challenge already. Your challenge will activate when theirs resolves.
                No PULPs deducted yet.
              </p>
            )}
          </div>
        )}

        {windowOpen && !myChallenge && (
          <>
            <div className="bg-muted/50 border border-border rounded-lg p-3">
              <h3 className="text-sm font-semibold mb-2">Challenge Rules</h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Only challenge higher-ranked players</li>
                <li>Lower score wins 2× total offering</li>
                <li>Decline = 50% cowardice tax on decliner</li>
                <li>One challenge per window</li>
              </ul>
            </div>

            {higherRankedPlayers.length === 0 ? (
              <div className="text-center text-muted-foreground py-4 text-sm">
                You're ranked highest — no one to challenge yet!
              </div>
            ) : (
              <>
                <div>
                  <Label>Opponent (higher-ranked)</Label>
                  <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                    <SelectTrigger><SelectValue placeholder="Select opponent" /></SelectTrigger>
                    <SelectContent>
                      {higherRankedPlayers.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.player_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

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

                <Button onClick={handleIssue} disabled={loading} className="w-full">
                  <Swords className="h-4 w-4 mr-2" />
                  {loading ? 'Issuing...' : `Issue Challenge (${wagerAmount} PULPs)`}
                </Button>
              </>
            )}
          </>
        )}
      </TabsContent>

      {/* Respond Tab */}
      <TabsContent value="respond" className="mt-4">
        {!windowOpen && pendingChallenges.length === 0 && (
          <div className="text-center text-muted-foreground py-8 text-sm">No pending challenges</div>
        )}

        {pendingChallenges.length === 0 && windowOpen && (
          <div className="text-center text-muted-foreground py-8 text-sm">No one has challenged you this window</div>
        )}

        {pendingChallenges.map(c => (
          <div key={c.id} className="border border-border rounded-lg p-4 space-y-3">
            <div>
              <p className="font-semibold">{c.challenger?.player_name} challenges you!</p>
              <p className="text-sm font-bold text-primary mt-1">Offering: {c.wager_amount} PULPs</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default" size="sm"
                onClick={() => handleRespond(c.id, true)}
                disabled={loading || !windowOpen}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button
                variant="destructive" size="sm"
                onClick={() => handleRespond(c.id, false)}
                disabled={loading || !windowOpen}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" /> Decline (−{Math.floor(c.wager_amount * 0.5)})
              </Button>
            </div>
            {!windowOpen && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Window closed — cannot respond
              </p>
            )}
          </div>
        ))}
      </TabsContent>

      {/* Active Tab */}
      <TabsContent value="active" className="mt-4">
        {activeChallenges.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">No active challenges</div>
        ) : (
          <div className="space-y-3">
            {activeChallenges.map(c => {
              const isChallenger = c.challenger_id === playerId
              const opponentName = isChallenger ? c.challenged?.player_name : c.challenger?.player_name
              return (
                <div key={c.id} className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">Active Challenge</p>
                    <Swords className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Opponent</span>
                      <span className="font-medium">{opponentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Offering</span>
                      <span className="font-bold text-primary">{c.wager_amount} PULPs</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pot</span>
                      <span className="font-bold">{c.wager_amount * 2} PULPs</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Resolves when matched scorecard is processed. Lower score wins all.
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
