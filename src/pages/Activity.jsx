import { useState, useEffect } from 'react'
import { User, Users, Trophy, Swords, Coins, Target, Calendar, Mic2, TrendingUp, TrendingDown, ShoppingCart, Gift, DollarSign, Award, XCircle, Ban } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import PageContainer from '@/components/layout/PageContainer'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem, cardHover } from '@/utils/animations'
import { SkeletonCard } from '@/components/ui/skeleton'

export default function Activity() {
  const [activeTab, setActiveTab] = useState('player')
  const [player, setPlayer] = useState(null)
  const [playerFeed, setPlayerFeed] = useState([])
  const [communityFeed, setCommunityFeed] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch current player
  useEffect(() => {
    async function fetchPlayer() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: playerData } = await supabase
          .from('registered_players')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setPlayer(playerData)
      } catch (err) {
        console.error('Error fetching player:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlayer()
  }, [])

  // Fetch player-specific feed
  useEffect(() => {
    async function fetchPlayerFeed() {
      if (!player || activeTab !== 'player') return

      try {
        // Fetch player's recent transactions
        const { data: transactions } = await supabase
          .from('pulp_transactions')
          .select('*')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // Fetch player's recent bets
        const { data: bets } = await supabase
          .from('bets')
          .select(`
            *,
            round:rounds(date, course_name)
          `)
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })
          .limit(5)

        // Fetch player's recent challenges (issued or received)
        const { data: challenges } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:registered_players!challenges_challenger_id_fkey(player_name),
            challenged:registered_players!challenges_challenged_id_fkey(player_name),
            round:rounds(date, course_name)
          `)
          .or(`challenger_id.eq.${player.id},challenged_id.eq.${player.id}`)
          .order('issued_at', { ascending: false })
          .limit(5)

        // Combine and sort feed items
        const feed = []

        transactions?.forEach(txn => {
          feed.push({
            id: `txn-${txn.id}`,
            type: 'transaction',
            timestamp: new Date(txn.created_at),
            data: txn
          })
        })

        bets?.forEach(bet => {
          feed.push({
            id: `bet-${bet.id}`,
            type: 'bet',
            timestamp: new Date(bet.created_at),
            data: bet
          })
        })

        challenges?.forEach(challenge => {
          feed.push({
            id: `challenge-${challenge.id}`,
            type: 'challenge',
            timestamp: new Date(challenge.issued_at),
            data: challenge
          })
        })

        // Sort by timestamp descending
        feed.sort((a, b) => b.timestamp - a.timestamp)
        setPlayerFeed(feed.slice(0, 20))
      } catch (err) {
        console.error('Error fetching player feed:', err)
      }
    }

    fetchPlayerFeed()
  }, [player, activeTab])

  // Fetch community feed
  useEffect(() => {
    async function fetchCommunityFeed() {
      if (activeTab !== 'community') return

      try {
        // Fetch recent rounds
        const { data: rounds } = await supabase
          .from('rounds')
          .select('*')
          .order('date', { ascending: false })
          .limit(5)

        // Fetch recent challenges
        const { data: challenges } = await supabase
          .from('challenges')
          .select(`
            *,
            challenger:registered_players!challenges_challenger_id_fkey(player_name),
            challenged:registered_players!challenges_challenged_id_fkey(player_name),
            round:rounds(date, course_name)
          `)
          .order('issued_at', { ascending: false })
          .limit(10)

        // Fetch recent achievement unlocks (simulated - would need achievement_unlocks table)
        // For now, we'll just show recent transactions with achievement types
        const { data: achievementTxns } = await supabase
          .from('pulp_transactions')
          .select(`
            *,
            player:registered_players(player_name)
          `)
          .eq('transaction_type', 'achievement_unlock')
          .order('created_at', { ascending: false })
          .limit(10)

        // Combine and sort feed items
        const feed = []

        rounds?.forEach(round => {
          feed.push({
            id: `round-${round.id}`,
            type: 'round',
            timestamp: new Date(round.created_at || round.date),
            data: round
          })
        })

        challenges?.forEach(challenge => {
          feed.push({
            id: `challenge-${challenge.id}`,
            type: 'challenge',
            timestamp: new Date(challenge.issued_at),
            data: challenge
          })
        })

        achievementTxns?.forEach(txn => {
          feed.push({
            id: `achievement-${txn.id}`,
            type: 'achievement',
            timestamp: new Date(txn.created_at),
            data: txn
          })
        })

        // Sort by timestamp descending
        feed.sort((a, b) => b.timestamp - a.timestamp)
        setCommunityFeed(feed.slice(0, 20))
      } catch (err) {
        console.error('Error fetching community feed:', err)
      }
    }

    fetchCommunityFeed()
  }, [activeTab])

  const renderFeedItem = (item, isPlayerFeed = false) => {
    const { type, timestamp, data } = item

    // Transaction item
    if (type === 'transaction') {
      const icon = getTransactionIcon(data.transaction_type)
      const color = data.amount > 0 ? 'text-green-600' : 'text-red-600'

      return (
        <motion.div
          key={item.id}
          variants={staggerItem}
          whileHover={cardHover.hover}
        >
          <Card className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
              <p className="font-medium">{data.description}</p>
              <p className="text-sm text-muted-foreground">
                {formatTimestamp(timestamp)}
              </p>
            </div>
            <Badge variant={data.amount > 0 ? 'default' : 'secondary'} className={color}>
              {data.amount > 0 ? '+' : ''}{data.amount} PULPs
            </Badge>
          </div>
        </Card>
        </motion.div>
      )
    }

    // Bet item
    if (type === 'bet') {
      return (
        <motion.div
          key={item.id}
          variants={staggerItem}
          whileHover={cardHover.hover}
        >
          <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {isPlayerFeed ? 'You placed a bet' : `${player?.player_name} placed a bet`}
              </p>
              <p className="text-sm text-muted-foreground">
                {data.round?.date} - {data.round?.course_name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(timestamp)}
              </p>
            </div>
            <Badge variant={
              data.status === 'won' ? 'default' :
              data.status === 'lost' ? 'secondary' :
              'outline'
            }>
              {data.status}
            </Badge>
          </div>
        </Card>
        </motion.div>
      )
    }

    // Challenge item
    if (type === 'challenge') {
      const isChallenger = player && data.challenger_id === player.id
      const opponentName = isChallenger ? data.challenged?.player_name : data.challenger?.player_name

      return (
        <motion.div
          key={item.id}
          variants={staggerItem}
          whileHover={cardHover.hover}
        >
          <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Swords className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {isPlayerFeed
                  ? isChallenger
                    ? `You challenged ${opponentName}`
                    : `${data.challenger?.player_name} challenged you`
                  : `${data.challenger?.player_name} challenged ${data.challenged?.player_name}`
                }
              </p>
              <p className="text-sm text-muted-foreground">
                {data.round?.date} - {data.round?.course_name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Wager: {data.wager_amount} PULPs • {formatTimestamp(timestamp)}
              </p>
            </div>
            <Badge variant={
              data.status === 'accepted' ? 'default' :
              data.status === 'rejected' ? 'secondary' :
              data.status === 'won' ? 'default' :
              'outline'
            }>
              {data.status}
            </Badge>
          </div>
        </Card>
        </motion.div>
      )
    }

    // Achievement item
    if (type === 'achievement') {
      return (
        <motion.div
          key={item.id}
          variants={staggerItem}
          whileHover={cardHover.hover}
        >
          <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {data.player?.player_name} unlocked an achievement
              </p>
              <p className="text-sm text-muted-foreground">
                {data.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(timestamp)}
              </p>
            </div>
            <Badge variant="default">
              +{data.amount} PULPs
            </Badge>
          </div>
        </Card>
        </motion.div>
      )
    }

    // Round item
    if (type === 'round') {
      return (
        <motion.div
          key={item.id}
          variants={staggerItem}
          whileHover={cardHover.hover}
        >
          <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">New Round: {data.course_name}</p>
              <p className="text-sm text-muted-foreground">
                {data.date}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(timestamp)}
              </p>
            </div>
          </div>
        </Card>
        </motion.div>
      )
    }

    return null
  }

  const getTransactionIcon = (type) => {
    const iconMap = {
      'achievement_unlock': <Trophy className="h-5 w-5 text-yellow-600" />,
      'round_placement': <TrendingUp className="h-5 w-5 text-blue-600" />,
      'bet_win': <Coins className="h-5 w-5 text-green-600" />,
      'bet_win_perfect': <Award className="h-5 w-5 text-green-600" />,
      'bet_loss': <XCircle className="h-5 w-5 text-red-600" />,
      'challenge_win': <Swords className="h-5 w-5 text-green-600" />,
      'challenge_loss': <TrendingDown className="h-5 w-5 text-red-600" />,
      'challenge_reject': <Ban className="h-5 w-5 text-orange-600" />,
      'challenge_rejected_penalty': <Ban className="h-5 w-5 text-orange-600" />,
      'advantage_purchase': <ShoppingCart className="h-5 w-5 text-purple-600" />,
      'weekly_bonus': <Gift className="h-5 w-5 text-blue-600" />
    }
    return iconMap[type] || <DollarSign className="h-5 w-5 text-muted-foreground" />
  }

  const formatTimestamp = (timestamp) => {
    const now = new Date()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return timestamp.toLocaleDateString()
  }

  if (loading) {
    return (
      <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Activity Feed</h1>
          <p className="text-muted-foreground">
            Stay updated on your progress and group activity
          </p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Activity Feed</h1>
        <p className="text-muted-foreground">
          Stay updated on your progress and group activity
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="player" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Your Activity
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Community
          </TabsTrigger>
        </TabsList>

        {/* Player Feed Tab */}
        <TabsContent value="player">
          {playerFeed.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No activity yet. Place some bets or play a round to get started!
              </p>
            </Card>
          ) : (
            <motion.div
              className="space-y-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {playerFeed.map(item => renderFeedItem(item, true))}
            </motion.div>
          )}
        </TabsContent>

        {/* Community Feed Tab */}
        <TabsContent value="community">
          {communityFeed.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                No community activity yet. Check back soon!
              </p>
            </Card>
          ) : (
            <motion.div
              className="space-y-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {communityFeed.map(item => renderFeedItem(item, false))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
