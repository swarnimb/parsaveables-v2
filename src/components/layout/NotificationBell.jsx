import { useState, useEffect } from 'react'
import { Bell, Trophy, Swords, TrendingUp, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { features } from '@/config/features'

export default function NotificationBell() {
  const { player } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // PULP-related event types to filter out when feature is disabled
  const PULP_EVENT_TYPES = [
    'bet_won',
    'bet_lost',
    'challenge_issued',
    'challenge_accepted',
    'challenge_resolved',
    'advantage_purchased',
    'pulp_earned',
    'pulp_spent',
  ]

  useEffect(() => {
    async function fetchNotifications() {
      // Use player from useAuth hook instead of redundant auth check
      if (!player?.id) {
        setLoading(false)
        return
      }

      try {
        // Fetch recent activities for the logged-in player
        const { data, error } = await supabase
          .from('activity_feed')
          .select('*')
          .eq('player_id', player.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error

        // Filter out PULP-related notifications if feature is disabled
        let filteredData = data || []
        if (!features.pulpEconomy) {
          filteredData = filteredData.filter(n => !PULP_EVENT_TYPES.includes(n.event_type))
        }

        setNotifications(filteredData)
        // Count only unread notifications
        const unread = filteredData?.filter(n => !n.is_read).length || 0
        setUnreadCount(unread)
      } catch (err) {
        console.error('Error fetching notifications:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [player])

  const markAllAsRead = async () => {
    if (!player?.id || unreadCount === 0) return

    try {
      // Mark all unread notifications as read
      const { error } = await supabase
        .from('activity_feed')
        .update({ is_read: true })
        .eq('player_id', player.id)
        .eq('is_read', false)

      if (error) throw error

      // Update local state
      setNotifications(notifications.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Error marking notifications as read:', err)
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'new_round':
      case 'round_processed':
        return <Trophy className="h-4 w-4 text-green-500" />
      case 'bet_won':
      case 'bet_lost':
        return <Trophy className="h-4 w-4" />
      case 'challenge_issued':
      case 'challenge_accepted':
      case 'challenge_resolved':
        return <Swords className="h-4 w-4" />
      case 'advantage_purchased':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && markAllAsRead()}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 hover:bg-accent rounded-lg transition-colors"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />

          {/* Badge for unread count */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Recent Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {loading ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No notifications yet
          </div>
        ) : (
          notifications.map((notification) => {
            const isNewRound = notification.event_type === 'new_round' || notification.event_type === 'round_processed';

            if (isNewRound) {
              const roundId = notification.event_data?.round_id;
              return (
                <Link
                  key={notification.id}
                  to="/rounds"
                  state={{ expandRoundId: roundId }}
                >
                  <DropdownMenuItem className="flex items-start gap-3 py-3 cursor-pointer">
                    <div className="mt-0.5 text-muted-foreground">
                      {getActivityIcon(notification.event_type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm leading-tight">{notification.description}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(notification.created_at)}
                      </div>
                    </div>
                  </DropdownMenuItem>
                </Link>
              );
            }

            return (
              <DropdownMenuItem key={notification.id} className="flex items-start gap-3 py-3 cursor-default">
                <div className="mt-0.5 text-muted-foreground">
                  {getActivityIcon(notification.event_type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm leading-tight">{notification.description}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(notification.created_at)}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })
        )}

        <DropdownMenuSeparator />

        <Link to="/activity">
          <DropdownMenuItem className="text-center justify-center font-medium text-primary cursor-pointer">
            View All Activities
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
