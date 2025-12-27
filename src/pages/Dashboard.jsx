import { useState, useEffect } from 'react'
import { Trophy, Coins, TrendingUp, Award, Calendar, Target, Flame, Swords, TrendingDown, ShoppingCart, Gift, DollarSign, XCircle, Ban, Sparkles } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { eventAPI } from '@/services/api'
import { getCurrentEvent } from '@/utils/seasonUtils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageContainer from '@/components/layout/PageContainer'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, cardHover, scaleIn } from '@/utils/animations'
import { SkeletonStats, SkeletonCard } from '@/components/ui/skeleton'
import Confetti, { useConfetti, confettiPresets } from '@/components/shared/Confetti'
import CelebrationModal from '@/components/shared/CelebrationModal'

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
  const { confetti, trigger: triggerConfetti } = useConfetti()
  const [celebration, setCelebration] = useState(null)

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
    const iconMap = {
      'achievement_unlock': <Trophy className="h-5 w-5 text-yellow-600" />,
      'round_placement': <TrendingUp className="h-5 w-5 text-blue-600" />,
      'bet_win': <Coins className="h-5 w-5 text-green-600" />,
      'bet_win_perfect': <Award className="h-5 w-5 text-green-600" />,
      'bet_loss': <XCircle className="h-5 w-5 text-red-600" />,
      'challenge_win': <Swords className="h-5 w-5 text-green-600" />,
      'challenge_loss': <TrendingDown className="h-5 w-5 text-red-600" />,
      'challenge_reject': <Ban className="h-5 w-5 text-orange-600" />,
      'challenge_rejected_penalty': <Ban className="h-5 w-5 text-orange-600" />,
      'advantage_purchase': <ShoppingCart className="h-5 w-5 text-purple-600" />,
      'weekly_bonus': <Gift className="h-5 w-5 text-blue-600" />
    }
    return iconMap[type] || <DollarSign className="h-5 w-5 text-muted-foreground" />
  }

  const getTransactionColor = (amount) => {
    if (amount > 0) return 'text-green-600'
    if (amount < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  if (loading) {
    return (
      <PageContainer className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Dashboard</h1>
        </div>
        <SkeletonStats />
        <div className="mt-6 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
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
              <motion.div
                className="grid md:grid-cols-4 gap-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div variants={staggerItem} whileHover={cardHover.hover}>
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
                </motion.div>

                <motion.div variants={staggerItem} whileHover={cardHover.hover}>
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
                </motion.div>

                <motion.div variants={staggerItem} whileHover={cardHover.hover}>
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
                </motion.div>

                <motion.div variants={staggerItem} whileHover={cardHover.hover}>
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
                </motion.div>
              </motion.div>

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
          {/* Premium PULP Balance Card */}
          <motion.div
            variants={scaleIn}
            initial="initial"
            animate="animate"
            className="relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50"></div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center relative"
                >
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-md"></div>
                  <Coins className="h-8 w-8 text-primary relative z-10" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">Your PULP Balance</p>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 10 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        triggerConfetti('win', { x: 0.3, y: 0.3 })
                        setCelebration({
                          title: 'You\'re Doing Great!',
                          description: `You've earned ${pulpBalance?.toLocaleString() || '0'} PULPs total! Keep playing rounds, placing bets, and unlocking achievements to earn more!`,
                          icon: <Sparkles className="h-12 w-12" />,
                          accentColor: 'purple',
                          confettiPreset: 'achievement',
                          reward: null
                        })
                      }}
                      className="h-6 w-6 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center transition-colors"
                    >
                      <Sparkles className="h-4 w-4 text-yellow-600" />
                    </motion.button>
                  </div>
                  <motion.p
                    key={pulpBalance}
                    initial={{ scale: 1.1, color: '#10b981' }}
                    animate={{ scale: 1, color: 'inherit' }}
                    transition={{ duration: 0.3 }}
                    className="text-4xl font-bold tracking-tight"
                  >
                    {pulpBalance?.toLocaleString() || '0'}
                    <span className="text-lg font-semibold text-muted-foreground ml-2">PULPs</span>
                  </motion.p>
                </div>
              </div>
              <a
                href="/betting"
                className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Go to Betting →
              </a>
            </div>
          </motion.div>

          {/* Earnings Breakdown */}
          {pulpStats && (
            <motion.div
              className="grid md:grid-cols-4 gap-4"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div variants={staggerItem}>
                <Card className="p-4 border-green-500/20 bg-gradient-to-br from-green-500/5 to-background">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Earned</p>
                  <p className="text-3xl font-bold text-green-600">
                    +{pulpStats.totalEarned?.toLocaleString() || 0}
                  </p>
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="p-4 border-red-500/20 bg-gradient-to-br from-red-500/5 to-background">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Total Spent</p>
                  <p className="text-3xl font-bold text-red-600">
                    -{pulpStats.totalSpent?.toLocaleString() || 0}
                  </p>
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="p-4 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-background">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Active Bets</p>
                  <p className="text-3xl font-bold text-blue-600">{pulpStats.activeBets || 0}</p>
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((pulpStats.activeBets || 0) * 20, 100)}%` }}></div>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={staggerItem}>
                <Card className="p-4 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-background">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Active Challenges</p>
                  <p className="text-3xl font-bold text-purple-600">{pulpStats.activeChallenges || 0}</p>
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((pulpStats.activeChallenges || 0) * 33, 100)}%` }}></div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {/* Transaction History */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Transactions</h3>
              <span className="text-xs text-muted-foreground">Last 20</span>
            </div>
            {transactions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border border-dashed border-border rounded-lg">
                <Coins className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No transactions yet.</p>
                <p className="text-sm">Start betting to earn PULPs!</p>
              </div>
            ) : (
              <motion.div
                className="space-y-2"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {transactions.map((txn) => (
                  <motion.div
                    key={txn.id}
                    variants={staggerItem}
                    whileHover={{ scale: 1.01, x: 4 }}
                    onClick={() => {
                      if (txn.amount > 0) {
                        triggerConfetti('win', { x: 0.5, y: 0.5 })
                      }
                    }}
                    className={`flex items-center justify-between p-4 border border-border rounded-lg bg-gradient-to-r from-background to-muted/20 hover:border-primary/30 transition-colors ${
                      txn.amount > 0 ? 'cursor-pointer' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xl ${
                        txn.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        {getTransactionIcon(txn.transaction_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleDateString()} • {new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className={`text-lg font-bold ${getTransactionColor(txn.amount)}`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bal: {txn.balance_after?.toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confetti Effect */}
      {confetti.active && (
        <Confetti
          active={confetti.active}
          {...(confetti.preset ? confettiPresets[confetti.preset] : {})}
          origin={confetti.origin}
        />
      )}

      {/* Celebration Modal */}
      {celebration && (
        <CelebrationModal
          isOpen={!!celebration}
          onClose={() => setCelebration(null)}
          title={celebration.title}
          description={celebration.description}
          icon={celebration.icon}
          accentColor={celebration.accentColor}
          confettiPreset={celebration.confettiPreset}
          reward={celebration.reward}
        />
      )}
    </PageContainer>
  )
}
