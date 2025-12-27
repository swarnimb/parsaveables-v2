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
        <div className="flex items-center gap-6 flex-1">
          {/* Date - Enhanced */}
          <div className="flex items-center gap-3 min-w-[140px]">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Date</p>
              <p className="text-sm font-bold">{round.date}</p>
            </div>
          </div>

          {/* Course - Enhanced */}
          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground font-medium">Course</p>
              <p className="text-sm font-bold truncate">{round.course_name}</p>
            </div>
          </div>

          {/* Player Count - Enhanced */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Players</p>
              <p className="text-sm font-bold">
                {round.player_count}
              </p>
            </div>
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
            className="border-t-2 border-border/50 p-6 bg-gradient-to-br from-muted/20 to-muted/40"
          >
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left: Scorecard Image */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Award className="h-4 w-4 text-amber-600" />
                  </div>
                  <h3 className="text-base font-bold">Scorecard</h3>
                </div>
                {round.scorecard_image_url ? (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative group"
                  >
                    <img
                      src={round.scorecard_image_url}
                      alt="Scorecard"
                      onClick={() => setIsImageFullScreen(true)}
                      className="rounded-xl border-2 border-border w-full object-contain max-h-[500px] cursor-pointer shadow-lg group-hover:shadow-xl transition-all"
                    />
                    <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                      <p className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-4 py-2 rounded-lg">
                        Click to enlarge
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-border bg-muted/50 h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                      <p className="text-sm text-muted-foreground font-medium">No scorecard image available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Player List */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                  </div>
                  <h3 className="text-base font-bold">Players & Scores</h3>
                </div>

              {loadingPlayers ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <motion.div
                  className="space-y-3"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {players.map((player, index) => {
                    const isWinner = index === 0
                    const isPodium = index < 3
                    const rankColors = {
                      0: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30',
                      1: 'from-gray-400/20 to-gray-500/10 border-gray-400/30',
                      2: 'from-orange-600/20 to-orange-700/10 border-orange-600/30'
                    }

                    return (
                      <motion.div
                        variants={staggerItem}
                        key={player.player_name}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                          isPodium
                            ? `bg-gradient-to-r ${rankColors[index]} shadow-md`
                            : 'bg-card border-border hover:border-primary/30'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          {/* Rank Badge */}
                          <div className={`flex items-center justify-center w-10 h-10 rounded-lg font-bold ${
                            isWinner ? 'bg-yellow-500/20 text-yellow-600 text-lg' :
                            isPodium ? 'bg-gray-500/20 text-gray-600' :
                            'bg-muted text-muted-foreground text-sm'
                          }`}>
                            {isWinner ? '🏆' : `#${index + 1}`}
                          </div>

                          {/* Player Info */}
                          <div className="flex-1">
                            <p className={`font-bold ${isWinner ? 'text-lg' : 'text-base'}`}>
                              {player.player_name}
                            </p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className={`text-sm font-semibold ${
                                player.total_score === 0 ? 'text-gray-600' :
                                player.total_score < 0 ? 'text-green-600' :
                                'text-red-600'
                              }`}>
                                {player.total_score === 0 ? 'E' : player.total_score > 0 ? `+${player.total_score}` : player.total_score ?? 'N/A'}
                              </span>

                              {/* Special Shots */}
                              <div className="flex items-center gap-2">
                                {player.birdies > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                                    <Bird className="h-3 w-3 text-blue-600" />
                                    <span className="text-xs font-semibold text-blue-600">{player.birdies}</span>
                                  </span>
                                )}
                                {player.eagles > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                                    <Zap className="h-3 w-3 text-purple-600" />
                                    <span className="text-xs font-semibold text-purple-600">{player.eagles}</span>
                                  </span>
                                )}
                                {player.aces > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                                    <Target className="h-3 w-3 text-yellow-600" />
                                    <span className="text-xs font-semibold text-yellow-600">{player.aces}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Points */}
                          <div className="text-right">
                            <p className={`font-bold ${isWinner ? 'text-xl text-yellow-600' : isPodium ? 'text-lg text-primary' : 'text-base text-muted-foreground'}`}>
                              {player.final_total?.toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">pts</p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
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
