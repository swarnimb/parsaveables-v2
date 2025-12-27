import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react'
import { getPlayerDisplayName } from '@/utils/playerUtils'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'

export default function LeaderboardTable({ players, startRank = 1 }) {
  const [sortField, setSortField] = useState('total_points')
  const [sortDirection, setSortDirection] = useState('desc')
  const [expandedPlayer, setExpandedPlayer] = useState(null)

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const sortedPlayers = [...players].sort((a, b) => {
    const aVal = a[sortField] || 0
    const bVal = b[sortField] || 0
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    )
  }

  const toggleExpand = (playerName) => {
    setExpandedPlayer(expandedPlayer === playerName ? null : playerName)
  }

  const calculateStats = (player) => {
    const wins = player.wins || 0
    const podiums = player.podiums || 0
    const avgPoints = player.rounds_played > 0
      ? (player.total_points / player.rounds_played).toFixed(2)
      : '0.00'

    return { wins, podiums, avgPoints }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium w-8"></th>
              <th className="px-4 py-3 text-left text-sm font-medium">Rank</th>
              <th
                className="px-4 py-3 text-left text-sm font-medium cursor-pointer hover:bg-accent"
                onClick={() => handleSort('player_name')}
              >
                Player <SortIcon field="player_name" />
              </th>
              <th
                className="px-4 py-3 text-right text-sm font-medium cursor-pointer hover:bg-accent"
                onClick={() => handleSort('total_points')}
              >
                Points <SortIcon field="total_points" />
              </th>
            </tr>
          </thead>
          <motion.tbody
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {sortedPlayers.map((player, index) => {
              const isExpanded = expandedPlayer === player.player_name
              const stats = calculateStats(player)

              return (
                <>
                  <motion.tr
                    key={player.player_name}
                    variants={staggerItem}
                    className="border-t border-border hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(player.player_name)}
                  >
                    <td className="px-4 py-3 text-sm">
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {index + startRank}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {getPlayerDisplayName(player.player_name)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-green-600">
                          {player.total_points?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {player.rounds_played || 0} rounds
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                  {isExpanded && (
                    <tr key={`${player.player_name}-expanded`} className="bg-muted/50">
                      <td colSpan="6" className="px-4 py-4">
                        <div className="grid grid-cols-6 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground mb-1">Wins</p>
                            <p className="font-semibold text-green-600">{stats.wins}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Podiums</p>
                            <p className="font-semibold text-yellow-600">{stats.podiums}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Avg Points/Round</p>
                            <p className="font-semibold">{stats.avgPoints}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Birdies</p>
                            <p className="font-semibold text-blue-600">{player.total_birdies || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Eagles</p>
                            <p className="font-semibold text-purple-600">{player.total_eagles || 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Aces</p>
                            <p className="font-semibold text-yellow-600">{player.total_aces || 0}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </motion.tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <motion.div
        className="md:hidden"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {sortedPlayers.map((player, index) => {
          const isExpanded = expandedPlayer === player.player_name
          const stats = calculateStats(player)

          return (
            <motion.div
              key={player.player_name}
              variants={staggerItem}
              className="border-b border-border last:border-b-0"
            >
              <div
                className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => toggleExpand(player.player_name)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                    <span className="text-lg font-bold text-muted-foreground">
                      #{index + startRank}
                    </span>
                    <span className="font-semibold">{getPlayerDisplayName(player.player_name)}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      {player.total_points?.toFixed(1) || '0.0'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {player.rounds_played || 0}r
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="bg-muted/50 p-4 border-t border-border">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Wins</p>
                      <p className="font-semibold text-green-600">{stats.wins}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Podiums</p>
                      <p className="font-semibold text-yellow-600">{stats.podiums}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Avg Pts</p>
                      <p className="font-semibold">{stats.avgPoints}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Birdies</p>
                      <p className="font-semibold text-blue-600">{player.total_birdies || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Eagles</p>
                      <p className="font-semibold text-purple-600">{player.total_eagles || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Aces</p>
                      <p className="font-semibold text-yellow-600">{player.total_aces || 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
