import { useState, useEffect } from 'react'
import { eventAPI } from '@/services/api'
import { getCurrentEvent } from '@/utils/seasonUtils'
import PodiumDisplay from '@/components/leaderboard/PodiumDisplay'
import LeaderboardTable from '@/components/leaderboard/LeaderboardTable'
import PageContainer from '@/components/layout/PageContainer'
import { SkeletonPodium, SkeletonTable } from '@/components/ui/skeleton'

export default function Leaderboard() {
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch events on mount and default to current season
  useEffect(() => {
    console.log('Fetching events...')
    eventAPI.getAllEvents()
      .then(events => {
        console.log('Events fetched:', events)
        setEvents(events)
        // Auto-select current season
        const currentEvent = getCurrentEvent(events)
        console.log('Selected event (current season):', currentEvent)
        if (currentEvent) {
          setSelectedEventId(currentEvent.id)
        }
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching events:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Fetch leaderboard when event changes
  useEffect(() => {
    if (!selectedEventId) {
      console.log('No event selected yet')
      return
    }

    console.log('Fetching leaderboard for event:', selectedEventId)
    setLoading(true)
    eventAPI.getLeaderboardForEvent(selectedEventId)
      .then(players => {
        console.log('Leaderboard data:', players)
        console.log('Number of players:', players.length)
        console.log('Top 3 players:', players.slice(0, 3).map(p => ({
          name: p.player_name,
          points: p.total_points,
          wins: p.wins,
          podiums: p.podiums
        })))
        setPlayers(players)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching leaderboard:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [selectedEventId])

  if (loading) {
    return (
      <PageContainer className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Leaderboard</h1>
        </div>
        <SkeletonPodium />
        <SkeletonTable rows={7} />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-4">
          <p className="text-destructive">Error loading leaderboard: {error}</p>
        </div>
      </div>
    )
  }

  const topThree = players.slice(0, 3)
  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <PageContainer className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
      {/* Header with Event Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Leaderboard</h1>

        {/* Event Selector */}
        {events.length > 0 && (
          <div className="flex items-center gap-3">
            <label htmlFor="event-select" className="text-sm font-medium whitespace-nowrap">
              Event:
            </label>
            <select
              id="event-select"
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm min-w-[200px]"
            >
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Podium Display for Top 3 */}
      {topThree.length > 0 && (
        <PodiumDisplay players={topThree} />
      )}

      {/* Leaderboard Table - Players ranked 4+ */}
      {players.length > 3 ? (
        <LeaderboardTable players={players.slice(3)} startRank={4} />
      ) : players.length > 0 && players.length <= 3 ? (
        <div className="border border-border rounded-lg p-8 text-center mt-6">
          <p className="text-muted-foreground">Only top 3 players currently - more to come!</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No data for this event yet.</p>
        </div>
      )}
    </PageContainer>
  )
}
