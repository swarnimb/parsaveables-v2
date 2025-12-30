import { useState, useEffect } from 'react'
import { Lock, Calendar, Clock } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function BettingControlsModal({ trigger }) {
  const [open, setOpen] = useState(false)
  const [roundDateTime, setRoundDateTime] = useState('')
  const [lockTime, setLockTime] = useState('')
  const [confirmedRoundTime, setConfirmedRoundTime] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Auto-calculate lock time as round time + 15 minutes
  useEffect(() => {
    if (confirmedRoundTime) {
      const lockDate = new Date(confirmedRoundTime)
      lockDate.setMinutes(lockDate.getMinutes() + 15)
      setLockTime(lockDate.toISOString().slice(0, 16))
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

      // Get active event to lock
      const { data: activeEvent, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('active', true)
        .single()

      if (eventError) throw new Error('No active event found')

      const response = await fetch('/api/pulp/lockBetting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`
        },
        body: JSON.stringify({
          eventId: activeEvent.id,
          lockTime: new Date(lockTime).toISOString()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to lock betting')
      }

      setSuccess(`Betting locked! ${result.betsLocked || 0} bet(s) locked.`)
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

    const newLockTime = new Date(lockTime)
    newLockTime.setMinutes(newLockTime.getMinutes() + 15)
    setLockTime(newLockTime.toISOString().slice(0, 16))
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Betting Controls</DialogTitle>
          <DialogDescription>
            Set round time and lock betting for the active event
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
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

          {/* Row 1: Round Date/Time + Confirm */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="round-time" className="text-sm mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Round Date & Time
              </Label>
              <Input
                id="round-time"
                type="datetime-local"
                value={roundDateTime}
                onChange={(e) => setRoundDateTime(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={handleConfirmRoundTime}>
              Confirm
            </Button>
          </div>

          {/* Row 2: Lock Time Display + Lock Button */}
          {confirmedRoundTime && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label className="text-sm mb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Lock Time
                </Label>
                <div className="px-3 py-2 border border-border rounded-md bg-muted/50 text-sm">
                  {formatDateTime(lockTime)} <span className="text-muted-foreground">(15 min after round)</span>
                </div>
              </div>
              <Button
                onClick={handleLockBetting}
                disabled={loading}
                variant="destructive"
              >
                <Lock className="h-4 w-4 mr-2" />
                Lock Bet
              </Button>
            </div>
          )}

          {/* Row 3: Extend Lock Button */}
          {confirmedRoundTime && (
            <div className="flex justify-center">
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
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              Set the next round time, then lock betting 15 minutes after the round starts. You can extend the lock time if needed before locking.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
