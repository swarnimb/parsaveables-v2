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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <img
            src="/branding-logo.jpeg"
            alt="ParSaveables Logo"
            style={{ height: '28px', width: 'auto', flexShrink: 0, display: 'block' }}
          />
          <h2 className="text-2xl font-bold" style={{ lineHeight: 1, margin: 0 }}>ParSaveables</h2>
        </div>
        <p className="text-sm text-muted-foreground">{eventName}</p>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Table Header */}
        <div
          className="grid grid-cols-[50px_1fr_80px_70px_60px_70px] gap-2 bg-muted/50 px-4 border-b border-border"
          style={{ paddingTop: '14px', paddingBottom: '14px', lineHeight: '1.5' }}
        >
          <div className="text-center text-xs font-semibold">Rank</div>
          <div className="text-xs font-semibold">Player</div>
          <div className="text-right text-xs font-semibold">Points</div>
          <div className="text-center text-xs font-semibold">Rounds</div>
          <div className="text-center text-xs font-semibold">Wins</div>
          <div className="text-center text-xs font-semibold">Podiums</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {players.map((player, index) => {
            const rank = index + 1
            const isTopThree = rank <= 3

            return (
              <div
                key={`${player.id}-${index}`}
                className={`grid grid-cols-[50px_1fr_80px_70px_60px_70px] gap-2 px-4 ${
                  isTopThree ? 'bg-primary/5' : ''
                }`}
                style={{ paddingTop: '14px', paddingBottom: '14px', lineHeight: '1.5' }}
              >
                {/* Rank */}
                <div className="text-center font-bold" style={{ lineHeight: '1.5' }}>
                  {rank === 1 && <span className="text-yellow-500">🥇</span>}
                  {rank === 2 && <span className="text-gray-400">🥈</span>}
                  {rank === 3 && <span className="text-amber-600">🥉</span>}
                  {rank > 3 && <span className="text-muted-foreground">{rank}</span>}
                </div>

                {/* Player Name */}
                <div className="font-medium text-sm" style={{ lineHeight: '1.5', overflow: 'visible' }}>
                  {player.player_name}
                </div>

                {/* Points */}
                <div className="text-right font-semibold text-sm" style={{ lineHeight: '1.5' }}>
                  {player.total_points || 0}
                </div>

                {/* Rounds */}
                <div className="text-center text-muted-foreground text-sm" style={{ lineHeight: '1.5' }}>
                  {player.rounds_played || 0}
                </div>

                {/* Wins */}
                <div className="text-center text-muted-foreground text-sm" style={{ lineHeight: '1.5' }}>
                  {player.wins || 0}
                </div>

                {/* Podiums */}
                <div className="text-center text-muted-foreground text-sm" style={{ lineHeight: '1.5' }}>
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
