import { useState, useEffect } from 'react'
import { ChevronDown, Users, Calendar, MapPin, Bird, Zap, Target, Trophy, Award } from 'lucide-react'
import { roundAPI } from '@/services/api'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'

const cardHover = {
  rest: { scale: 1, y: 0 },
  hover: { scale: 1.01, y: -2, transition: { duration: 0.2 } }
}

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
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      className="border-2 border-border rounded-xl overflow-hidden bg-gradient-to-br from-card to-muted/20 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Collapsed View - Clickable Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/30 transition-colors text-left group"
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Date */}
          <div className="flex items-center gap-2 min-w-[100px]">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{round.date}</span>
          </div>

          {/* Course */}
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm font-semibold line-clamp-2">{round.course_name}</span>
          </div>

          {/* Player Count */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {round.player_count}
            </span>
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ml-4 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded View - Scorecard + Players */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t-2 border-border/50 p-4 bg-muted/50"
          >
            <div className="grid md:grid-cols-2 gap-6">
              {/* Scorecard Image - Only if available */}
              {round.scorecard_image_url && (
                <div className="flex flex-col">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative group"
                  >
                    <img
                      src={round.scorecard_image_url}
                      alt="Scorecard"
                      onClick={() => setIsImageFullScreen(true)}
                      className="rounded-lg border border-border w-full object-contain max-h-[400px] cursor-pointer shadow-md group-hover:shadow-lg transition-all"
                    />
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                      <p className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-3 py-1.5 rounded">
                        Click to enlarge
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Player List - Single Card */}
              <div className={`flex flex-col ${round.scorecard_image_url ? '' : 'md:col-span-2'}`}>

              {loadingPlayers ? (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="divide-y divide-border">
                    {players.map((player, index) => {
                      const isWinner = index === 0

                      return (
                        <div
                          key={player.player_name}
                          className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Rank */}
                            <span className={`text-sm font-bold min-w-[24px] ${isWinner ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                              {isWinner ? '🏆' : `#${index + 1}`}
                            </span>

                            {/* Player Name */}
                            <span className="text-sm font-medium line-clamp-2 break-words">{player.player_name}</span>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Score */}
                            <span className={`text-sm font-semibold min-w-[40px] text-right ${
                              player.total_score === 0 ? 'text-gray-600' :
                              player.total_score < 0 ? 'text-green-600' :
                              'text-red-600'
                            }`}>
                              {player.total_score === 0 ? 'E' : player.total_score > 0 ? `+${player.total_score}` : player.total_score ?? 'N/A'}
                            </span>

                            {/* Points */}
                            <span className="text-sm font-bold text-green-600 min-w-[50px] text-right">
                              {player.final_total?.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Full-screen Image Modal */}
      {isImageFullScreen && round.scorecard_image_url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
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
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            src={round.scorecard_image_url}
            alt="Scorecard Full Screen"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setIsImageFullScreen(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition-colors"
          >
            ✕
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
