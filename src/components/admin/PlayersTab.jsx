import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

// Simple email validation
const validateEmail = (email) => {
  if (!email) return true // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export default function PlayersTab() {
  const { toast } = useToast()
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [editDialog, setEditDialog] = useState({ open: false, player: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, player: null })
  const [formData, setFormData] = useState({
    player_name: '',
    email: '',
    user_id: ''
  })
  const [error, setError] = useState('')

  // Fetch players
  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('registered_players')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlayers(data || [])
    } catch (err) {
      console.error('Error fetching players:', err)
      setError('Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setError('') // Clear any previous errors
    setFormData({
      player_name: '',
      email: '',
      user_id: ''
    })
    setEditDialog({ open: true, player: null })
  }

  const handleEdit = (player) => {
    setError('') // Clear any previous errors
    setFormData({
      player_name: player.player_name,
      email: player.email || '',
      user_id: player.user_id || ''
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

      // Email validation
      if (formData.email && !validateEmail(formData.email)) {
        setError('Please enter a valid email address')
        return
      }

      // Check for duplicate email if provided
      if (formData.email) {
        const { data: existingPlayers, error: checkError } = await supabase
          .from('registered_players')
          .select('id')
          .eq('email', formData.email)
          .neq('id', editDialog.player?.id || 0)
          .limit(1)

        if (checkError) throw checkError

        if (existingPlayers && existingPlayers.length > 0) {
          setError('A player with this email already exists')
          return
        }
      }

      const updateData = {
        player_name: formData.player_name,
        email: formData.email || null,
        user_id: formData.user_id || null
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
      setDeactivating(true)

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
      setDeactivating(false)
    }
  }

  const handleReactivate = async (player) => {
    try {
      setReactivating(true)

      const { error } = await supabase
        .from('registered_players')
        .update({ status: 'active' })
        .eq('id', player.id)

      if (error) throw error

      toast({
        title: 'Player reactivated',
        description: `${player.player_name} is now active`
      })

      await fetchPlayers()
    } catch (err) {
      console.error('Error reactivating player:', err)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to reactivate player'
      })
    } finally {
      setReactivating(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusBadge = (status) => {
    return status === 'active'
      ? <Badge variant="default">Active</Badge>
      : <Badge variant="secondary">Inactive</Badge>
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading players...</div>
  }

  const activePlayers = players.filter(p => p.status === 'active')
  const inactivePlayers = players.filter(p => p.status === 'inactive')

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Players</h2>
            <Badge variant="default">Active: {activePlayers.length}</Badge>
            {inactivePlayers.length > 0 && (
              <Badge variant="secondary">Inactive: {inactivePlayers.length}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Manage registered players</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Player
        </Button>
      </div>

      {/* Players List */}
      {players.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No players yet. Add your first player!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <Card key={player.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{player.player_name}</h3>
                    {getStatusBadge(player.status)}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    {player.email && <span>{player.email}</span>}
                    <span>Joined: {formatDate(player.created_at)}</span>
                    <span className="font-medium text-primary">{player.pulp_balance || 0} PULPs</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {player.status === 'inactive' ? (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleReactivate(player)}
                      disabled={reactivating}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {reactivating ? 'Reactivating...' : 'Reactivate'}
                    </Button>
                  ) : (
                    <>
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
                    </>
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

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="user_id">User ID (optional)</Label>
              <Input
                id="user_id"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="UUID from auth.users table"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link this player to an authenticated user account
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setEditDialog({ open: false, player: null })
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
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
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deactivating}>
              {deactivating ? 'Deactivating...' : 'Deactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
