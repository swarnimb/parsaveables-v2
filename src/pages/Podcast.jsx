import { useState, useEffect, useRef } from 'react'
import { Play, Pause, Square } from 'lucide-react'
import PageContainer from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'

export default function Podcast() {
  const [episodes, setEpisodes] = useState([])
  const [playingEpisodeId, setPlayingEpisodeId] = useState(null)
  const [currentTimes, setCurrentTimes] = useState({})
  const [durations, setDurations] = useState({})
  const audioRefs = useRef({})

  // Mock podcast episodes (will be replaced with API call)
  useEffect(() => {
    const mockEpisodes = [
      {
        id: 1,
        title: 'The Ruckus so far',
        date: '2025-01-01',
        audioUrl: 'https://bcovevbtcdsgzbrieiin.supabase.co/storage/v1/object/public/podcast-episodes/ParSaveables-EP01.mp3',
      }
    ]
    setEpisodes(mockEpisodes)
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

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
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
