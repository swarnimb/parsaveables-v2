import { useState, useEffect } from 'react'
import { Lock, Unlock, Calendar } from 'lucide-react'
import { supabase } from '@/services/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function BettingControlsModal({ trigger }) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fetch upcoming events with betting status
  useEffect(() => {
    async function fetchEvents() {
      if (!open) return

      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, name, start_date, end_date, betting_lock_time')
          .gte('end_date', new Date().toISOString().split('T')[0])
          .order('start_date', { ascending: true })
          .limit(10)

        if (error) throw error
        setEvents(data || [])
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events')
      }
    }

    fetchEvents()
  }, [open])

  const handleLockBetting = async (eventId) => {
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch('/api/pulp/lockBetting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({ eventId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to lock betting')
      }

      setSuccess(`Betting locked! ${result.betsLocked} bet(s) locked.`)

      // Update local state
      setEvents(prev => prev.map(event =>
        event.id === eventId
          ? { ...event, betting_lock_time: new Date().toISOString() }
          : event
      ))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isBettingLocked = (event) => {
    return event.betting_lock_time && new Date(event.betting_lock_time) < new Date()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Betting Controls</DialogTitle>
          <DialogDescription>
            Lock betting for upcoming events. Locked bets cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Info Box */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-2">How It Works</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Lock betting before round starts (recommended 15 min after start)</li>
              <li>All pending bets become locked (unchangeable)</li>
              <li>Players can no longer place new bets</li>
              <li>Bets auto-resolve when round completes</li>
            </ul>
          </div>

          {/* Events List */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 text-green-600 rounded-lg p-3 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No upcoming events found
              </div>
            ) : (
              events.map(event => {
                const locked = isBettingLocked(event)

                return (
                  <div
                    key={event.id}
                    className="border border-border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{event.name}</h3>
                          <Badge variant={locked ? 'secondary' : 'default'}>
                            {locked ? (
                              <>
                                <Lock className="h-3 w-3 mr-1" />
                                Locked
                              </>
                            ) : (
                              <>
                                <Unlock className="h-3 w-3 mr-1" />
                                Open
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(event.start_date).toLocaleDateString()} - {new Date(event.end_date).toLocaleDateString()}
                          </span>
                        </div>
                        {locked && event.betting_lock_time && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Locked at: {new Date(event.betting_lock_time).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {!locked ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleLockBetting(event.id)}
                            disabled={loading}
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            Lock Betting
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                          >
                            Already Locked
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Instructions */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-sm text-yellow-600 font-semibold mb-1">
              ⚠️ Important
            </p>
            <p className="text-sm text-muted-foreground">
              Locking is permanent for the event. Lock betting approximately 15 minutes after round start time to give players time to place last-minute bets.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
