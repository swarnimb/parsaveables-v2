import { useState, useEffect } from 'react'
import { Coins } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import PredictionsSection from '@/components/betting/PredictionsSection'
import ChallengesSection from '@/components/betting/ChallengesSection'
import AdvantagesSection from '@/components/betting/AdvantagesSection'

export default function Betting() {
  const { player } = useAuth()
  const [pulpBalance, setPulpBalance] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch PULP balance
  useEffect(() => {
    async function fetchBalance() {
      if (!player?.id) return

      try {
        const { data, error } = await supabase
          .from('registered_players')
          .select('pulp_balance')
          .eq('id', player.id)
          .single()

        if (error) throw error
        setPulpBalance(data.pulp_balance)
      } catch (error) {
        console.error('Error fetching PULP balance:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
  }, [player])

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header with PULP Balance */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Betting & PULP Shop</h1>

        {/* PULP Balance Card */}
        <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Coins className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-2xl font-bold">
                {loading ? '...' : pulpBalance?.toLocaleString() || '0'} PULPs
              </p>
            </div>
          </div>
          <a
            href="/dashboard"
            className="text-sm text-primary hover:underline"
          >
            View History →
          </a>
        </div>
      </div>

      {/* Accordion Sections */}
      <Accordion type="single" collapsible className="space-y-4">
        {/* Predictions */}
        <AccordionItem value="predictions" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">🎯 Predictions</span>
              <span className="text-sm text-muted-foreground">Bet on top 3 finishers</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <PredictionsSection
              playerId={player?.id}
              pulpBalance={pulpBalance}
              onBetPlaced={() => {
                // Refresh balance after bet
                setPulpBalance(prev => prev - 20) // Optimistic update
              }}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Challenges */}
        <AccordionItem value="challenges" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">⚔️ Challenges</span>
              <span className="text-sm text-muted-foreground">Head-to-head battles</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <ChallengesSection
              playerId={player?.id}
              pulpBalance={pulpBalance}
              onChallengeAction={() => {
                // Refresh balance after challenge action
              }}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Advantages */}
        <AccordionItem value="advantages" className="border border-border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">🛒 Buy Advantages</span>
              <span className="text-sm text-muted-foreground">Power-ups for rounds</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <AdvantagesSection
              playerId={player?.id}
              pulpBalance={pulpBalance}
              onPurchase={(cost) => {
                // Refresh balance after purchase
                setPulpBalance(prev => prev - cost)
              }}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
