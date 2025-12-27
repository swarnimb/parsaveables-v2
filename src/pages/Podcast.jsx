import { useState, useEffect, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Mic2, Calendar, Clock, Download } from 'lucide-react'
import PageContainer from '@/components/layout/PageContainer'
import { Card } from '@/components/ui/card'
import { motion, AnimatePresence } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'

export default function Podcast() {
  const [episodes, setEpisodes] = useState([])
  const [currentEpisode, setCurrentEpisode] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const audioRef = useRef(null)

  // Mock podcast episodes (will be replaced with API call)
  useEffect(() => {
    const mockEpisodes = [
      {
        id: 1,
        title: 'December 2024 Recap: The Winter Championships',
        date: '2024-12-01',
        duration: 1845, // seconds (30:45)
        description: 'A thrilling recap of December\'s rounds featuring epic comebacks, crushing defeats, and the rise of new rivalries. Plus, we break down the top PULP earners and biggest achievement unlocks!',
        audioUrl: null, // Would be actual URL
        artwork: 'https://via.placeholder.com/400x400/10b981/ffffff?text=Dec+2024'
      },
      {
        id: 2,
        title: 'November 2024: The Great PULP Heist',
        date: '2024-11-01',
        duration: 1620, // 27:00
        description: 'November saw the most aggressive betting season yet. Who walked away rich, and who lost it all? We analyze the wildest challenges and the most controversial scorecard.',
        audioUrl: null,
        artwork: 'https://via.placeholder.com/400x400/3b82f6/ffffff?text=Nov+2024'
      },
      {
        id: 3,
        title: 'October 2024: Fall Golf & Falling Stocks',
        date: '2024-10-01',
        duration: 1560, // 26:00
        description: 'As the leaves fell, so did some egos. October brought beautiful courses and brutal rounds. Hear about the ace that shocked everyone and the meltdown that cost 500 PULPs.',
        audioUrl: null,
        artwork: 'https://via.placeholder.com/400x400/f59e0b/ffffff?text=Oct+2024'
      }
    ]
    setEpisodes(mockEpisodes)
    setCurrentEpisode(mockEpisodes[0])
  }, [])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => setDuration(audio.duration)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    if (!audioRef.current || !currentEpisode?.audioUrl) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (e) => {
    if (!audioRef.current) return
    const seekTime = (e.target.value / 100) * duration
    audioRef.current.currentTime = seekTime
    setCurrentTime(seekTime)
  }

  const handleVolumeChange = (e) => {
    if (!audioRef.current) return
    const newVolume = e.target.value / 100
    audioRef.current.volume = newVolume
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    if (isMuted) {
      audioRef.current.volume = volume || 0.5
      setIsMuted(false)
    } else {
      audioRef.current.volume = 0
      setIsMuted(true)
    }
  }

  const changePlaybackRate = () => {
    if (!audioRef.current) return
    const rates = [1, 1.25, 1.5, 2]
    const currentIndex = rates.indexOf(playbackRate)
    const nextRate = rates[(currentIndex + 1) % rates.length]
    audioRef.current.playbackRate = nextRate
    setPlaybackRate(nextRate)
  }

  const skipForward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 15, duration)
  }

  const skipBackward = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 15, 0)
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const selectEpisode = (episode) => {
    setCurrentEpisode(episode)
    setIsPlaying(false)
    setCurrentTime(0)
  }

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Mic2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">The Disc Golf Chronicles</h1>
        </div>
        <p className="text-muted-foreground">
          Monthly AI-generated recaps of your group's greatest moments, rivalries, and drama
        </p>
      </div>

      {/* Featured Episode Player */}
      {currentEpisode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10">
            <div className="grid md:grid-cols-[300px,1fr] gap-6 p-6">
              {/* Episode Artwork */}
              <div className="relative">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="aspect-square rounded-xl overflow-hidden shadow-xl border-2 border-border relative"
                >
                  <img
                    src={currentEpisode.artwork}
                    alt={currentEpisode.title}
                    className="w-full h-full object-cover"
                  />
                  {currentEpisode.audioUrl && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <button
                        onClick={togglePlay}
                        className="h-16 w-16 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="h-8 w-8 text-primary" />
                        ) : (
                          <Play className="h-8 w-8 text-primary ml-1" />
                        )}
                      </button>
                    </div>
                  )}
                  {!currentEpisode.audioUrl && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <p className="text-white text-sm font-semibold">Coming Soon</p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Episode Info & Controls */}
              <div className="flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{currentEpisode.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(currentEpisode.date).toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(currentEpisode.duration)}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {currentEpisode.description}
                  </p>
                </div>

                {/* Audio Player Controls */}
                {currentEpisode.audioUrl ? (
                  <div className="mt-6 space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={duration ? (currentTime / duration) * 100 : 0}
                        onChange={handleSeek}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
                        style={{
                          background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) ${(currentTime / duration) * 100}%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>

                    {/* Playback Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={skipBackward}
                          className="h-10 w-10 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
                        >
                          <SkipBack className="h-5 w-5" />
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={togglePlay}
                          className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center shadow-lg transition-colors"
                        >
                          {isPlaying ? (
                            <Pause className="h-6 w-6 text-primary-foreground" />
                          ) : (
                            <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                          )}
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={skipForward}
                          className="h-10 w-10 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors"
                        >
                          <SkipForward className="h-5 w-5" />
                        </motion.button>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Volume Control */}
                        <div className="flex items-center gap-2">
                          <button onClick={toggleMute} className="text-muted-foreground hover:text-foreground">
                            {isMuted ? (
                              <VolumeX className="h-5 w-5" />
                            ) : (
                              <Volume2 className="h-5 w-5" />
                            )}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={isMuted ? 0 : volume * 100}
                            onChange={handleVolumeChange}
                            className="w-20 h-1 rounded-lg appearance-none cursor-pointer bg-muted"
                          />
                        </div>

                        {/* Playback Speed */}
                        <button
                          onClick={changePlaybackRate}
                          className="px-3 py-1 rounded-md bg-muted hover:bg-muted/70 text-sm font-semibold transition-colors"
                        >
                          {playbackRate}x
                        </button>
                      </div>
                    </div>

                    <audio ref={audioRef} src={currentEpisode.audioUrl} />
                  </div>
                ) : (
                  <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border text-center">
                    <p className="text-sm text-muted-foreground">
                      Episode audio coming soon! Check back after the end of the month.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Episode List */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-4">All Episodes</h2>
      </div>

      <motion.div
        className="space-y-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {episodes.map((episode, index) => (
          <motion.div
            key={episode.id}
            variants={staggerItem}
            whileHover={{ scale: 1.01, x: 4 }}
          >
            <Card
              className={`p-4 cursor-pointer transition-all ${
                currentEpisode?.id === episode.id
                  ? 'border-2 border-primary bg-primary/5'
                  : 'border border-border hover:border-primary/30'
              }`}
              onClick={() => selectEpisode(episode)}
            >
              <div className="flex items-center gap-4">
                {/* Episode Number */}
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-white">#{episodes.length - index}</span>
                </div>

                {/* Episode Info */}
                <div className="flex-1">
                  <h3 className="font-bold mb-1">{episode.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(episode.date).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(episode.duration)}
                    </span>
                  </div>
                </div>

                {/* Play Button */}
                {episode.audioUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      selectEpisode(episode)
                      setTimeout(togglePlay, 100)
                    }}
                    className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                  >
                    <Play className="h-5 w-5 text-primary ml-0.5" />
                  </button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </PageContainer>
  )
}
