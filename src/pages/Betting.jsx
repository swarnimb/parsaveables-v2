import { useState, useEffect } from 'react'
import { Coins, Target, Swords, ShoppingCart, TrendingUp, Award, ChevronDown, ChevronUp, DollarSign, XCircle, Ban, Trophy, Gift, Lock, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import PredictionsSection from '@/components/betting/PredictionsSection'
import ChallengesSection from '@/components/betting/ChallengesSection'
import AdvantagesSection from '@/components/betting/AdvantagesSection'
import PageContainer from '@/components/layout/PageContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { scaleIn, pulse } from '@/utils/animations'
import ComingSoon from '@/components/betting/ComingSoon'
import { features } from '@/config/features'

export default function Betting() {
  const { player } = useAuth()

  // State hooks must be declared before any conditional returns
  const [pulpBalance, setPulpBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [balanceExpanded, setBalanceExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bettingLockTime, setBettingLockTime] = useState(null)
  const [timeRemaining, setTimeRemaining] = useState(null)

  // If PULP economy is disabled OR user confirmed interest, show Coming Soon
  if (!features.pulpEconomy || player?.betting_interest_confirmed) {
    return <ComingSoon />
  }

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

  // Fetch transactions when balance is expanded
  useEffect(() => {
    async function fetchTransactions() {
      if (!balanceExpanded || !player?.id) return

      try {
        const { data, error } = await supabase
          .from('pulp_transactions')
          .select('*')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) throw error
        setTransactions(data || [])
      } catch (err) {
        console.error('Error fetching transactions:', err)
      }
    }

    fetchTransactions()
  }, [balanceExpanded, player])

  // Fetch betting lock time from active event
  useEffect(() => {
    async function fetchBettingLockTime() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('betting_lock_time')
          .eq('is_active', true)
          .order('id')
          .limit(1)
          .single()

        if (error) {
          // If no active event, that's ok
          if (error.code === 'PGRST116') {
            setBettingLockTime(null)
            return
          }
          throw error
        }

        console.log('Fetched betting lock time:', data?.betting_lock_time)
        setBettingLockTime(data?.betting_lock_time || null)
      } catch (err) {
        console.error('Error fetching betting lock time:', err)
        setBettingLockTime(null)
      }
    }

    fetchBettingLockTime()

    // Refresh every 30 seconds to detect when lock is cleared
    const interval = setInterval(fetchBettingLockTime, 30000)
    return () => clearInterval(interval)
  }, [])

  // Update countdown timer every second
  useEffect(() => {
    if (!bettingLockTime) {
      setTimeRemaining(null)
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const lockTime = new Date(bettingLockTime)
      const diff = lockTime - now

      if (diff <= 0) {
        setTimeRemaining('locked')
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setTimeRemaining({ hours, minutes })
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [bettingLockTime])

  const getTransactionIcon = (type) => {
    const iconMap = {
      'achievement_unlock': <Trophy className="h-4 w-4 text-yellow-600" />,
      'round_placement': <TrendingUp className="h-4 w-4 text-blue-600" />,
      'bet_win': <Coins className="h-4 w-4 text-green-600" />,
      'bet_win_perfect': <Award className="h-4 w-4 text-green-600" />,
      'bet_loss': <XCircle className="h-4 w-4 text-red-600" />,
      'challenge_win': <Swords className="h-4 w-4 text-green-600" />,
      'challenge_loss': <TrendingUp className="h-4 w-4 text-red-600" />,
      'challenge_reject': <Ban className="h-4 w-4 text-orange-600" />,
      'challenge_rejected_penalty': <Ban className="h-4 w-4 text-orange-600" />,
      'advantage_purchase': <ShoppingCart className="h-4 w-4 text-purple-600" />,
      'weekly_bonus': <Gift className="h-4 w-4 text-blue-600" />
    }
    return iconMap[type] || <DollarSign className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Premium PULP Balance Card - Expandable */}
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="mb-8 relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 shadow-lg"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50"></div>

        {/* Clickable Balance Header */}
        <div
          onClick={() => setBalanceExpanded(!balanceExpanded)}
          className="relative z-10 p-6 cursor-pointer hover:bg-primary/5 transition-colors"
        >
          <div className="flex items-center gap-4 mb-2">
            <motion.div
              variants={pulse}
              animate="animate"
              className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center relative"
            >
              <div className="absolute inset-0 rounded-full bg-primary/30 blur-md"></div>
              <Coins className="h-8 w-8 text-primary relative z-10" />
            </motion.div>
            <div>
              <motion.p
                key={pulpBalance}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-4xl font-bold tracking-tight"
              >
                {loading ? '...' : pulpBalance?.toLocaleString() || '0'}
                <span className="text-lg font-semibold text-muted-foreground ml-2">PULPs</span>
              </motion.p>
            </div>
          </div>
          <div className="flex justify-end items-center gap-1 text-xs text-primary">
            View History
            {balanceExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </div>
        </div>

        {/* Expanded Transaction History */}
        <AnimatePresence>
          {balanceExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 overflow-hidden border-t border-primary/20"
            >
              <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                {transactions.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">
                    <p className="text-sm">No transactions yet</p>
                  </div>
                ) : (
                  transactions.slice(0, 6).map((txn) => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          txn.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {getTransactionIcon(txn.transaction_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{txn.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(txn.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={txn.amount > 0 ? 'default' : 'secondary'} className={txn.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Betting Timer/Lock Status */}
      <AnimatePresence>
        {timeRemaining && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {timeRemaining === 'locked' ? (
              /* Locked State - Pulsating Lock Icon */
              <div className="relative overflow-hidden rounded-xl border-2 border-red-500/30 bg-gradient-to-br from-red-500/10 via-background to-red-500/5 shadow-lg p-6">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent opacity-50"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut"
                    }}
                    className="h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center"
                  >
                    <Lock className="h-8 w-8 text-red-600" />
                  </motion.div>
                  <div>
                    <p className="text-xl font-bold text-red-600">Betting Locked</p>
                    <p className="text-sm text-muted-foreground">Round in progress</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Countdown Timer */
              <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5 shadow-lg p-6">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50"></div>
                <div className="relative z-10 flex items-center gap-4">
                  <motion.div
                    animate={{
                      rotate: [0, 360]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 60,
                      ease: "linear"
                    }}
                    className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center"
                  >
                    <Clock className="h-8 w-8 text-primary" />
                  </motion.div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Betting locks in</p>
                    <p className="text-3xl font-bold text-primary">
                      {timeRemaining.hours}h {timeRemaining.minutes}m
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
                    <p className="text-sm text-muted-foreground">Win 2x for perfect podium prediction</p>
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
                    <h3 className="text-lg font-bold">Challenge Your Rivals</h3>
                    <p className="text-sm text-muted-foreground">Challenge a higher ranked player, winner takes all</p>
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
                    <p className="text-sm text-muted-foreground">Enhance your performance for 24 hours</p>
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
