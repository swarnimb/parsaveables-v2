import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

export default function PlayersTab() {
  const { toast } = useToast()
  const [players, setPlayers] = useState([])
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState('all')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [editDialog, setEditDialog] = useState({ open: false, player: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, player: null })
  const [removeDialog, setRemoveDialog] = useState({ open: false, player: null })
  const [formData, setFormData] = useState({
    player_name: ''
  })
  const [error, setError] = useState('')

  // Fetch events and players on mount
  useEffect(() => {
    fetchEvents()
    fetchPlayers()
  }, [])

  // Refetch players when event filter changes
  useEffect(() => {
    if (!loading) {
      fetchPlayers()
    }
  }, [selectedEvent])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, type')
        .order('start_date', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (err) {
      console.error('Error fetching events:', err)
    }
  }

  const fetchPlayers = async () => {
    try {
      setLoading(true)

      if (selectedEvent === 'all') {
        // Fetch all players
        const { data, error } = await supabase
          .from('registered_players')
          .select('*')
          .order('player_name', { ascending: true })

        if (error) throw error
        setPlayers(data || [])
      } else {
        // Fetch players for specific event
        const { data, error } = await supabase
          .from('event_players')
          .select(`
            player_id,
            registered_players (
              id,
              player_name
            )
          `)
          .eq('event_id', selectedEvent)

        if (error) throw error

        // Extract player data from nested structure
        const eventPlayers = (data || [])
          .map(ep => ep.registered_players)
          .filter(p => p !== null)
          .sort((a, b) => a.player_name.localeCompare(b.player_name))

        setPlayers(eventPlayers)
      }
    } catch (err) {
      console.error('Error fetching players:', err)
      setError('Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setError('')
    setFormData({
      player_name: ''
    })
    setEditDialog({ open: true, player: null })
  }

  const handleEdit = (player) => {
    setError('')
    setFormData({
      player_name: player.player_name
    })
    setEditDialog({ open: true, player })
  }

  const handleSave = async () => {
    try {
      setError('')
      setSaving(true)

      // Validation
      if (!formData.player_name) {
        setError('Player name is required')
        return
      }

      const updateData = {
        player_name: formData.player_name
      }

      if (editDialog.player) {
        // Update existing
        const { error } = await supabase
          .from('registered_players')
          .update(updateData)
          .eq('id', editDialog.player.id)

        if (error) throw error

        toast({
          title: 'Player updated',
          description: `${formData.player_name} has been updated successfully`
        })
      } else {
        // Create new - include default values
        const { error } = await supabase
          .from('registered_players')
          .insert([{
            ...updateData,
            status: 'active',
            pulp_balance: 40 // Starting balance
          }])

        if (error) throw error

        toast({
          title: 'Player created',
          description: `${formData.player_name} has been added successfully`
        })
      }

      setEditDialog({ open: false, player: null })
      await fetchPlayers()
    } catch (err) {
      console.error('Error saving player:', err)
      setError(err.message || 'Failed to save player')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save player'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setError('')
      setDeleting(true)

      // Soft delete - set status to inactive
      const { error } = await supabase
        .from('registered_players')
        .update({ status: 'inactive' })
        .eq('id', deleteDialog.player.id)

      if (error) throw error

      toast({
        title: 'Player deactivated',
        description: `${deleteDialog.player.player_name} has been deactivated`
      })

      setDeleteDialog({ open: false, player: null })
      await fetchPlayers()
    } catch (err) {
      console.error('Error deleting player:', err)
      setError(err.message || 'Failed to deactivate player')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate player'
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleRemoveFromEvent = async () => {
    try {
      setError('')
      setRemoving(true)

      const { error } = await supabase
        .from('event_players')
        .delete()
        .eq('event_id', selectedEvent)
        .eq('player_id', removeDialog.player.id)

      if (error) throw error

      toast({
        title: 'Player removed from event',
        description: `${removeDialog.player.player_name} has been removed from this event`
      })

      setRemoveDialog({ open: false, player: null })
      await fetchPlayers()
    } catch (err) {
      console.error('Error removing player from event:', err)
      setError(err.message || 'Failed to remove player from event')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to remove player from event'
      })
    } finally {
      setRemoving(false)
    }
  }

  if (loading && events.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  }

  // Group events by type for dropdown
  const seasons = events.filter(e => e.type === 'season')
  const tournaments = events.filter(e => e.type === 'tournament')

  return (
    <div className="space-y-4">
      {/* Header with Event Filter and Add button */}
      <div className="flex items-center justify-between gap-4">
        <Select value={selectedEvent} onValueChange={setSelectedEvent}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>

            {seasons.length > 0 && (
              <SelectGroup>
                <SelectLabel>Seasons</SelectLabel>
                {seasons.map(event => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            {tournaments.length > 0 && (
              <SelectGroup>
                <SelectLabel>Tournaments</SelectLabel>
                {tournaments.map(event => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>

        <Button onClick={handleCreate} className="text-sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </div>

      {/* Players List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading players...</div>
      ) : players.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {selectedEvent === 'all'
              ? 'No players yet. Add your first player!'
              : 'No players in this event.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <Card key={player.id} className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{player.player_name}</h3>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(player)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setError('')
                      setDeleteDialog({ open: true, player })
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  {selectedEvent !== 'all' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setError('')
                        setRemoveDialog({ open: true, player })
                      }}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, player: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.player ? 'Edit Player' : 'Add Player'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.player ? 'Update player details' : 'Add a new player to the system'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="player_name">Player Name *</Label>
              <Input
                id="player_name"
                value={formData.player_name}
                onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                placeholder="John Doe"
                className="mt-1.5"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setEditDialog({ open: false, player: null })
            }} className="text-sm">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="text-sm">
              {saving ? 'Saving...' : (editDialog.player ? 'Save Changes' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, player: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Player</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate "{deleteDialog.player?.player_name}"? The player will be marked as inactive but their data will be preserved.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setDeleteDialog({ open: false, player: null })
            }} className="text-sm">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="text-sm">
              {deleting ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from Event Dialog */}
      <Dialog open={removeDialog.open} onOpenChange={(open) => setRemoveDialog({ open, player: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Player from Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{removeDialog.player?.player_name}" from this event?
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setRemoveDialog({ open: false, player: null })
            }} className="text-sm">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveFromEvent} disabled={removing} className="text-sm">
              {removing ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
