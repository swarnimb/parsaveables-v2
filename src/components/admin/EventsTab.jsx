import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export default function EventsTab() {
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventPlayers, setEventPlayers] = useState([])
  const [allPlayers, setAllPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [addPlayerDialog, setAddPlayerDialog] = useState(false)
  const [removeDialog, setRemoveDialog] = useState({ open: false, player: null })
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [error, setError] = useState('')

  // Fetch events and all players
  useEffect(() => {
    fetchEvents()
    fetchAllPlayers()
  }, [])

  // Fetch event players when event is selected
  useEffect(() => {
    if (selectedEvent) {
      fetchEventPlayers()
    }
  }, [selectedEvent])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error
      setEvents(data || [])
      if (data && data.length > 0 && !selectedEvent) {
        setSelectedEvent(data[0])
      }
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('registered_players')
        .select('*')
        .eq('status', 'active')
        .order('player_name', { ascending: true })

      if (error) throw error
      setAllPlayers(data || [])
    } catch (err) {
      console.error('Error fetching players:', err)
    }
  }

  const fetchEventPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('event_players')
        .select(`
          *,
          player:registered_players(player_name, total_pulps)
        `)
        .eq('event_id', selectedEvent.id)
        .order('joined_at', { ascending: false })

      if (error) throw error
      setEventPlayers(data || [])
    } catch (err) {
      console.error('Error fetching event players:', err)
      setError('Failed to load event participants')
    }
  }

  const handleAddPlayer = async () => {
    try {
      setError('')

      if (!selectedPlayerId) {
        setError('Please select a player')
        return
      }

      // Check if player is already in event
      const existing = eventPlayers.find(ep => ep.player_id === parseInt(selectedPlayerId))
      if (existing) {
        setError('Player is already in this event')
        return
      }

      const { error } = await supabase
        .from('event_players')
        .insert([{
          event_id: selectedEvent.id,
          player_id: parseInt(selectedPlayerId)
        }])

      if (error) throw error

      setAddPlayerDialog(false)
      setSelectedPlayerId('')
      fetchEventPlayers()
    } catch (err) {
      console.error('Error adding player:', err)
      setError(err.message || 'Failed to add player to event')
    }
  }

  const handleRemovePlayer = async () => {
    try {
      setError('')

      const { error } = await supabase
        .from('event_players')
        .delete()
        .eq('id', removeDialog.player.id)

      if (error) throw error

      setRemoveDialog({ open: false, player: null })
      fetchEventPlayers()
    } catch (err) {
      console.error('Error removing player:', err)
      setError(err.message || 'Failed to remove player from event')
    }
  }

  const getAvailablePlayers = () => {
    const participantIds = eventPlayers.map(ep => ep.player_id)
    return allPlayers.filter(p => !participantIds.includes(p.id))
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading events...</div>
  }

  if (events.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-sm text-muted-foreground">Manage player participation in events</p>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No events found. Create a tournament or season first!</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Event Selector */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <h2 className="text-2xl font-bold mb-2">Event Management</h2>
          <Label htmlFor="event-select">Select Event</Label>
          <Select
            value={selectedEvent?.id.toString()}
            onValueChange={(value) => {
              const event = events.find(e => e.id === parseInt(value))
              setSelectedEvent(event)
            }}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id.toString()}>
                  {event.event_name} ({event.start_date})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setAddPlayerDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </div>

      {/* Event Info */}
      {selectedEvent && (
        <Card className="p-4 bg-accent/50">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold">{selectedEvent.event_name}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedEvent.start_date} {selectedEvent.end_date && `- ${selectedEvent.end_date}`}
              </p>
            </div>
            <Badge variant="outline">{selectedEvent.event_type}</Badge>
            <Badge>{selectedEvent.status}</Badge>
          </div>
        </Card>
      )}

      {/* Participants List */}
      <div>
        <h3 className="font-semibold mb-2">
          Participants ({eventPlayers.length})
        </h3>
        {eventPlayers.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No participants yet. Add players to this event!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {eventPlayers.map((ep) => (
              <Card key={ep.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{ep.player?.player_name}</h4>
                      <Badge variant="outline" className="text-primary">
                        {ep.player?.total_pulps || 0} PULPs
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Joined: {new Date(ep.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveDialog({ open: true, player: ep })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Player Dialog */}
      <Dialog open={addPlayerDialog} onOpenChange={setAddPlayerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Player to Event</DialogTitle>
            <DialogDescription>
              Add a player to "{selectedEvent?.event_name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="player-select">Select Player</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a player..." />
                </SelectTrigger>
                <SelectContent>
                  {getAvailablePlayers().map((player) => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      {player.player_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddPlayerDialog(false)
              setSelectedPlayerId('')
              setError('')
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddPlayer}>
              Add Player
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeDialog.open} onOpenChange={(open) => setRemoveDialog({ open, player: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Player</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove "{removeDialog.player?.player?.player_name}" from this event?
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveDialog({ open: false, player: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemovePlayer}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
