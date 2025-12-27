import { useState, useEffect } from 'react'
import { Trophy, Coins, TrendingUp, Award, Calendar, Target, Flame } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { eventAPI } from '@/services/api'
import { getCurrentEvent } from '@/utils/seasonUtils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('points')
  const [player, setPlayer] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('all') // 'all' or event ID
  const [playerStats, setPlayerStats] = useState(null)
  const [pulpBalance, setPulpBalance] = useState(null)
  const [pulpStats, setPulpStats] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch player data and events
  useEffect(() => {
    async function fetchPlayerData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        const { data: playerData, error } = await supabase
          .from('registered_players')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) throw error
        setPlayer(playerData)
        setPulpBalance(playerData.pulp_balance)

        // Fetch events and default to current season
        const eventsData = await eventAPI.getAllEvents()
        setEvents(eventsData)

        const currentEvent = getCurrentEvent(eventsData)
        if (currentEvent) {
          setSelectedEventId(currentEvent.id)
        }
      } catch (err) {
        console.error('Error fetching player:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerData()
  }, [])

  // Fetch player stats when event changes
  useEffect(() => {
    async function fetchPlayerStats() {
      if (!player || !selectedEventId) return

      try {
        // Check if selected event is a season
        let isSeason = false
        if (selectedEventId !== 'all') {
          const selectedEvent = events.find(e => e.id === selectedEventId)
          isSeason = selectedEvent?.type === 'season'
        }

        let query = supabase
          .from('player_rounds')
          .select('*')
          .eq('player_name', player.player_name)

        // Filter by event if not "all time"
        if (selectedEventId !== 'all') {
          query = query.eq('event_id', selectedEventId)
        }

        const { data: rounds, error } = await query

        if (error) throw error

        // Calculate total points based on event type
        let totalPoints = 0
        if (isSeason) {
          // For seasons: sum only top 10 scores
          const scores = rounds.map(r => Number(r.final_total) || 0).sort((a, b) => b - a)
          const top10Scores = scores.slice(0, 10)
          totalPoints = top10Scores.reduce((sum, score) => sum + score, 0)
        } else {
          // For "all time" or tournaments: sum all scores
          totalPoints = rounds.reduce((sum, r) => sum + (Number(r.final_total) || 0), 0)
        }

        // Calculate aggregated stats
        const stats = {
          roundsPlayed: rounds.length,
          totalPoints: totalPoints,
          wins: rounds.filter(r => r.rank === 1).length,
          podiums: rounds.filter(r => r.rank <= 3).length,
          birdies: rounds.reduce((sum, r) => sum + (r.birdies || 0), 0),
          eagles: rounds.reduce((sum, r) => sum + (r.eagles || 0), 0),
          aces: rounds.reduce((sum, r) => sum + (r.aces || 0), 0),
          avgPointsPerRound: rounds.length > 0
            ? totalPoints / rounds.length
            : 0,
          avgRankPerRound: rounds.length > 0
            ? rounds.reduce((sum, r) => sum + (r.rank || 0), 0) / rounds.length
            : 0,
          bestScore: rounds.length > 0
            ? Math.min(...rounds.map(r => r.total_score).filter(Boolean))
            : null,
          worstScore: rounds.length > 0
            ? Math.max(...rounds.map(r => r.total_score).filter(Boolean))
            : null,
          uniqueCourses: new Set(rounds.map(r => r.course_name).filter(Boolean)).size,
        }

        setPlayerStats(stats)
      } catch (err) {
        console.error('Error fetching player stats:', err)
      }
    }

    fetchPlayerStats()
  }, [player, selectedEventId, events])

  // Fetch PULP stats when PULPs tab is active
  useEffect(() => {
    async function fetchPulpStats() {
      if (activeTab !== 'pulps' || !player) return

      try {
        const { data: session } = await supabase.auth.getSession()
        const response = await fetch('/api/pulp/getBalance', {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`
          }
        })

        const result = await response.json()
        if (response.ok) {
          setPulpStats(result)
        }
      } catch (err) {
        console.error('Error fetching PULP stats:', err)
      }
    }

    fetchPulpStats()
  }, [activeTab, player])

  // Fetch transactions when PULPs tab is active
  useEffect(() => {
    async function fetchTransactions() {
      if (activeTab !== 'pulps' || !player) return

      try {
        const { data: session } = await supabase.auth.getSession()
        const response = await fetch('/api/pulp/getTransactions?limit=20', {
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`
          }
        })

        const result = await response.json()
        if (response.ok) {
          setTransactions(result.transactions)
        }
      } catch (err) {
        console.error('Error fetching transactions:', err)
      }
    }

    fetchTransactions()
  }, [activeTab, player])

  const getTransactionIcon = (type) => {
    const icons = {
      'achievement_unlock': '🏆',
      'round_placement': '📊',
      'bet_win': '💰',
      'bet_loss': '❌',
      'challenge_win': '⚔️',
      'challenge_loss': '💔',
      'challenge_reject': '🚫',
      'advantage_purchase': '🛒',
      'weekly_bonus': '🎁'
    }
    return icons[type] || '💵'
  }

  const getTransactionColor = (amount) => {
    if (amount > 0) return 'text-green-600'
    if (amount < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Dashboard</h1>
        <p className="text-base text-muted-foreground">
          Welcome back, {player?.player_name}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="points" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="pulps" className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            PULPs
          </TabsTrigger>
        </TabsList>

        {/* Stats Tab */}
        <TabsContent value="points" className="space-y-6">
          {/* Event Selector */}
          {events.length > 0 && (
            <div className="flex items-center gap-3">
              <label htmlFor="event-select" className="text-sm font-medium whitespace-nowrap">
                Event:
              </label>
              <select
                id="event-select"
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm min-w-[200px]"
              >
                <option value="all">All Time</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Main Stats Grid */}
          {playerStats && (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Points</p>
                      <p className="text-2xl font-bold">{playerStats.totalPoints.toFixed(1)}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Rounds Played</p>
                      <p className="text-2xl font-bold">{playerStats.roundsPlayed}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Wins</p>
                      <p className="text-2xl font-bold">{playerStats.wins}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Podiums</p>
                      <p className="text-2xl font-bold">{playerStats.podiums}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Performance Stats */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Performance</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Avg Points/Round</p>
                    <p className="text-xl font-bold">{playerStats.avgPointsPerRound.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Avg Rank/Round</p>
                    <p className="text-xl font-bold">#{playerStats.avgRankPerRound.toFixed(1)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                    <p className="text-xl font-bold">
                      {playerStats.roundsPlayed > 0
                        ? ((playerStats.wins / playerStats.roundsPlayed) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </Card>

              {/* Scoring Stats */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Scoring
                </h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Birdies</p>
                    <p className="text-xl font-bold text-blue-600">{playerStats.birdies}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Eagles</p>
                    <p className="text-xl font-bold text-purple-600">{playerStats.eagles}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Aces</p>
                    <p className="text-xl font-bold text-yellow-600">{playerStats.aces}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Courses Played</p>
                    <p className="text-xl font-bold">{playerStats.uniqueCourses}</p>
                  </div>
                </div>
              </Card>

              {/* Best/Worst Scores */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Score Range</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Best Round</p>
                    <p className="text-2xl font-bold text-green-600">
                      {playerStats.bestScore !== null ? playerStats.bestScore : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Worst Round</p>
                    <p className="text-2xl font-bold text-red-600">
                      {playerStats.worstScore !== null ? playerStats.worstScore : '—'}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {!playerStats && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No stats available for this event</p>
            </Card>
          )}
        </TabsContent>

        {/* PULPs Tab */}
        <TabsContent value="pulps" className="space-y-6">
          {/* PULP Balance Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Coins className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Your PULP Balance</p>
                  <p className="text-4xl font-bold">{pulpBalance?.toLocaleString() || '0'}</p>
                </div>
              </div>
              <a
                href="/betting"
                className="text-primary hover:underline text-sm"
              >
                Go to Betting →
              </a>
            </div>
          </Card>

          {/* Earnings Breakdown */}
          {pulpStats && (
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Earned</p>
                <p className="text-2xl font-bold text-green-600">
                  +{pulpStats.totalEarned?.toLocaleString() || 0}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">
                  -{pulpStats.totalSpent?.toLocaleString() || 0}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Active Bets</p>
                <p className="text-2xl font-bold">{pulpStats.activeBets || 0}</p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Active Challenges</p>
                <p className="text-2xl font-bold">{pulpStats.activeChallenges || 0}</p>
              </Card>
            </div>
          )}

          {/* Transaction History */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Transaction History</h3>
            {transactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No transactions yet. Start betting to earn PULPs!
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTransactionIcon(txn.transaction_type)}</span>
                      <div>
                        <p className="font-medium">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${getTransactionColor(txn.amount)}`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount} PULPs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Balance: {txn.balance_after}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
