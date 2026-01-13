import { useState } from 'react'
import { Share2, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import ShareableLeaderboard from './ShareableLeaderboard'
import { useToast } from '@/hooks/use-toast'

/**
 * ShareLeaderboardButton Component
 *
 * Renders a share button that:
 * 1. Generates an image of the leaderboard
 * 2. Uses Web Share API to share (or downloads as fallback)
 */
export default function ShareLeaderboardButton({ players, eventName }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  const generateImage = async () => {
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

    return { blob, canvas }
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
      // Generate the image
      const { blob } = await generateImage()

      // Download the image (most reliable method across all platforms)
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

      // Show success message
      toast({
        title: 'Image saved!',
        description: 'Leaderboard downloaded. You can now share it from your Photos/Downloads.',
        duration: 4000
      })
    } catch (error) {
      console.error('Error generating leaderboard:', error)

      toast({
        title: 'Generation failed',
        description: 'Could not generate leaderboard image.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={isGenerating || !players || players.length === 0}
      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Share leaderboard"
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      <span className="hidden sm:inline">Share</span>
    </button>
  )
}
