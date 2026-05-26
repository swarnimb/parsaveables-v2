import { isDemoMode } from '@/lib/demoMode'

export default function DemoBanner() {
  if (!isDemoMode) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 text-xs sm:text-sm font-medium">
      <div className="container mx-auto px-4 py-1.5 flex items-center justify-center gap-2 text-center">
        <span>Live demo with real data — interactions are disabled.</span>
        <a
          href="https://github.com/swarnimb/parsaveables-v2"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-amber-900"
        >
          View source on GitHub →
        </a>
      </div>
    </div>
  )
}
