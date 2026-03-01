import { useState, useEffect, useCallback } from 'react'
import {
  Coins, Target, Swords, ShoppingCart,
  TrendingUp, Award, ChevronDown, ChevronUp,
  Trophy, Zap, Lock, Timer
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/services/supabase'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import BlessingsSection from '@/components/pulps/BlessingsSection'
import ChallengesSection from '@/components/pulps/ChallengesSection'
import AdvantagesSection from '@/components/pulps/AdvantagesSection'
import PageContainer from '@/components/layout/PageContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { scaleIn, pulse } from '@/utils/animations'
import { useToast } from '@/hooks/use-toast'

const POLL_INTERVAL = 30000 // 30 seconds

export default function Pulps() {
  const { player } = useAuth()
  const { toast } = useToast()

  const [pulpBalance, setPulpBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [balanceExpanded, setBalanceExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openingWindow, setOpeningWindow] = useState(false)

  // Active window state (open or locked)
  const [activeWindow, setActiveWindow] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(null)

  // Fetch PULP balance
  useEffect(() => {
    if (!player?.id) return

    async function fetchBalance() {
      try {
        const { data, error } = await supabase
          .from('registered_players')
          .select('pulp_balance')
          .eq('id', player.id)
          .single()

        if (error) throw error
        setPulpBalance(data.pulp_balance)
      } catch (err) {
        console.error('Error fetching balance:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
  }, [player])

  // Fetch transaction history when expanded
  useEffect(() => {
    if (!balanceExpanded || !player?.id) return

    async function fetchTransactions() {
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

  // Poll for active window
  const fetchWindow = useCallback(async () => {
    try {
      const res = await fetch('/api/pulp/getWindow')
      const data = await res.json()

      if (data.success) {
        setActiveWindow(data.window)
        if (data.window?.status === 'open') {
          setSecondsLeft(data.window.secondsRemaining)
        } else {
          setSecondsLeft(null)
        }
      }
    } catch (err) {
      console.error('Error fetching window:', err)
    }
  }, [])

  useEffect(() => {
    fetchWindow()
    const interval = setInterval(fetchWindow, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchWindow])

  // Countdown timer for open window
  useEffect(() => {
    if (activeWindow?.status !== 'open' || secondsLeft === null) return

    if (secondsLeft <= 0) {
      // Window closed — re-fetch to get locked status
      fetchWindow()
      return
    }

    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, activeWindow?.status, fetchWindow])

  const handleOpenWindow = async () => {
    setOpeningWindow(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const res = await fetch('/api/pulp/openWindow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        }
      })

      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Failed to open window')

      setActiveWindow({ ...result.window, secondsRemaining: 300 })
      setSecondsLeft(300)

      toast({
        title: '⚡ PULPy Window Open!',
        description: 'You have 5 minutes to place blessings, challenges, and buy advantages.'
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to open window', description: err.message })
    } finally {
      setOpeningWindow(false)
    }
  }

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '--:--'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const getTransactionIcon = (type) => {
    const map = {
      round_participation: <TrendingUp className="h-4 w-4 text-blue-600" />,
      blessing_win_perfect: <Award className="h-4 w-4 text-green-600" />,
      blessing_win_partial: <Award className="h-4 w-4 text-yellow-600" />,
      blessing_loss: <Coins className="h-4 w-4 text-red-600" />,
      challenge_win: <Swords className="h-4 w-4 text-green-600" />,
      challenge_loss: <Swords className="h-4 w-4 text-red-600" />,
      challenge_declined_burn: <Swords className="h-4 w-4 text-orange-600" />,
      advantage_purchase: <ShoppingCart className="h-4 w-4 text-purple-600" />,
      beat_higher_ranked: <Trophy className="h-4 w-4 text-yellow-600" />,
      drs_bonus: <TrendingUp className="h-4 w-4 text-blue-500" />,
    }
    return map[type] || <Coins className="h-4 w-4 text-muted-foreground" />
  }

  const windowOpen = activeWindow?.status === 'open'
  const windowLocked = activeWindow?.status === 'locked'

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">

      {/* PULP Balance Card */}
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="mb-6 relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 shadow-lg"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-50" />

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
              <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
              <Coins className="h-8 w-8 text-primary relative z-10" />
            </motion.div>
            <div>
              <motion.p
                key={pulpBalance}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-4xl font-bold tracking-tight"
              >
                {loading ? '...' : pulpBalance?.toLocaleString() ?? '0'}
                <span className="text-lg font-semibold text-muted-foreground ml-2">PULPs</span>
              </motion.p>
            </div>
          </div>
          <div className="flex justify-end items-center gap-1 text-xs text-primary">
            View History
            {balanceExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </div>
        </div>

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
                  <p className="text-center text-sm text-muted-foreground py-4">No transactions yet</p>
                ) : (
                  transactions.slice(0, 6).map(txn => (
                    <div
                      key={txn.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${txn.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          {getTransactionIcon(txn.transaction_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{txn.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</p>
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

      {/* PULPy Window Status */}
      <div className="mb-6">
        {!activeWindow && (
          <div className="relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg">Open a PULPy Window</p>
                <p className="text-sm text-muted-foreground">You got 5 minutes</p>
              </div>
              <Button onClick={handleOpenWindow} disabled={openingWindow} className="shrink-0">
                <Zap className="h-4 w-4 mr-1" />
                {openingWindow ? 'Opening...' : 'Open Window'}
              </Button>
            </div>
          </div>
        )}

        {windowOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-background to-primary/5 shadow-lg shadow-primary/20 p-5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-60" />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center shrink-0"
              >
                <Timer className="h-7 w-7 text-primary" />
              </motion.div>
              <div className="flex-1">
                <p className="font-bold text-xl text-primary">Window Open!</p>
                <p className="text-3xl font-mono font-bold">{formatTime(secondsLeft)}</p>
                <p className="text-xs text-muted-foreground">All sections unlocked below</p>
              </div>
            </div>
          </motion.div>
        )}

        {windowLocked && (
          <div className="relative overflow-hidden rounded-xl border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-background to-orange-500/5 p-5">
            <div className="flex items-center gap-4">
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="h-14 w-14 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0"
              >
                <Lock className="h-7 w-7 text-orange-600" />
              </motion.div>
              <div>
                <p className="font-bold text-lg text-orange-600">Window Locked</p>
                <p className="text-sm text-muted-foreground">Awaiting matched scorecard — blessings &amp; challenges will settle automatically</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Blessings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Accordion type="single" collapsible>
            <AccordionItem value="blessings" className="border-2 border-blue-500/20 rounded-xl bg-gradient-to-br from-blue-500/5 to-background overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold">Give a Blessing</h3>
                    <p className="text-sm text-muted-foreground">Bless 3 players — double your offerings</p>
                  </div>
                  {!windowOpen && <Badge variant="outline" className="text-xs shrink-0">Window required</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <BlessingsSection
                  playerId={player?.id}
                  pulpBalance={pulpBalance}
                  window={activeWindow}
                  onBlessingPlaced={(cost) => setPulpBalance(prev => prev - cost)}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        {/* Challenges */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Accordion type="single" collapsible>
            <AccordionItem value="challenges" className="border-2 border-red-500/20 rounded-xl bg-gradient-to-br from-red-500/5 to-background overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Swords className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold">Challenge a Rival</h3>
                    <p className="text-sm text-muted-foreground">Feeling confident? — challenge the villain</p>
                  </div>
                  {!windowOpen && <Badge variant="outline" className="text-xs shrink-0">Window required</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <ChallengesSection
                  playerId={player?.id}
                  pulpBalance={pulpBalance}
                  window={activeWindow}
                  onChallengeAction={() => {}}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>

        {/* Advantages */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Accordion type="single" collapsible>
            <AccordionItem value="advantages" className="border-2 border-amber-500/20 rounded-xl bg-gradient-to-br from-amber-500/5 to-background overflow-hidden">
              <AccordionTrigger className="hover:no-underline px-6 py-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <ShoppingCart className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-lg font-bold">Buy Advantages</h3>
                    <p className="text-sm text-muted-foreground">No shame in using some help</p>
                  </div>
                  {!windowOpen && <Badge variant="outline" className="text-xs shrink-0">Window required</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <AdvantagesSection
                  playerId={player?.id}
                  pulpBalance={pulpBalance}
                  window={activeWindow}
                  onPurchase={(cost) => setPulpBalance(prev => prev - cost)}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      </div>
    </PageContainer>
  )
}
