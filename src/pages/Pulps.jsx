import { useState, useEffect, useCallback } from 'react'
import {
  Coins, Target, Swords, ShoppingCart,
  TrendingUp, Award, ChevronDown, ChevronUp, ChevronRight,
  Trophy, Zap, Timer, Clock, User
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import BlessingsSection from '@/components/pulps/BlessingsSection'
import ChallengesSection from '@/components/pulps/ChallengesSection'
import AdvantagesSection from '@/components/pulps/AdvantagesSection'
import PageContainer from '@/components/layout/PageContainer'
import { motion, AnimatePresence } from 'framer-motion'
import { scaleIn, pulse } from '@/utils/animations'
import { useToast } from '@/hooks/use-toast'

const POLL_INTERVAL = 30000

export default function Pulps() {
  const { player } = useAuth()
  const { toast } = useToast()

  const [pulpBalance, setPulpBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [balanceExpanded, setBalanceExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openingWindow, setOpeningWindow] = useState(false)
  const [activeWindow, setActiveWindow] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(null)

  // Unresolved (locked) windows awaiting scorecard settlement
  const [unresolvedWindows, setUnresolvedWindows] = useState([])
  // id → player_name lookup for all registered players
  const [allPlayers, setAllPlayers] = useState({})
  // Modal state for viewing a window's transactions
  const [selectedWindowId, setSelectedWindowId] = useState(null)
  const [windowTxns, setWindowTxns] = useState({ blessings: [], challenges: [] })
  const [loadingTxns, setLoadingTxns] = useState(false)

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

  // Fetch transaction history (when balance card expanded)
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

  // Fetch all player names for use in lookups
  useEffect(() => {
    async function fetchPlayers() {
      const { data } = await supabase.from('registered_players').select('id, player_name')
      const map = {}
      data?.forEach(p => { map[p.id] = p.player_name })
      setAllPlayers(map)
    }
    fetchPlayers()
  }, [])

  // Fetch locked windows that haven't settled yet
  const fetchUnresolvedWindows = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('pulpy_windows')
        .select('id, opened_at, opened_by')
        .eq('status', 'locked')
        .order('opened_at', { ascending: false })
      setUnresolvedWindows(data || [])
    } catch (err) {
      console.error('Error fetching unresolved windows:', err)
    }
  }, [])

  // Poll for the current active window
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
          // If window just locked, refresh the unresolved list
          if (data.window?.status === 'locked') fetchUnresolvedWindows()
        }
      }
    } catch (err) {
      console.error('Error fetching window:', err)
    }
  }, [fetchUnresolvedWindows])

  useEffect(() => {
    fetchWindow()
    fetchUnresolvedWindows()
    const interval = setInterval(fetchWindow, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchWindow, fetchUnresolvedWindows])

  // Countdown timer — when it hits 0, immediately switch to base state
  // (don't wait for server to avoid getting stuck at 0:00)
  useEffect(() => {
    if (activeWindow?.status !== 'open' || secondsLeft === null) return
    if (secondsLeft <= 0) {
      setActiveWindow(w => w ? { ...w, status: 'locked' } : w)
      setSecondsLeft(null)
      fetchWindow()   // sync with server in background
      fetchUnresolvedWindows()
      return
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, activeWindow?.status, fetchWindow, fetchUnresolvedWindows])

  // Fetch transactions for selected window (shown in modal)
  useEffect(() => {
    if (!selectedWindowId) return
    setLoadingTxns(true)
    async function loadTxns() {
      const [{ data: blessings }, { data: challenges }] = await Promise.all([
        supabase.from('blessings').select('*').eq('window_id', selectedWindowId),
        supabase.from('challenges').select('*').eq('window_id', selectedWindowId),
      ])
      setWindowTxns({ blessings: blessings || [], challenges: challenges || [] })
      setLoadingTxns(false)
    }
    loadTxns()
  }, [selectedWindowId])

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

  const formatDateTime = (dateStr) => new Date(dateStr).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

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

  // Only 'open' is considered active — 'locked' falls back to base state
  const isWindowActive = activeWindow?.status === 'open'
  const selectedWindow = unresolvedWindows.find(w => w.id === selectedWindowId)

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
          className="relative z-10 p-5 cursor-pointer hover:bg-primary/5 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                variants={pulse}
                animate="animate"
                className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center relative"
              >
                <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
                <Coins className="h-6 w-6 text-primary relative z-10" />
              </motion.div>
              <motion.p
                key={pulpBalance}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-3xl font-bold tracking-tight"
              >
                {loading ? '...' : pulpBalance?.toLocaleString() ?? '0'}
                <span className="text-base font-semibold text-muted-foreground ml-2">PULPs</span>
              </motion.p>
            </div>
            <div className="flex items-center gap-1 text-xs text-primary">
              View History
              {balanceExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </div>
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

      {/* PULPy Window Section — single card with unresolved transactions extending below */}
      <div className={`mb-6 relative overflow-hidden rounded-xl border-2 transition-colors duration-300 ${
        isWindowActive
          ? 'border-primary bg-gradient-to-br from-primary/15 via-background to-primary/5 shadow-lg shadow-primary/20'
          : 'border-primary/20 bg-gradient-to-br from-primary/5 to-background'
      }`}>

        {/* Window opener (base state) or timer (active) */}
        {!isWindowActive ? (
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="font-bold text-lg">Open a PULPy Window</p>
              <p className="text-sm text-muted-foreground">You got 5 minutes</p>
            </div>
            <Button onClick={handleOpenWindow} disabled={openingWindow} className="shrink-0">
              <Zap className="h-4 w-4 mr-1" />
              {openingWindow ? 'Opening...' : 'Open Window'}
            </Button>
          </div>
        ) : (
          <div className="relative p-5">
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
          </div>
        )}

        {/* Unresolved Transactions — extends from bottom of same card */}
        {unresolvedWindows.length > 0 && (
          <div className="border-t border-orange-500/20 bg-orange-500/5">
            <div className="px-5 py-2.5">
              <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Unresolved Transactions</p>
            </div>
            <div className="divide-y divide-orange-500/10">
              {unresolvedWindows.map(win => (
                <button
                  key={win.id}
                  onClick={() => setSelectedWindowId(win.id)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-orange-500/10 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{formatDateTime(win.opened_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" />
                    <span>{allPlayers[win.opened_by] || '...'}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">

        {/* Single inactive label when no window is open */}
        {!isWindowActive && (
          <div className="flex items-center gap-2 px-1">
            <Badge variant="outline" className="border-muted text-muted-foreground text-xs">
              inactive
            </Badge>
            <p className="text-xs text-muted-foreground">Open a PULPy window to enable</p>
          </div>
        )}

        {/* Blessings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {isWindowActive ? (
            <Accordion type="single" collapsible>
              <AccordionItem value="blessings" className="border-2 rounded-xl bg-gradient-to-br border-blue-500/20 from-blue-500/5 to-background overflow-hidden">
                <AccordionTrigger className="hover:no-underline px-6 pt-4 pb-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-blue-500/20">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-lg font-bold">Give a Blessing</h3>
                      <p className="text-sm text-muted-foreground">Bless 3 players — double your offerings</p>
                    </div>
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
          ) : (
            <div className="border-2 rounded-xl border-muted/40 bg-gradient-to-br from-muted/5 to-background overflow-hidden opacity-50 pointer-events-none">
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-muted/30">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-lg font-bold">Give a Blessing</h3>
                  <p className="text-sm text-muted-foreground">Bless 3 players — double your offerings</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Challenges */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {isWindowActive ? (
            <Accordion type="single" collapsible>
              <AccordionItem value="challenges" className="border-2 rounded-xl bg-gradient-to-br border-red-500/20 from-red-500/5 to-background overflow-hidden">
                <AccordionTrigger className="hover:no-underline px-6 pt-4 pb-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-red-500/20">
                      <Swords className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-lg font-bold">Challenge a Rival</h3>
                      <p className="text-sm text-muted-foreground">Feeling confident? — challenge the villain</p>
                    </div>
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
          ) : (
            <div className="border-2 rounded-xl border-muted/40 bg-gradient-to-br from-muted/5 to-background overflow-hidden opacity-50 pointer-events-none">
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-muted/30">
                  <Swords className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-lg font-bold">Challenge a Rival</h3>
                  <p className="text-sm text-muted-foreground">Feeling confident? — challenge the villain</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Advantages */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          {isWindowActive ? (
            <Accordion type="single" collapsible>
              <AccordionItem value="advantages" className="border-2 rounded-xl bg-gradient-to-br border-amber-500/20 from-amber-500/5 to-background overflow-hidden">
                <AccordionTrigger className="hover:no-underline px-6 pt-4 pb-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-amber-500/20">
                      <ShoppingCart className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <h3 className="text-lg font-bold">Buy Advantages</h3>
                      <p className="text-sm text-muted-foreground">No shame in using some help</p>
                    </div>
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
          ) : (
            <div className="border-2 rounded-xl border-muted/40 bg-gradient-to-br from-muted/5 to-background overflow-hidden opacity-50 pointer-events-none">
              <div className="flex items-center gap-4 px-6 py-5">
                <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 bg-muted/30">
                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className="text-lg font-bold">Buy Advantages</h3>
                  <p className="text-sm text-muted-foreground">No shame in using some help</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Window Transaction Modal */}
      <Dialog open={!!selectedWindowId} onOpenChange={() => setSelectedWindowId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedWindow ? `Window — ${formatDateTime(selectedWindow.opened_at)}` : 'Transactions'}
            </DialogTitle>
          </DialogHeader>

          {loadingTxns ? (
            <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
          ) : (
            <div className="space-y-5 pt-2">
              {windowTxns.blessings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Blessings</p>
                  <div className="space-y-2">
                    {windowTxns.blessings.map(b => (
                      <div key={b.id} className="flex items-start justify-between rounded-lg border border-border p-3 text-sm gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">{allPlayers[b.player_id] || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            1st: {allPlayers[b.predictions?.first] || '?'} &middot;{' '}
                            2nd: {allPlayers[b.predictions?.second] || '?'} &middot;{' '}
                            3rd: {allPlayers[b.predictions?.third] || '?'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{b.wager_amount} PULPs</p>
                          <Badge variant="outline" className="text-[0.65rem] mt-1">{b.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {windowTxns.challenges.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Challenges</p>
                  <div className="space-y-2">
                    {windowTxns.challenges.map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm gap-3">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {allPlayers[c.challenger_id] || 'Unknown'}{' '}
                            <span className="text-muted-foreground">vs</span>{' '}
                            {allPlayers[c.challenged_id] || 'Unknown'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{c.wager_amount} PULPs</p>
                          <Badge variant="outline" className="text-[0.65rem] mt-1">{c.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {windowTxns.blessings.length === 0 && windowTxns.challenges.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No transactions in this window</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </PageContainer>
  )
}
