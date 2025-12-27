import { useState, useEffect } from 'react'
import { Coins, Target, Swords, ShoppingCart, TrendingUp, Award } from 'lucide-react'
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
import PageContainer from '@/components/layout/PageContainer'
import { motion } from 'framer-motion'
import { scaleIn, pulse } from '@/utils/animations'

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
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Betting & PULP Shop</h1>
        <p className="text-muted-foreground">Place bets, challenge rivals, and buy power-ups</p>
      </div>

      {/* Premium PULP Balance Card */}
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="mb-8 relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 shadow-lg"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50"></div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              variants={pulse}
              animate="animate"
              className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center relative"
            >
              <div className="absolute inset-0 rounded-full bg-primary/30 blur-md"></div>
              <Coins className="h-8 w-8 text-primary relative z-10" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Your PULP Balance</p>
              <motion.p
                key={pulpBalance}
                initial={{ scale: 1.2, color: '#10b981' }}
                animate={{ scale: 1, color: 'inherit' }}
                className="text-4xl font-bold tracking-tight"
              >
                {loading ? '...' : pulpBalance?.toLocaleString() || '0'}
                <span className="text-lg font-semibold text-muted-foreground ml-2">PULPs</span>
              </motion.p>
            </div>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <TrendingUp className="h-4 w-4" />
            View History
          </a>
        </div>
      </motion.div>

      {/* Betting Sections */}
      <div className="space-y-4">
        {/* Predictions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Accordion type="single" collapsible>
            <AccordionItem value="predictions" className="border-2 border-blue-500/20 rounded-xl bg-gradient-to-br from-blue-500/5 to-background overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold">Predictions</h3>
                    <p className="text-sm text-muted-foreground">Bet on top 3 finishers • 2x payout for perfect match</p>
                  </div>
                  <Award className="h-5 w-5 text-blue-600 opacity-50" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <PredictionsSection
                  playerId={player?.id}
                  pulpBalance={pulpBalance}
                  onBetPlaced={() => {
                    setPulpBalance(prev => prev - 20)
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        {/* Challenges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Accordion type="single" collapsible>
            <AccordionItem value="challenges" className="border-2 border-red-500/20 rounded-xl bg-gradient-to-br from-red-500/5 to-background overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Swords className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold">Head-to-Head Challenges</h3>
                    <p className="text-sm text-muted-foreground">Battle rivals • Winner takes all • 50% cowardice tax</p>
                  </div>
                  <Award className="h-5 w-5 text-red-600 opacity-50" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <ChallengesSection
                  playerId={player?.id}
                  pulpBalance={pulpBalance}
                  onChallengeAction={() => {}}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        {/* Advantages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Accordion type="single" collapsible>
            <AccordionItem value="advantages" className="border-2 border-amber-500/20 rounded-xl bg-gradient-to-br from-amber-500/5 to-background overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold">Buy Advantages</h3>
                    <p className="text-sm text-muted-foreground">Power-ups for rounds • 24hr expiration • One per type</p>
                  </div>
                  <Award className="h-5 w-5 text-amber-600 opacity-50" />
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <AdvantagesSection
                  playerId={player?.id}
                  pulpBalance={pulpBalance}
                  onPurchase={(cost) => {
                    setPulpBalance(prev => prev - cost)
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      </div>
    </PageContainer>
  )
}
