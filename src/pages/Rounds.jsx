import { useState, useEffect } from 'react'
import { roundAPI } from '@/services/api'
import RoundCard from '@/components/rounds/RoundCard'
import PageContainer from '@/components/layout/PageContainer'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/utils/animations'
import { SkeletonCard } from '@/components/ui/skeleton'

export default function Rounds() {
  const [rounds, setRounds] = useState([])
  const [expandedRoundId, setExpandedRoundId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    roundAPI.getAllRounds()
      .then(setRounds)
      .catch(err => {
        console.error('Error fetching rounds:', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = (roundId) => {
    setExpandedRoundId(expandedRoundId === roundId ? null : roundId)
  }

  if (loading) {
    return (
      <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} className="h-20" />
          ))}
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="border border-destructive/20 bg-destructive/10 rounded-lg p-4">
          <p className="text-destructive">Error loading rounds: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">

      {rounds.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No rounds recorded yet.</p>
        </div>
      ) : (
        <motion.div
          className="space-y-2"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {rounds.map((round) => (
            <motion.div key={round.id} variants={staggerItem}>
              <RoundCard
              key={round.id}
              round={round}
              isExpanded={expandedRoundId === round.id}
              onToggle={() => handleToggle(round.id)}
            />
            </motion.div>
          ))}
        </motion.div>
      )}
    </PageContainer>
  )
}
