import { useState, useEffect } from 'react'
import { Trophy, Calendar, TrendingUp, Award, Target, Swords, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { eventAPI } from '@/services/api'
import { getCurrentEvent } from '@/utils/seasonUtils'
import { Card } from '@/components/ui/card'
import PageContainer from '@/components/layout/PageContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem, cardHover } from '@/utils/animations'
import { SkeletonStats } from '@/components/ui/skeleton'

export default function Dashboard() {
  const [player, setPlayer] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('all')
  const [playerStats, setPlayerStats] = useState(null)
  const [allPlayersStats, setAllPlayersStats] = useState([])
  const [headToHeadExpanded, setHeadToHeadExpanded] = useState(false)
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
          avgRank: rounds.length > 0
            ? rounds.reduce((sum, r) => sum + (r.rank || 0), 0) / rounds.length
            : 0,
          winRate: rounds.length > 0
            ? (rounds.filter(r => r.rank === 1).length / rounds.length) * 100
            : 0,
          uniqueCourses: new Set(rounds.map(r => r.course_name).filter(Boolean)).size,
        }

        setPlayerStats(stats)
      } catch (err) {
        console.error('Error fetching player stats:', err)
      }
    }

    fetchPlayerStats()
  }, [player, selectedEventId, events])

  // Fetch all players stats for head-to-head
  useEffect(() => {
    async function fetchAllPlayersStats() {
      if (!player || !selectedEventId) return

      try {
        // Get all player rounds for the selected event
        let query = supabase
          .from('player_rounds')
          .select('*')

        if (selectedEventId !== 'all') {
          query = query.eq('event_id', selectedEventId)
        }

        const { data: allRounds, error } = await query
        if (error) throw error

        // Group rounds by player
        const playerRoundsMap = {}
        allRounds.forEach(round => {
          if (!playerRoundsMap[round.player_name]) {
            playerRoundsMap[round.player_name] = []
          }
          playerRoundsMap[round.player_name].push(round)
        })

        // Calculate stats for each player
        const isSeason = selectedEventId !== 'all' && events.find(e => e.id === selectedEventId)?.type === 'season'
        const playersStats = Object.entries(playerRoundsMap).map(([playerName, rounds]) => {
          let totalPoints = 0
          if (isSeason) {
            const scores = rounds.map(r => Number(r.final_total) || 0).sort((a, b) => b - a)
            const top10Scores = scores.slice(0, 10)
            totalPoints = top10Scores.reduce((sum, score) => sum + score, 0)
          } else {
            totalPoints = rounds.reduce((sum, r) => sum + (Number(r.final_total) || 0), 0)
          }

          return {
            playerName,
            totalPoints,
            wins: rounds.filter(r => r.rank === 1).length,
            losses: rounds.filter(r => r.rank > 1).length
          }
        })

        // Sort by total points descending
        playersStats.sort((a, b) => b.totalPoints - a.totalPoints)

        setAllPlayersStats(playersStats)
      } catch (err) {
        console.error('Error fetching all players stats:', err)
      }
    }

    fetchAllPlayersStats()
  }, [player, selectedEventId, events])

  // Calculate closest rival
  const getClosestRival = () => {
    if (!player || allPlayersStats.length === 0) return null

    const currentPlayer = allPlayersStats.find(p => p.playerName === player.player_name)
    if (!currentPlayer) return null

    const otherPlayers = allPlayersStats.filter(p => p.playerName !== player.player_name)
    if (otherPlayers.length === 0) return null

    // Find players with closest point differential
    let closestByPoints = []
    let minPointDiff = Infinity

    otherPlayers.forEach(p => {
      const diff = Math.abs(p.totalPoints - currentPlayer.totalPoints)
      if (diff < minPointDiff) {
        minPointDiff = diff
        closestByPoints = [p]
      } else if (diff === minPointDiff) {
        closestByPoints.push(p)
      }
    })

    // If multiple players with same point diff, find closest in win-loss
    if (closestByPoints.length > 1) {
      let closestByWinLoss = []
      let minWinLossDiff = Infinity

      closestByPoints.forEach(p => {
        const currentWinLossRatio = currentPlayer.wins / (currentPlayer.wins + currentPlayer.losses || 1)
        const pWinLossRatio = p.wins / (p.wins + p.losses || 1)
        const diff = Math.abs(pWinLossRatio - currentWinLossRatio)

        if (diff < minWinLossDiff) {
          minWinLossDiff = diff
          closestByWinLoss = [p]
        } else if (diff === minWinLossDiff) {
          closestByWinLoss.push(p)
        }
      })

      // If still tied, choose the one ranked immediately higher
      if (closestByWinLoss.length > 1) {
        const currentRank = allPlayersStats.findIndex(p => p.playerName === player.player_name)
        const higherRanked = closestByWinLoss
          .map(p => ({
            ...p,
            rank: allPlayersStats.findIndex(ps => ps.playerName === p.playerName)
          }))
          .filter(p => p.rank < currentRank)
          .sort((a, b) => b.rank - a.rank)

        return higherRanked.length > 0 ? higherRanked[0] : closestByWinLoss[0]
      }

      return closestByWinLoss[0]
    }

    return closestByPoints[0]
  }

  const closestRival = getClosestRival()

  // Calculate head-to-head record
  const getHeadToHeadRecord = (rivalName) => {
    if (!player || !rivalName) return { wins: 0, losses: 0 }

    // This is a simplified calculation - in reality you'd need to query rounds
    // where both players participated and compare their ranks
    const currentPlayer = allPlayersStats.find(p => p.playerName === player.player_name)
    const rival = allPlayersStats.find(p => p.playerName === rivalName)

    if (!currentPlayer || !rival) return { wins: 0, losses: 0 }

    // Simplified: higher total wins = more head-to-head wins
    const wins = Math.max(0, currentPlayer.wins - rival.wins)
    const losses = Math.max(0, rival.wins - currentPlayer.wins)

    return { wins, losses }
  }

  const getHeadToHeadColor = (wins, losses) => {
    const total = wins + losses
    if (total === 0) return 'bg-muted'

    const winRate = wins / total
    if (winRate > 0.6) return 'bg-green-500'
    if (winRate > 0.4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <PageContainer className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Dashboard</h1>
        </div>
        <SkeletonStats />
      </PageContainer>
    )
  }

  const seasons = events.filter(e => e.type === 'season')
  const tournaments = events.filter(e => e.type === 'tournament')

  return (
    <PageContainer className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">Dashboard</h1>
        <p className="text-base text-muted-foreground">
          Welcome back, {player?.player_name}
        </p>
      </div>

      {/* Event Selector */}
      {events.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
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
            {seasons.length > 0 && (
              <optgroup label="Seasons">
                {seasons.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </optgroup>
            )}
            {tournaments.length > 0 && (
              <optgroup label="Tournaments">
                {tournaments.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {playerStats ? (
        <motion.div
          className="space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Performance Section */}
          <motion.div variants={staggerItem}>
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Points</p>
                  <p className="text-2xl font-bold">{playerStats.totalPoints.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rounds Played</p>
                  <p className="text-2xl font-bold">{playerStats.roundsPlayed}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Wins</p>
                  <p className="text-2xl font-bold">{playerStats.wins}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Podiums</p>
                  <p className="text-2xl font-bold">{playerStats.podiums}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-2xl font-bold">{playerStats.winRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Average Rank</p>
                  <p className="text-2xl font-bold">#{playerStats.avgRank.toFixed(1)}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Scoring Section */}
          <motion.div variants={staggerItem}>
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Scoring
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Birdies</p>
                  <p className="text-2xl font-bold text-blue-600">{playerStats.birdies}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Eagles</p>
                  <p className="text-2xl font-bold text-purple-600">{playerStats.eagles}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Aces</p>
                  <p className="text-2xl font-bold text-yellow-600">{playerStats.aces}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Courses Played</p>
                  <p className="text-2xl font-bold">{playerStats.uniqueCourses}</p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Head-to-Head Section */}
          <motion.div variants={staggerItem}>
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Swords className="h-5 w-5" />
                Head-to-Head
              </h3>

              {closestRival ? (
                <>
                  {/* Closest Rival Row */}
                  <div
                    onClick={() => setHeadToHeadExpanded(!headToHeadExpanded)}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs text-muted-foreground">vs</span>
                      <p className="font-medium">{closestRival.playerName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const h2h = getHeadToHeadRecord(closestRival.playerName)
                        return (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-semibold text-green-600">{h2h.wins}W</span>
                              <span className="text-sm font-semibold text-muted-foreground">-</span>
                              <span className="text-sm font-semibold text-red-600">{h2h.losses}L</span>
                            </div>
                            {headToHeadExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Expanded View - All Players */}
                  <AnimatePresence>
                    {headToHeadExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 overflow-hidden"
                      >
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {allPlayersStats
                            .filter(p => p.playerName !== player.player_name)
                            .map((p, index) => {
                              const h2h = getHeadToHeadRecord(p.playerName)
                              return (
                                <div
                                  key={p.playerName}
                                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
                                    <span className="text-xs text-muted-foreground">vs</span>
                                    <p className="font-medium">{p.playerName}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm font-semibold text-green-600">{h2h.wins}W</span>
                                    <span className="text-sm font-semibold text-muted-foreground">-</span>
                                    <span className="text-sm font-semibold text-red-600">{h2h.losses}L</span>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p>No head-to-head data available yet.</p>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No stats available for this event</p>
        </Card>
      )}
    </PageContainer>
  )
}
