import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

export default function TournamentsTab() {
  const { toast } = useToast()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editDialog, setEditDialog] = useState({ open: false, tournament: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, tournament: null })
  const [formData, setFormData] = useState({
    event_name: '',
    start_date: '',
    end_date: '',
    event_type: 'season',
    status: 'upcoming'
  })
  const [error, setError] = useState('')

  // Fetch tournaments
  useEffect(() => {
    fetchTournaments()
  }, [])

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (err) {
      console.error('Error fetching tournaments:', err)
      setError('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setError('') // Clear any previous errors
    setFormData({
      event_name: '',
      start_date: '',
      end_date: '',
      event_type: 'season',
      status: 'upcoming'
    })
    setEditDialog({ open: true, tournament: null })
  }

  const handleEdit = (tournament) => {
    setError('') // Clear any previous errors
    setFormData({
      event_name: tournament.event_name,
      start_date: tournament.start_date,
      end_date: tournament.end_date,
      event_type: tournament.event_type,
      status: tournament.status
    })
    setEditDialog({ open: true, tournament })
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

  const handleSave = async () => {
    try {
      setError('')
      setSaving(true)

      // Validation
      if (!formData.event_name || !formData.start_date) {
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

      if (editDialog.tournament) {
        // Update existing
        const { error } = await supabase
          .from('events')
          .update(formData)
          .eq('id', editDialog.tournament.id)

        if (error) throw error

        toast({
          title: 'Tournament updated',
          description: `${formData.event_name} has been updated successfully`
        })
      } else {
        // Create new
        const { error } = await supabase
          .from('events')
          .insert([formData])

        if (error) throw error

        toast({
          title: 'Tournament created',
          description: `${formData.event_name} has been created successfully`
        })
      }

      setEditDialog({ open: false, tournament: null })
      await fetchTournaments()
    } catch (err) {
      console.error('Error saving tournament:', err)
      setError(err.message || 'Failed to save tournament')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save tournament'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setError('')
      setDeleting(true)

      // Check for foreign key constraints - see if tournament has rounds
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('id')
        .eq('event_id', deleteDialog.tournament.id)
        .limit(1)

      if (roundsError) throw roundsError

      if (rounds && rounds.length > 0) {
        setError('Cannot delete tournament with existing rounds. Please delete the rounds first.')
        return
      }

      // Check for event_players
      const { data: participants, error: participantsError } = await supabase
        .from('event_players')
        .select('player_id')
        .eq('event_id', deleteDialog.tournament.id)
        .limit(1)

      if (participantsError) throw participantsError

      if (participants && participants.length > 0) {
        setError('Cannot delete tournament with registered participants. Please remove participants first.')
        return
      }

      // Safe to delete
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', deleteDialog.tournament.id)

      if (error) throw error

      toast({
        title: 'Tournament deleted',
        description: `${deleteDialog.tournament.event_name} has been deleted successfully`
      })

      setDeleteDialog({ open: false, tournament: null })
      await fetchTournaments()
    } catch (err) {
      console.error('Error deleting tournament:', err)
      setError(err.message || 'Failed to delete tournament')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete tournament'
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
    return <div className="text-center py-12 text-muted-foreground">Loading tournaments...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Tournaments</h2>
            <Badge variant="secondary">{tournaments.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Manage seasons and tournaments</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tournament
        </Button>
      </div>

      {/* Tournaments List */}
      {tournaments.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No tournaments yet. Create your first one!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{tournament.event_name}</h3>
                    {getStatusBadge(tournament.status)}
                    <Badge variant="outline">{tournament.event_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(tournament.start_date)} {tournament.end_date && `- ${formatDate(tournament.end_date)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(tournament)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialog({ open: true, tournament })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, tournament: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.tournament ? 'Edit Tournament' : 'Create Tournament'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.tournament ? 'Update tournament details' : 'Add a new season or tournament'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="event_name">Name *</Label>
              <Input
                id="event_name"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
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
                <Label htmlFor="event_type">Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
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

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setEditDialog({ open: false, tournament: null })
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (editDialog.tournament ? 'Save Changes' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, tournament: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tournament</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.tournament?.event_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setDeleteDialog({ open: false, tournament: null })
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
