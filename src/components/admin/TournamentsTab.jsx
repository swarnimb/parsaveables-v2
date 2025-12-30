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

export default function TournamentsTab() {
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
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
    setFormData({
      event_name: tournament.event_name,
      start_date: tournament.start_date,
      end_date: tournament.end_date,
      event_type: tournament.event_type,
      status: tournament.status
    })
    setEditDialog({ open: true, tournament })
  }

  const handleSave = async () => {
    try {
      setError('')

      // Validation
      if (!formData.event_name || !formData.start_date) {
        setError('Name and start date are required')
        return
      }

      if (editDialog.tournament) {
        // Update existing
        const { error } = await supabase
          .from('events')
          .update(formData)
          .eq('id', editDialog.tournament.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('events')
          .insert([formData])

        if (error) throw error
      }

      setEditDialog({ open: false, tournament: null })
      fetchTournaments()
    } catch (err) {
      console.error('Error saving tournament:', err)
      setError(err.message || 'Failed to save tournament')
    }
  }

  const handleDelete = async () => {
    try {
      setError('')

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', deleteDialog.tournament.id)

      if (error) throw error

      setDeleteDialog({ open: false, tournament: null })
      fetchTournaments()
    } catch (err) {
      console.error('Error deleting tournament:', err)
      setError(err.message || 'Failed to delete tournament')
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
          <h2 className="text-2xl font-bold">Tournaments</h2>
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
                    {tournament.start_date} {tournament.end_date && `- ${tournament.end_date}`}
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
            <Button variant="outline" onClick={() => setEditDialog({ open: false, tournament: null })}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editDialog.tournament ? 'Save Changes' : 'Create'}
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
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, tournament: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
