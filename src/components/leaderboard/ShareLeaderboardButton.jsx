import { useState, useRef } from 'react'
import { Share2, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import ShareableLeaderboard from './ShareableLeaderboard'
import ShareLeaderboardModal from './ShareLeaderboardModal'
import { useToast } from '@/hooks/use-toast'

/**
 * ShareLeaderboardButton Component
 *
 * Renders a share button that:
 * 1. Generates image on first click (shows spinner during generation)
 * 2. Opens modal with image preview and Share button
 * 3. Share button in modal opens native share sheet (fresh user gesture!)
 */
export default function ShareLeaderboardButton({ players, eventName }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const cachedBlobRef = useRef(null)
  const generatingRef = useRef(false)
  const { toast } = useToast()

  const generateImage = async () => {
    // Prevent duplicate generation
    if (generatingRef.current || cachedBlobRef.current) {
      return
    }

    generatingRef.current = true

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
        setTimeout(resolve, 150)
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

      cachedBlobRef.current = blob
    } catch (error) {
      console.error('Error generating image:', error)
    } finally {
      generatingRef.current = false
    }
  }

  const handleShare = async () => {
    if (!players || players.length === 0) {
      toast({
        title: 'No data to share',
        description: 'The leaderboard is empty for this event.',
        variant: 'destructive'
      })
      return
    }

    setIsGenerating(true)

    try {
      // Generate image if not cached (show spinner during generation)
      if (!cachedBlobRef.current) {
        await generateImage()

        if (!cachedBlobRef.current) {
          toast({
            title: 'Generation failed',
            description: 'Could not generate leaderboard image.',
            variant: 'destructive'
          })
          return
        }
      }

      // Open modal with image preview
      setShowModal(true)
    } catch (error) {
      console.error('Error generating leaderboard:', error)

      toast({
        title: 'Generation failed',
        description: error.message || 'Could not generate leaderboard image.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <button
        onClick={handleShare}
        disabled={isGenerating || !players || players.length === 0}
        className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={isGenerating ? "Generating image..." : "Share leaderboard"}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline text-xs">Generating...</span>
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </>
        )}
      </button>

      {/* Share Modal */}
      <ShareLeaderboardModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        imageBlob={cachedBlobRef.current}
        eventName={eventName}
      />
    </>
  )
}
