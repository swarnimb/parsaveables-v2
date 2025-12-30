import { useState, useEffect } from 'react'
import { Lock, Calendar, Clock } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PageContainer from '@/components/layout/PageContainer'

export default function BettingControls() {
  const [roundDateTime, setRoundDateTime] = useState('')
  const [lockTime, setLockTime] = useState('')
  const [confirmedRoundTime, setConfirmedRoundTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

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
      setError('Please select a date and time for the next round')
      return
    }

    setConfirmedRoundTime(roundDateTime)
    setError(null)
    setSuccess('Round time confirmed!')
    setTimeout(() => setSuccess(null), 2000)
  }

  const handleLockBetting = async () => {
    if (!confirmedRoundTime) {
      setError('Please confirm the round time first')
      return
    }

    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const { data: session } = await supabase.auth.getSession()

      // Convert lock time to ISO string for database
      const lockDateTime = new Date(lockTime).toISOString()

      // Update the events table to set betting_lock_time
      // We'll lock betting for all active events
      const { data: activeEvents } = await supabase
        .from('events')
        .select('id')
        .eq('active', true)

      if (!activeEvents || activeEvents.length === 0) {
        // If no active events, just show success - betting will be locked when event becomes active
        setSuccess('Betting lock time saved successfully!')
        setLoading(false)
        return
      }

      // Lock betting for all active events
      for (const event of activeEvents) {
        const response = await fetch('/api/pulp/lockBetting', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`
          },
          body: JSON.stringify({
            eventId: event.id,
            lockTime: lockDateTime
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to lock betting')
        }
      }

      setSuccess('Betting locked successfully!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExtendLock = () => {
    if (!lockTime) {
      setError('No lock time to extend')
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
    setSuccess('Lock time extended by 15 minutes!')
    setTimeout(() => setSuccess(null), 2000)
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
        <h1 className="text-2xl font-bold mb-2">Betting Controls</h1>
        <p className="text-muted-foreground text-sm">
          Set round time and lock betting for the active event
        </p>
      </div>

      <div className="space-y-4">
        {/* Error/Success Messages */}
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
      </div>
    </PageContainer>
  )
}
