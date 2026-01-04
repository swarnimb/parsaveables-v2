import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square, Sparkles, X } from 'lucide-react'
import { supabase } from '@/services/supabase'
import PageContainer from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'
import { usePodcastNotifications } from '@/hooks/usePodcastNotifications'

export default function Podcast() {
  const [episodes, setEpisodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [playingEpisodeId, setPlayingEpisodeId] = useState(null)
  const [currentTimes, setCurrentTimes] = useState({})
  const [durations, setDurations] = useState({})
  const [showBanner, setShowBanner] = useState(false)
  const audioRefs = useRef({})
  const { unreadCount, markAllAsRead } = usePodcastNotifications()

  // Show banner if there are unread episodes
  useEffect(() => {
    if (unreadCount > 0) {
      setShowBanner(true)
    }
  }, [unreadCount])

  // Fetch published podcast episodes from database
  useEffect(() => {
    async function fetchEpisodes() {
      try {
        const { data, error } = await supabase
          .from('podcast_episodes')
          .select('*')
          .eq('is_published', true)
          .order('episode_number', { ascending: false })

        if (error) throw error

        // Transform to match component expectations
        const transformedEpisodes = data.map(ep => ({
          id: ep.id,
          title: ep.title,
          date: ep.published_at || ep.created_at,
          audioUrl: ep.audio_url,
          description: ep.description
        }))

        setEpisodes(transformedEpisodes)
      } catch (err) {
        console.error('Error fetching podcast episodes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEpisodes()
  }, [])

  const togglePlay = (episodeId) => {
    const audio = audioRefs.current[episodeId]
    if (!audio || !episodes.find(e => e.id === episodeId)?.audioUrl) return

    // Pause any other playing episode
    if (playingEpisodeId && playingEpisodeId !== episodeId) {
      const otherAudio = audioRefs.current[playingEpisodeId]
      if (otherAudio) {
        otherAudio.pause()
      }
    }

    if (playingEpisodeId === episodeId) {
      audio.pause()
      setPlayingEpisodeId(null)
    } else {
      audio.play()
      setPlayingEpisodeId(episodeId)
    }
  }

  const handleStop = (episodeId) => {
    const audio = audioRefs.current[episodeId]
    if (!audio) return

    audio.pause()
    audio.currentTime = 0
    setPlayingEpisodeId(null)
    setCurrentTimes(prev => ({ ...prev, [episodeId]: 0 }))
  }

  const handleTimeUpdate = (episodeId) => {
    const audio = audioRefs.current[episodeId]
    if (audio) {
      setCurrentTimes(prev => ({ ...prev, [episodeId]: audio.currentTime }))
    }
  }

  const handleLoadedMetadata = (episodeId) => {
    const audio = audioRefs.current[episodeId]
    if (audio) {
      setDurations(prev => ({ ...prev, [episodeId]: audio.duration }))
    }
  }

  const handleEnded = (episodeId) => {
    if (playingEpisodeId === episodeId) {
      setPlayingEpisodeId(null)
    }
  }

  const handleSeek = (episodeId, value) => {
    const audio = audioRefs.current[episodeId]
    const duration = durations[episodeId]
    if (audio && duration) {
      const seekTime = (value / 100) * duration
      audio.currentTime = seekTime
      setCurrentTimes(prev => ({ ...prev, [episodeId]: seekTime }))
    }
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleDismissBanner = () => {
    setShowBanner(false)
    markAllAsRead()
  }

  if (loading) {
    return (
      <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center py-12 text-muted-foreground">
          Loading episodes...
        </div>
      </PageContainer>
    )
  }

  if (episodes.length === 0) {
    return (
      <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No podcast episodes available yet. Check back soon!
          </p>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      {/* New Episode Banner */}
      <AnimatePresence>
        {showBanner && unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <Card className="p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-primary">
                      New Podcast {unreadCount > 1 ? 'Episodes' : 'Episode'} Available!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {unreadCount} {unreadCount > 1 ? 'episodes' : 'episode'} you haven't heard yet
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleDismissBanner}
                  className="h-8 w-8 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Episode List */}
      <motion.div
        className="space-y-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {episodes.map((episode) => {
          const isPlaying = playingEpisodeId === episode.id
          const currentTime = currentTimes[episode.id] || 0
          const duration = durations[episode.id] || 0
          const progress = duration ? (currentTime / duration) * 100 : 0

          return (
            <motion.div
              key={episode.id}
              variants={staggerItem}
            >
              <Card className="p-6">
                {/* Episode Header: Date and Title */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-muted-foreground text-center leading-tight">
                    <div>{new Date(episode.date).toLocaleDateString('en-US', { month: 'short' })}</div>
                    <div>{new Date(episode.date).toLocaleDateString('en-US', { year: 'numeric' })}</div>
                  </div>
                  <h3 className="text-lg font-bold text-right flex-1 ml-4">{episode.title}</h3>
                </div>

                {/* Play Controls */}
                <div className="space-y-3">
                  {/* Play/Pause/Stop Buttons and Slider */}
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {/* Play/Pause Button */}
                      <motion.button
                        whileHover={episode.audioUrl ? { scale: 1.05 } : {}}
                        whileTap={episode.audioUrl ? { scale: 0.95 } : {}}
                        onClick={() => episode.audioUrl && togglePlay(episode.id)}
                        disabled={!episode.audioUrl}
                        className={`h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-colors flex-shrink-0 ${
                          episode.audioUrl
                            ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                            : 'bg-muted cursor-not-allowed'
                        }`}
                      >
                        {isPlaying ? (
                          <Pause className={`h-4 w-4 ${episode.audioUrl ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        ) : (
                          <Play className={`h-4 w-4 ml-0.5 ${episode.audioUrl ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        )}
                      </motion.button>

                      {/* Stop Button */}
                      <motion.button
                        whileHover={episode.audioUrl ? { scale: 1.05 } : {}}
                        whileTap={episode.audioUrl ? { scale: 0.95 } : {}}
                        onClick={() => episode.audioUrl && handleStop(episode.id)}
                        disabled={!episode.audioUrl}
                        className={`h-9 w-9 rounded-full flex items-center justify-center shadow-md transition-colors flex-shrink-0 ${
                          episode.audioUrl
                            ? 'bg-primary hover:bg-primary/90 cursor-pointer'
                            : 'bg-muted cursor-not-allowed'
                        }`}
                      >
                        <Square className={`h-4 w-4 ${episode.audioUrl ? 'text-primary-foreground' : 'text-muted-foreground'}`} fill="currentColor" />
                      </motion.button>
                    </div>

                    {/* Progress Slider */}
                    <div className="flex-1 space-y-1">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress}
                        onChange={(e) => episode.audioUrl && handleSeek(episode.id, e.target.value)}
                        disabled={!episode.audioUrl}
                        className={`w-full h-1 rounded-lg appearance-none ${episode.audioUrl ? 'cursor-pointer' : 'cursor-not-allowed'} bg-muted`}
                        style={{
                          background: episode.audioUrl
                            ? `linear-gradient(to right, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%)`
                            : 'hsl(var(--muted))'
                        }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hidden Audio Element */}
                  {episode.audioUrl && (
                    <audio
                      ref={(el) => {
                        if (el) audioRefs.current[episode.id] = el
                      }}
                      src={episode.audioUrl}
                      onTimeUpdate={() => handleTimeUpdate(episode.id)}
                      onLoadedMetadata={() => handleLoadedMetadata(episode.id)}
                      onEnded={() => handleEnded(episode.id)}
                    />
                  )}
                </div>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
    </PageContainer>
  )
}
