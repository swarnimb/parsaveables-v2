import { useState, useEffect } from 'react'
import { ChevronDown, Users, Calendar, MapPin } from 'lucide-react'
import { roundAPI } from '@/services/api'

export default function RoundCard({ round, isExpanded, onToggle }) {
  const [players, setPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [isImageFullScreen, setIsImageFullScreen] = useState(false)

  // Fetch players when expanded
  useEffect(() => {
    if (isExpanded && players.length === 0) {
      console.log('Fetching players for round:', round.id)
      setLoadingPlayers(true)
      roundAPI.getPlayersForRound(round.id)
        .then(data => {
          console.log('Players data:', data)
          setPlayers(data)
        })
        .catch(err => {
          console.error('Error fetching players:', err)
          console.error('Error details:', err.message, err.details)
        })
        .finally(() => setLoadingPlayers(false))
    }
  }, [isExpanded, round.id, players.length])

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      {/* Collapsed View - Clickable Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Date */}
          <div className="flex items-center gap-2 min-w-[120px]">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{round.date}</span>
          </div>

          {/* Course */}
          <div className="flex items-center gap-2 flex-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{round.course_name}</span>
          </div>

          {/* Player Count */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {round.player_count} {round.player_count === 1 ? 'player' : 'players'}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded View - Scorecard + Players */}
      {isExpanded && (
        <div className="border-t border-border p-4 bg-muted/30">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Scorecard Image */}
            <div className="flex flex-col">
              <h3 className="text-sm font-medium mb-3">Scorecard</h3>
              {round.scorecard_image_url ? (
                <img
                  src={round.scorecard_image_url}
                  alt="Scorecard"
                  onClick={() => setIsImageFullScreen(true)}
                  className="rounded-lg border border-border w-full object-contain max-h-[500px] cursor-pointer hover:opacity-90 transition-opacity"
                />
              ) : (
                <div className="rounded-lg border-2 border-dashed border-border bg-muted/50 h-[300px] flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No scorecard image available</p>
                </div>
              )}
            </div>

            {/* Right: Player List */}
            <div className="flex flex-col">
              <h3 className="text-sm font-medium mb-3">Players & Scores</h3>

              {loadingPlayers ? (
                <p className="text-sm text-muted-foreground">Loading players...</p>
              ) : (
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <div
                      key={player.player_name}
                      className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-muted-foreground w-6">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{player.player_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Score: {player.total_score === 0 ? 'E' : player.total_score > 0 ? `+${player.total_score}` : player.total_score ?? 'N/A'}
                            {player.birdies > 0 && ` • ${player.birdies} 🦅`}
                            {player.eagles > 0 && ` • ${player.eagles} 🦅🦅`}
                            {player.aces > 0 && ` • ${player.aces} 🎯`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {player.final_total?.toFixed(1)} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Image Modal */}
      {isImageFullScreen && round.scorecard_image_url && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsImageFullScreen(false)}
          onTouchStart={(e) => {
            const startY = e.touches[0].clientY
            const handleTouchMove = (e) => {
              const deltaY = Math.abs(e.touches[0].clientY - startY)
              if (deltaY > 50) {
                setIsImageFullScreen(false)
                document.removeEventListener('touchmove', handleTouchMove)
              }
            }
            document.addEventListener('touchmove', handleTouchMove, { once: true })
          }}
        >
          <img
            src={round.scorecard_image_url}
            alt="Scorecard Full Screen"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
