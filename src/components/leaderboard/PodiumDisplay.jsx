import { useState } from 'react'
import { Trophy, ChevronDown } from 'lucide-react'
import { getPlayerDisplayName } from '@/utils/playerUtils'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'

export default function PodiumDisplay({ players }) {
  const [expandedPlayer, setExpandedPlayer] = useState(null)

  if (players.length === 0) return null

  const [first, second, third] = players

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

  const PodiumCard = ({ player, rank, heightClass, iconSize, borderClass = 'border-border' }) => {
    const isExpanded = expandedPlayer === player.player_name
    const displayName = getPlayerDisplayName(player.player_name)

    return (
      <div className="text-center">
        <div
          className={`bg-card border ${borderClass} rounded-lg p-4 ${heightClass} flex flex-col justify-end cursor-pointer hover:bg-accent/50 transition-colors relative ${isExpanded ? 'ring-2 ring-primary bg-accent/30' : ''}`}
          onClick={() => toggleExpand(player.player_name)}
        >
          {rank === 1 && (
            <div className="flex justify-center mb-2">
              <Trophy className={`${iconSize} text-primary`} />
            </div>
          )}
          <p className={rank === 1 ? 'font-bold text-base' : 'font-semibold text-sm mt-2'}>
            {displayName}
          </p>
          <div>
            <p className={rank === 1 ? 'text-sm text-primary font-bold' : 'text-sm font-semibold'}>
              {player.total_points?.toFixed(1) || '0.0'} pts
            </p>
            <p className="text-xs text-muted-foreground">
              {player.rounds_played || 0} rounds
            </p>
          </div>
          <div className="flex justify-center mt-2">
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Podium base */}
        <div className={`${rank === 1 ? 'bg-primary text-primary-foreground h-16' : 'bg-muted h-12'} ${rank === 3 ? 'h-8' : ''} rounded-t-lg mt-2 flex items-center justify-center`}>
          <span className={`${rank === 1 ? 'text-3xl' : rank === 2 ? 'text-2xl' : 'text-xl'} font-bold`}>
            {rank}
          </span>
        </div>
      </div>
    )
  }

  // Find expanded player for stats display
  const expandedPlayerData = expandedPlayer
    ? players.find(p => p.player_name === expandedPlayer)
    : null
  const expandedPlayerStats = expandedPlayerData ? calculateStats(expandedPlayerData) : null

  return (
    <div className="mb-8">
      {/* Podium Display */}
      <motion.div
        className="grid grid-cols-3 gap-4 items-end max-w-2xl mx-auto"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* 2nd Place */}
        {second && (
          <motion.div variants={staggerItem}>
            <PodiumCard
            player={second}
            rank={2}
            heightClass="h-32"
            iconSize="h-8 w-8"
          />
          </motion.div>
        )}

        {/* 1st Place */}
        {first && (
          <motion.div variants={staggerItem}>
            <PodiumCard
            player={first}
            rank={1}
            heightClass="h-40"
            iconSize="h-10 w-10"
            borderClass="border-2 border-primary"
          />
          </motion.div>
        )}

        {/* 3rd Place */}
        {third && (
          <motion.div variants={staggerItem}>
            <PodiumCard
            player={third}
            rank={3}
            heightClass="h-32"
            iconSize="h-6 w-6"
          />
          </motion.div>
        )}
      </motion.div>

      {/* Expanded Stats - Full Width Below Entire Podium */}
      {expandedPlayerData && (
        <div className="mt-6 max-w-2xl mx-auto">
          <div className="bg-muted/30 border border-border rounded-lg p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Wins</p>
                <p className="font-semibold text-green-600 text-lg">{expandedPlayerStats.wins}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Podiums</p>
                <p className="font-semibold text-yellow-600 text-lg">{expandedPlayerStats.podiums}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Avg Points/Round</p>
                <p className="font-semibold text-lg">{expandedPlayerStats.avgPoints}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Birdies</p>
                <p className="font-semibold text-blue-600 text-lg">{expandedPlayerData.total_birdies || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Eagles</p>
                <p className="font-semibold text-purple-600 text-lg">{expandedPlayerData.total_eagles || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Aces</p>
                <p className="font-semibold text-yellow-600 text-lg">{expandedPlayerData.total_aces || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
