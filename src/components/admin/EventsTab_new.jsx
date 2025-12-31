import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Users } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'

export default function EventsTab() {
  const { toast } = useToast()
  const [events, setEvents] = useState([])
  const [pointsSystems, setPointsSystems] = useState([])
  const [players, setPlayers] = useState([])
  const [eventPlayers, setEventPlayers] = useState({}) // Map of event_id -> player_ids
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editDialog, setEditDialog] = useState({ open: false, event: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, event: null })
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    type: 'season',
    status: 'upcoming',
    points_system_id: null
  })
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([])
  const [error, setError] = useState('')

  // Fetch all data on mount
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      await Promise.all([
        fetchEvents(),
        fetchPointsSystems(),
        fetchPlayers(),
        fetchEventPlayers()
      ])
      setLoading(false)
    }
    fetchAllData()
  }, [])

  const fetchPointsSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('points_systems')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) throw error
      setPointsSystems(data || [])
    } catch (err) {
      console.error('Error fetching points systems:', err)
    }
  }

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('registered_players')
        .select('id, player_name')
        .order('player_name', { ascending: true })

      if (error) throw error
      setPlayers(data || [])
    } catch (err) {
      console.error('Error fetching players:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load players. Please refresh the page.'
      })
    }
  }

  const fetchEventPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('event_players')
        .select('event_id, player_id')

      if (error) throw error

      // Build a map of event_id -> array of player_ids
      const eventPlayersMap = {}
      data?.forEach(ep => {
        if (!eventPlayersMap[ep.event_id]) {
          eventPlayersMap[ep.event_id] = []
        }
        eventPlayersMap[ep.event_id].push(ep.player_id)
      })

      setEventPlayers(eventPlayersMap)
    } catch (err) {
      console.error('Error fetching event players:', err)
    }
  }

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Failed to load events')
    }
  }

  const handleCreate = () => {
    setError('') // Clear any previous errors
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      type: 'season',
      status: 'upcoming',
      points_system_id: pointsSystems.length > 0 ? pointsSystems[0].id : null
    })
    setSelectedPlayerIds([])
    setEditDialog({ open: true, event: null })
  }

  const handleEdit = (event) => {
    setError('') // Clear any previous errors
    setFormData({
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      type: event.type,
      status: event.status,
      points_system_id: event.points_system_id
    })
    // Load players for this event
    setSelectedPlayerIds(eventPlayers[event.id] || [])
    setEditDialog({ open: true, event })
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const handlePlayerToggle = (playerId) => {
    setSelectedPlayerIds(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId)
      } else {
        return [...prev, playerId]
      }
    })
  }

  const handleSave = async () => {
    try {
      setError('')
      setSaving(true)

      // Validation
      if (!formData.name || !formData.start_date) {
        setError('Name and start date are required')
        return
      }

      // Date validation: end_date must be >= start_date
      if (formData.end_date && formData.start_date) {
        const startDate = new Date(formData.start_date)
        const endDate = new Date(formData.end_date)
        if (endDate < startDate) {
          setError('End date must be on or after start date')
          return
        }
      }

      let eventId

      if (editDialog.event) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update(formData)
          .eq('id', editDialog.event.id)

        if (error) throw error
        eventId = editDialog.event.id

        // Delete existing event_players
        const { error: deleteError } = await supabase
          .from('event_players')
          .delete()
          .eq('event_id', eventId)

        if (deleteError) throw deleteError
      } else {
        // Create new event
        const { data, error } = await supabase
          .from('events')
          .insert([formData])
          .select()

        if (error) throw error
        eventId = data[0].id
      }

      // Insert event_players for selected players
      if (selectedPlayerIds.length > 0) {
        const eventPlayerRecords = selectedPlayerIds.map(playerId => ({
          event_id: eventId,
          player_id: playerId
        }))

        const { error: insertError } = await supabase
          .from('event_players')
          .insert(eventPlayerRecords)

        if (insertError) throw insertError
      }

      toast({
        title: editDialog.event ? 'Event updated' : 'Event created',
        description: `${formData.name} has been ${editDialog.event ? 'updated' : 'created'} successfully`
      })

      setEditDialog({ open: false, event: null })
      await Promise.all([fetchEvents(), fetchEventPlayers()])
    } catch (err) {
      console.error('Error saving event:', err)
      setError(err.message || 'Failed to save event')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save event'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setError('')
      setDeleting(true)

      // Check for foreign key constraints - see if event has rounds
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id')
        .eq('event_id', deleteDialog.event.id)
        .limit(1)

      if (roundsError) throw roundsError

      if (rounds && rounds.length > 0) {
        setError('Cannot delete event with existing rounds. Please delete the rounds first.')
        return
      }

      // Check for event_players
      const { data: participants, error: participantsError } = await supabase
        .from('event_players')
        .select('player_id')
        .eq('event_id', deleteDialog.event.id)
        .limit(1)

      if (participantsError) throw participantsError

      if (participants && participants.length > 0) {
        setError('Cannot delete event with registered participants. Please remove participants first.')
        return
      }

      // Safe to delete
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', deleteDialog.event.id)

      if (error) throw error

      toast({
        title: 'Event deleted',
        description: `${deleteDialog.event.name} has been deleted successfully`
      })

      setDeleteDialog({ open: false, event: null })
      await fetchEvents()
    } catch (err) {
      console.error('Error deleting event:', err)
      setError(err.message || 'Failed to delete event')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete event'
      })
    } finally {
      setDeleting(false)
    }
  }

  const getStatusBadge = (status) => {
    const variants = {
      upcoming: 'outline',
      active: 'default',
      completed: 'secondary'
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading events...</div>
  }

  // Group events by type
  const seasons = events.filter(e => e.type === 'season')
  const tournaments = events.filter(e => e.type === 'tournament')

  // Helper to determine active status based on dates
  const isEventActive = (event) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day

    const startDate = new Date(event.start_date)
    startDate.setHours(0, 0, 0, 0)

    const endDate = event.end_date ? new Date(event.end_date) : null
    if (endDate) endDate.setHours(23, 59, 59, 999) // End of day

    if (endDate) {
      return today >= startDate && today <= endDate
    }
    return today >= startDate
  }

  // Render event card
  const renderEventCard = (event) => {
    const isActive = isEventActive(event)
    const playerCount = eventPlayers[event.id]?.length || 0

    return (
      <Card key={event.id} className="p-4">
        <div className="space-y-3">
          {/* Event Name - Full Width */}
          <h3 className="font-medium">{event.name}</h3>

          {/* Bottom Row: Date/Status/Players on left, Actions on right */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {formatDate(event.start_date)} {event.end_date && `- ${formatDate(event.end_date)}`}
              </p>
              {isActive ? (
                <Badge variant="default">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{playerCount} {playerCount === 1 ? 'player' : 'players'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(event)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteDialog({ open: true, event })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Add button */}
      <div className="flex items-center justify-end">
        <Button onClick={handleCreate} className="text-sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      {/* No Events State */}
      {events.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No events yet. Create your first one!</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Seasons Section */}
          {seasons.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Seasons</h3>
              <div className="space-y-2">
                {seasons.map(renderEventCard)}
              </div>
            </div>
          )}

          {/* Tournaments Section */}
          {tournaments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Tournaments</h3>
              <div className="space-y-2">
                {tournaments.map(renderEventCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, event: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.event ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.event ? 'Update event details' : 'Add a new season or tournament'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Season 2025"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="season">Season</SelectItem>
                    <SelectItem value="tournament">Tournament</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="points_system">Points System *</Label>
              <Select
                value={formData.points_system_id?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, points_system_id: parseInt(value) })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select points system" />
                </SelectTrigger>
                <SelectContent>
                  {pointsSystems.map((system) => (
                    <SelectItem key={system.id} value={system.id.toString()}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select an existing points system or create a new one in the Rules tab
              </p>
            </div>

            <div>
              <Label>Players in Event</Label>
              <div className="mt-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No players available</p>
                ) : (
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div key={player.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`player-${player.id}`}
                          checked={selectedPlayerIds.includes(player.id)}
                          onCheckedChange={() => handlePlayerToggle(player.id)}
                        />
                        <label
                          htmlFor={`player-${player.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {player.player_name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Select players who will participate in this event
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setEditDialog({ open: false, event: null })
            }} className="text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="text-sm">
              {saving ? 'Saving...' : (editDialog.event ? 'Save Changes' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, event: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.event?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setDeleteDialog({ open: false, event: null })
            }} className="text-sm">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="text-sm">
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
