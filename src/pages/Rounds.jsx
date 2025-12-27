import { useState, useEffect } from 'react'
import { roundAPI } from '@/services/api'
import RoundCard from '@/components/rounds/RoundCard'

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
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-muted-foreground">Loading rounds...</p>
      </div>
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
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Rounds</h1>

      {rounds.length === 0 ? (
        <div className="border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No rounds recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rounds.map((round) => (
            <RoundCard
              key={round.id}
              round={round}
              isExpanded={expandedRoundId === round.id}
              onToggle={() => handleToggle(round.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
