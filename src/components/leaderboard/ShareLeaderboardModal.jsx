import { Share2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

export default function ShareLeaderboardModal({ isOpen, onClose, imageBlob, eventName }) {
  const { toast } = useToast()

  const handleShare = async () => {
    if (!imageBlob) return

    const file = new File([imageBlob], `${eventName}-leaderboard.png`, { type: 'image/png' })

    // This should work because it's called directly from a user click event
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${eventName} - Leaderboard`,
          text: `Check out the ${eventName} leaderboard on ParSaveables!`
        })

        toast({
          title: 'Shared successfully!',
          description: 'Leaderboard image shared.'
        })

        onClose()
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Share error:', error)
          toast({
            title: 'Share failed',
            description: 'Please try long-pressing the image to share.',
            variant: 'destructive'
          })
        }
      }
    } else {
      // Fallback: download
      const url = URL.createObjectURL(imageBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${eventName}-leaderboard.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Downloaded!',
        description: 'Image saved to your device.',
      })

      onClose()
    }
  }

  const imageUrl = imageBlob ? URL.createObjectURL(imageBlob) : null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        <DialogHeader>
          <DialogTitle>Share Leaderboard</DialogTitle>
        </DialogHeader>

        {imageUrl && (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="border border-border rounded-lg overflow-hidden bg-white">
              <img
                src={imageUrl}
                alt={`${eventName} Leaderboard`}
                className="w-full h-auto"
              />
            </div>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Share2 className="w-5 h-5" />
              Share Image
            </button>

            {/* Instructions for mobile */}
            <p className="text-xs text-muted-foreground text-center">
              Or long-press the image above to share
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
