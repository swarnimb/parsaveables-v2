import { motion } from "framer-motion"

export function Skeleton({ className = "", variant = "default" }) {
  const variants = {
    default: "h-4 w-full",
    circle: "h-12 w-12 rounded-full",
    card: "h-32 w-full rounded-lg",
    text: "h-4 w-3/4",
    button: "h-10 w-24 rounded-md"
  }

  return (
    <motion.div
      className={`bg-muted rounded-md relative overflow-hidden ${variants[variant]} ${className}`}
      animate={{
        backgroundPosition: ['200% 0', '-200% 0']
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear"
      }}
      style={{
        backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        backgroundSize: '200% 100%'
      }}
    />
  )
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`border border-border rounded-lg p-4 ${className}`}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Table header */}
      <div className="bg-muted p-4 flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Table rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-t border-border p-4 flex gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonPodium() {
  return (
    <div className="grid grid-cols-3 gap-4 items-end max-w-2xl mx-auto mb-8">
      {/* 2nd place */}
      <div className="text-center">
        <Skeleton variant="card" className="h-32 mb-2" />
        <Skeleton className="h-12 rounded-t-lg" />
      </div>
      {/* 1st place */}
      <div className="text-center">
        <Skeleton variant="card" className="h-40 mb-2" />
        <Skeleton className="h-16 rounded-t-lg" />
      </div>
      {/* 3rd place */}
      <div className="text-center">
        <Skeleton variant="card" className="h-28 mb-2" />
        <Skeleton className="h-8 rounded-t-lg" />
      </div>
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Skeleton variant="circle" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
