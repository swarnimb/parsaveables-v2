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

      // Try to share using Web Share API
      const file = new File([blob], `${eventName}-leaderboard.png`, { type: 'image/png' })

      // Check if Web Share API is available
      const canShareFiles = navigator.share && navigator.canShare && navigator.canShare({ files: [file] })

      console.log('Share API check:', {
        hasShare: !!navigator.share,
        hasCanShare: !!navigator.canShare,
        canShareFiles,
        userAgent: navigator.userAgent
      })

      if (canShareFiles) {
        // Wait for user to complete the entire share flow
        await navigator.share({
          files: [file],
          title: `${eventName} - Leaderboard`,
          text: `Check out the ${eventName} leaderboard on ParSaveables!`
        })

        // Only show success toast after share is fully complete
        toast({
          title: 'Shared successfully!',
          description: 'Leaderboard image shared.'
        })
      } else if (navigator.share) {
        // Browser supports share but not files - share as data URL
        const dataUrl = canvas.toDataURL('image/png')

        try {
          await navigator.share({
            title: `${eventName} - Leaderboard`,
            text: `Check out the ${eventName} leaderboard on ParSaveables!\n\nDownload the image from the link below:`,
            url: dataUrl
          })

          toast({
            title: 'Shared successfully!',
            description: 'Leaderboard link shared.'
          })
        } catch (shareError) {
          // Data URL might be too large, fallback to download
          console.error('Share with data URL failed:', shareError)
          throw new Error('Share not supported, downloading instead')
        }
      } else {
        // Fallback: Download the image
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${eventName}-leaderboard.png`
        link.click()
        URL.revokeObjectURL(url)

        toast({
          title: 'Downloaded!',
          description: 'Leaderboard saved to your device.'
        })
      }
    } catch (error) {
      console.error('Error sharing leaderboard:', error)

      // Don't show error toast if user simply cancelled the share
      if (error.name === 'AbortError') {
        // User cancelled - do nothing
        return
      }

      toast({
        title: 'Share failed',
        description: error.message || 'Could not generate leaderboard image.',
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
