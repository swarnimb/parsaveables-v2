import { useState, useEffect } from 'react'
import { Lock, Calendar, Clock, XCircle } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageContainer from '@/components/layout/PageContainer'
import { useToast } from '@/hooks/use-toast'

export default function BettingControls() {
  const { toast } = useToast()
  const [roundDateTime, setRoundDateTime] = useState('')
  const [lockTime, setLockTime] = useState('')
  const [confirmedRoundTime, setConfirmedRoundTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [currentBettingLock, setCurrentBettingLock] = useState(null)
  const [isLocked, setIsLocked] = useState(false)

  // Fetch current betting lock time on mount and poll every 30 seconds
  useEffect(() => {
    async function fetchCurrentLock() {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('betting_lock_time')
          .eq('is_active', true)
          .order('id')
          .limit(1)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            setCurrentBettingLock(null)
            setIsLocked(false)
            return
          }
          throw error
        }

        if (data?.betting_lock_time) {
          setCurrentBettingLock(data.betting_lock_time)
          setIsLocked(true)
        } else {
          setCurrentBettingLock(null)
          setIsLocked(false)
        }
      } catch (err) {
        console.error('Error fetching betting lock:', err)
        setCurrentBettingLock(null)
        setIsLocked(false)
      }
    }

    fetchCurrentLock()

    // Poll every 30 seconds to detect when lock is auto-reset
    const interval = setInterval(fetchCurrentLock, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-calculate lock time as round time + 15 minutes (keeping in local time)
  useEffect(() => {
    if (confirmedRoundTime) {
      const roundDate = new Date(confirmedRoundTime)
      const lockDate = new Date(roundDate.getTime() + 15 * 60 * 1000)
      const year = lockDate.getFullYear()
      const month = String(lockDate.getMonth() + 1).padStart(2, '0')
      const day = String(lockDate.getDate()).padStart(2, '0')
      const hours = String(lockDate.getHours()).padStart(2, '0')
      const minutes = String(lockDate.getMinutes()).padStart(2, '0')
      setLockTime(`${year}-${month}-${day}T${hours}:${minutes}`)
    }
  }, [confirmedRoundTime])

  const handleConfirmRoundTime = () => {
    if (!roundDateTime) {
      toast({
        variant: 'destructive',
        title: 'Time Not Set',
        description: 'Please select a date and time for the next round'
      })
      return
    }

    setConfirmedRoundTime(roundDateTime)
    toast({
      title: 'Round Time Confirmed!',
      description: `Betting will lock 15 minutes after round time`
    })
  }

  const handleLockBetting = async () => {
    if (!confirmedRoundTime) {
      toast({
        variant: 'destructive',
        title: 'Round Time Not Confirmed',
        description: 'Please confirm the round time first'
      })
      return
    }

    setLoading(true)

    try {
      // Convert lock time to ISO string for database
      const lockDateTime = new Date(lockTime).toISOString()

      // Update the events table to set betting_lock_time for all active events
      const { data: activeEvents, error: fetchError } = await supabase
        .from('events')
        .select('id')
        .eq('is_active', true)

      if (fetchError) throw fetchError

      if (!activeEvents || activeEvents.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Active Events',
          description: 'No active events found to lock betting'
        })
        setLoading(false)
        return
      }

      // Lock betting for all active events
      for (const event of activeEvents) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ betting_lock_time: lockDateTime })
          .eq('id', event.id)

        if (updateError) {
          throw new Error(`Failed to update event ${event.id}: ${updateError.message}`)
        }
      }

      toast({
        title: 'Betting Locked!',
        description: `New bets are now disabled for all active events`
      })

      // Update local state to show locked view
      setCurrentBettingLock(lockDateTime)
      setIsLocked(true)

      // Clear the form
      setRoundDateTime('')
      setConfirmedRoundTime(null)
      setLockTime('')
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Lock Failed',
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelLock = async () => {
    setLoading(true)

    try {
      // Clear betting_lock_time for all active events
      const { data: activeEvents, error: fetchError } = await supabase
        .from('events')
        .select('id')
        .eq('is_active', true)

      if (fetchError) throw fetchError

      if (!activeEvents || activeEvents.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Active Events',
          description: 'No active events found'
        })
        setLoading(false)
        return
      }

      for (const event of activeEvents) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ betting_lock_time: null })
          .eq('id', event.id)

        if (updateError) {
          throw new Error(`Failed to update event ${event.id}: ${updateError.message}`)
        }
      }

      toast({
        title: 'Lock Cancelled!',
        description: 'Betting is now open for all active events'
      })
      setCurrentBettingLock(null)
      setIsLocked(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Cancel Failed',
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExtendCurrentLock = async () => {
    if (!currentBettingLock) {
      toast({
        variant: 'destructive',
        title: 'No Active Lock',
        description: 'No active lock to extend'
      })
      return
    }

    setLoading(true)

    try {
      const currentLockDate = new Date(currentBettingLock)
      const newLockDate = new Date(currentLockDate.getTime() + 15 * 60 * 1000)
      const newLockDateTime = newLockDate.toISOString()

      // Update the database
      const { data: activeEvents, error: fetchError } = await supabase
        .from('events')
        .select('id')
        .eq('is_active', true)

      if (fetchError) throw fetchError

      if (!activeEvents || activeEvents.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Active Events',
          description: 'No active events found'
        })
        setLoading(false)
        return
      }

      for (const event of activeEvents) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ betting_lock_time: newLockDateTime })
          .eq('id', event.id)

        if (updateError) {
          throw new Error(`Failed to update event ${event.id}: ${updateError.message}`)
        }
      }

      toast({
        title: 'Lock Extended!',
        description: 'Lock time extended by 15 minutes'
      })
      setCurrentBettingLock(newLockDateTime)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Extend Failed',
        description: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExtendLock = () => {
    if (!lockTime) {
      toast({
        variant: 'destructive',
        title: 'No Lock Time',
        description: 'No lock time to extend'
      })
      return
    }

    const currentLockDate = new Date(lockTime)
    const newLockDate = new Date(currentLockDate.getTime() + 15 * 60 * 1000)

    const year = newLockDate.getFullYear()
    const month = String(newLockDate.getMonth() + 1).padStart(2, '0')
    const day = String(newLockDate.getDate()).padStart(2, '0')
    const hours = String(newLockDate.getHours()).padStart(2, '0')
    const minutes = String(newLockDate.getMinutes()).padStart(2, '0')

    setLockTime(`${year}-${month}-${day}T${hours}:${minutes}`)
    toast({
      title: 'Preview Extended!',
      description: 'Lock time preview extended by 15 minutes'
    })
  }

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return ''
    const date = new Date(dateTimeString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Create the next round and set the betting window</h1>
      </div>

      <div className="space-y-4">
        {/* Show current locked state if betting is locked */}
        {isLocked && currentBettingLock ? (
          <>
            {/* Current Lock Status Card */}
            <div className="border-2 border-red-500/30 bg-red-500/5 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                <Lock className="h-5 w-5" />
                <span>Betting Currently Locked</span>
              </div>

              {/* Round Time */}
              <div className="px-3 py-2 border border-border rounded-md bg-background">
                <p className="text-xs text-muted-foreground mb-1">Round Time</p>
                <p className="text-sm font-medium">
                  {formatDateTime(new Date(new Date(currentBettingLock).getTime() - 15 * 60 * 1000).toISOString())}
                </p>
              </div>

              {/* Lock Time */}
              <div className="px-3 py-2 border border-border rounded-md bg-background">
                <p className="text-xs text-muted-foreground mb-1">Betting Locks At</p>
                <p className="text-sm font-medium text-red-600">
                  {formatDateTime(currentBettingLock)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleExtendCurrentLock}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                Extend 15 mins
              </Button>
              <Button
                onClick={handleCancelLock}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel Lock
              </Button>
            </div>

            {/* Info */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Betting is currently locked. You can extend the lock time or cancel it to create a new round.
                The lock will auto-reset when a scorecard for this round is processed.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Next Round Date & Time */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Next Round Date & Time</span>
              </div>
              <Input
                type="datetime-local"
                value={roundDateTime}
                onChange={(e) => setRoundDateTime(e.target.value)}
                className="w-full"
              />
              <Button onClick={handleConfirmRoundTime} className="w-full">
                Confirm Round Time
              </Button>
            </div>

            {/* Card 2: Lock Time (only shown after confirming round time) */}
            {confirmedRoundTime && (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span>Lock Time</span>
                </div>
                <div className="px-3 py-2 border border-border rounded-md bg-muted/50">
                  <p className="text-sm font-medium">
                    {formatDateTime(lockTime)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    15 minutes after round start
                  </p>
                </div>
                <Button
                  onClick={handleLockBetting}
                  disabled={loading}
                  variant="destructive"
                  className="w-full"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {loading ? 'Locking...' : 'Lock Betting'}
                </Button>
              </div>
            )}

            {/* Card 3: Extend Lock (only shown after confirming round time) */}
            {confirmedRoundTime && (
              <div className="border border-border rounded-lg p-4">
                <Button
                  onClick={handleExtendLock}
                  variant="outline"
                  className="w-full"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Extend Lock by 15 mins
                </Button>
              </div>
            )}

            {/* Info */}
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Set the next round time, then lock betting 15 minutes after the round starts.
                You can extend the lock time if needed before locking.
              </p>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  )
}
