import { Trophy } from 'lucide-react'

/**
 * ShareableLeaderboard Component
 *
 * A clean, shareable version of the leaderboard optimized for image generation.
 * Shows: Rank, Player Name, Points, Rounds, Wins, Podiums
 */
export default function ShareableLeaderboard({ players, eventName }) {
  return (
    <div
      id="shareable-leaderboard"
      className="bg-gradient-to-br from-background via-primary/5 to-background p-8 rounded-lg shadow-xl"
      style={{ width: '600px' }}
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">ParSaveables</h2>
        </div>
        <p className="text-sm text-muted-foreground">{eventName}</p>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[50px_1fr_80px_70px_60px_70px] gap-2 bg-muted/50 px-4 py-3 text-xs font-semibold border-b border-border">
          <div className="text-center">Rank</div>
          <div>Player</div>
          <div className="text-right">Points</div>
          <div className="text-center">Rounds</div>
          <div className="text-center">Wins</div>
          <div className="text-center">Podiums</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {players.map((player, index) => {
            const rank = index + 1
            const isTopThree = rank <= 3

            return (
              <div
                key={`${player.id}-${index}`}
                className={`grid grid-cols-[50px_1fr_80px_70px_60px_70px] gap-2 px-4 py-3 text-sm ${
                  isTopThree ? 'bg-primary/5' : ''
                }`}
              >
                {/* Rank */}
                <div className="text-center font-bold">
                  {rank === 1 && <span className="text-yellow-500">🥇</span>}
                  {rank === 2 && <span className="text-gray-400">🥈</span>}
                  {rank === 3 && <span className="text-amber-600">🥉</span>}
                  {rank > 3 && <span className="text-muted-foreground">{rank}</span>}
                </div>

                {/* Player Name */}
                <div className="font-medium truncate">{player.player_name}</div>

                {/* Points */}
                <div className="text-right font-semibold">{player.total_points || 0}</div>

                {/* Rounds */}
                <div className="text-center text-muted-foreground">{player.rounds_played || 0}</div>

                {/* Wins */}
                <div className="text-center text-muted-foreground">{player.wins || 0}</div>

                {/* Podiums */}
                <div className="text-center text-muted-foreground">{player.podiums || 0}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 text-xs text-muted-foreground">
        parsaveables.com
      </div>
    </div>
  )
}
