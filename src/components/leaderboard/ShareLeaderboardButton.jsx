import { useState, useEffect, useRef } from 'react'
import { Share2, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import ShareableLeaderboard from './ShareableLeaderboard'
import { useToast } from '@/hooks/use-toast'

/**
 * ShareLeaderboardButton Component
 *
 * Renders a share button that:
 * 1. Pre-generates an image of the leaderboard
 * 2. Uses Web Share API to share (immediate, no user gesture loss)
 */
export default function ShareLeaderboardButton({ players, eventName }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const cachedBlobRef = useRef(null)
  const { toast } = useToast()

  // Pre-generate image when players or event changes
  useEffect(() => {
    if (!players || players.length === 0) {
      setIsReady(false)
      cachedBlobRef.current = null
      return
    }

    let cancelled = false

    const generateImage = async () => {
      try {
        // Create a temporary container for the shareable leaderboard
        const container = document.createElement('div')
        container.style.position = 'absolute'
        container.style.left = '-9999px'
        container.style.top = '0'
        document.body.appendChild(container)

        // Render the ShareableLeaderboard component into the container
        const { createRoot } = await import('react-dom/client')
        const root = createRoot(container)

        await new Promise((resolve) => {
          root.render(
            <div style={{ background: 'white' }}>
              <ShareableLeaderboard players={players} eventName={eventName} />
            </div>
          )
          // Wait for render
          setTimeout(resolve, 100)
        })

        // Convert to canvas
        const element = container.querySelector('#shareable-leaderboard')
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
          logging: false,
          useCORS: true
        })

        // Convert canvas to blob
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/png', 1.0)
        })

        // Clean up
        root.unmount()
        document.body.removeChild(container)

        if (!cancelled) {
          cachedBlobRef.current = blob
          setIsReady(true)
        }
      } catch (error) {
        console.error('Error pre-generating image:', error)
        if (!cancelled) {
          setIsReady(false)
        }
      }
    }

    generateImage()

    return () => {
      cancelled = true
    }
  }, [players, eventName])

  const handleShare = async () => {
    if (!players || players.length === 0) {
      toast({
        title: 'No data to share',
        description: 'The leaderboard is empty for this event.',
        variant: 'destructive'
      })
      return
    }

    if (!cachedBlobRef.current || !isReady) {
      toast({
        title: 'Please wait',
        description: 'Image is still being generated...',
      })
      return
    }

    setIsGenerating(true)

    try {
      const blob = cachedBlobRef.current
      const file = new File([blob], `${eventName}-leaderboard.png`, { type: 'image/png' })

      // Check if Web Share API is available and can share files
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Share immediately - user gesture is preserved!
        await navigator.share({
          files: [file],
          title: `${eventName} - Leaderboard`,
          text: `Check out the ${eventName} leaderboard on ParSaveables!`
        })

        // Only show success toast after user completes share
        toast({
          title: 'Shared successfully!',
          description: 'Leaderboard image shared.'
        })
      } else {
        // Fallback: Download the image
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${eventName}-leaderboard.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Small delay to ensure download starts
        await new Promise(resolve => setTimeout(resolve, 100))
        URL.revokeObjectURL(url)

        toast({
          title: 'Downloaded!',
          description: 'Leaderboard saved to your device. Share it from your Photos/Gallery.',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error sharing leaderboard:', error)

      // Don't show error toast if user simply cancelled
      if (error.name === 'AbortError') {
        return
      }

      toast({
        title: 'Share failed',
        description: error.message || 'Could not share leaderboard image.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={isGenerating || !isReady || !players || players.length === 0}
      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={!isReady ? "Preparing image..." : "Share leaderboard"}
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : !isReady ? (
        <Loader2 className="w-4 h-4 animate-spin opacity-50" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Share</span>
    </button>
  )
}
