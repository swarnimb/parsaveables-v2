import { isDemoMode } from '@/lib/demoMode'

export default function DemoBanner() {
  if (!isDemoMode) return null

  return (
    <div className="w-full bg-amber-500 text-amber-950 text-[11px] sm:text-xs font-medium text-center px-3 py-1 whitespace-nowrap overflow-hidden">
      Demo · read-only ·{' '}
      <a
        href="https://github.com/swarnimb/parsaveables-v2"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-amber-900"
      >
        View on GitHub →
      </a>
    </div>
  )
}
