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
        <h2 className="text-2xl font-bold mb-2">ParSaveables</h2>
        <p className="text-sm text-muted-foreground">{eventName}</p>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Table Header */}
        <div
          className="grid grid-cols-[50px_250px_60px_60px_60px_60px] gap-3 bg-muted/50 px-4 border-b border-border"
          style={{ height: '40px' }}
        >
          <div className="text-center text-xs font-semibold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Rank</div>
          <div className="text-xs font-semibold" style={{ display: 'flex', alignItems: 'center' }}>Player</div>
          <div className="text-center text-xs font-semibold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Points</div>
          <div className="text-center text-xs font-semibold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Rounds</div>
          <div className="text-center text-xs font-semibold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Wins</div>
          <div className="text-center text-xs font-semibold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Podiums</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {players.map((player, index) => {
            const rank = index + 1
            const isTopThree = rank <= 3

            return (
              <div
                key={`${player.id}-${index}`}
                className={`grid grid-cols-[50px_250px_60px_60px_60px_60px] gap-3 px-4 ${
                  isTopThree ? 'bg-primary/5' : ''
                }`}
                style={{ height: '48px' }}
              >
                {/* Rank */}
                <div className="text-center font-bold" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rank === 1 && <span className="text-yellow-500">🥇</span>}
                  {rank === 2 && <span className="text-gray-400">🥈</span>}
                  {rank === 3 && <span className="text-amber-600">🥉</span>}
                  {rank > 3 && <span className="text-muted-foreground">{rank}</span>}
                </div>

                {/* Player Name */}
                <div className="font-medium text-sm" style={{ display: 'flex', alignItems: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.player_name}
                </div>

                {/* Points */}
                <div className="font-semibold text-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {player.total_points || 0}
                </div>

                {/* Rounds */}
                <div className="text-muted-foreground text-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {player.rounds_played || 0}
                </div>

                {/* Wins */}
                <div className="text-muted-foreground text-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {player.wins || 0}
                </div>

                {/* Podiums */}
                <div className="text-muted-foreground text-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {player.podiums || 0}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 text-xs text-muted-foreground">
        parsaveables.vercel.app
      </div>
    </div>
  )
}
