import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, Copy } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

// Tie breaker options
const TIE_BREAKER_OPTIONS = [
  { value: 'none', label: '(None)' },
  { value: 'aces', label: 'Number of Aces' },
  { value: 'eagles', label: 'Number of Eagles' },
  { value: 'birdies', label: 'Number of Birdies' },
  { value: 'earliest_birdie', label: 'Earliest Birdie in Round' }
]

export default function RulesTab() {
  const { toast } = useToast()
  const [pointsSystems, setPointsSystems] = useState([])
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [createDialog, setCreateDialog] = useState({ open: false, duplicateFrom: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, system: null })
  const [newSystemName, setNewSystemName] = useState('')
  const [error, setError] = useState('')

  // Form state for the selected system
  const [rankPoints, setRankPoints] = useState({})
  const [performancePoints, setPerformancePoints] = useState({
    birdie: 0,
    eagle: 0,
    ace: 0,
    most_birdies: 0
  })
  const [tieBreaking, setTieBreaking] = useState({
    priority: ['none', 'none', 'none', 'none']
  })
  const [courseMultiplier, setCourseMultiplier] = useState({
    enabled: true,
    source: 'course_tier'
  })

  // Fetch points systems
  useEffect(() => {
    fetchPointsSystems()
  }, [])

  // Load selected system into form
  useEffect(() => {
    if (selectedSystem) {
      loadSystemIntoForm(selectedSystem)
    }
  }, [selectedSystem])

  const fetchPointsSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('points_systems')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setPointsSystems(data || [])
      if (data && data.length > 0 && !selectedSystem) {
        setSelectedSystem(data[0])
      }
    } catch (err) {
      console.error('Error fetching points systems:', err)
      setError('Failed to load points systems')
    } finally {
      setLoading(false)
    }
  }

  const loadSystemIntoForm = (system) => {
    if (!system) return

    const config = system.config || {}
    setRankPoints(config.rank_points || {})
    setPerformancePoints({
      birdie: config.performance_points?.birdie || 0,
      eagle: config.performance_points?.eagle || 0,
      ace: config.performance_points?.ace || 0,
      most_birdies: config.performance_points?.most_birdies || 0
    })

    // Handle tie_breaking - convert to priority array format
    // Convert empty strings from DB to 'none' for UI
    let tieBreakerPriority = ['none', 'none', 'none', 'none']
    if (config.tie_breaking?.priority && Array.isArray(config.tie_breaking.priority)) {
      // Ensure we have exactly 4 elements, convert '' to 'none'
      tieBreakerPriority = [
        config.tie_breaking.priority[0] || 'none',
        config.tie_breaking.priority[1] || 'none',
        config.tie_breaking.priority[2] || 'none',
        config.tie_breaking.priority[3] || 'none'
      ].map(val => val === '' ? 'none' : val)
    }
    setTieBreaking({ priority: tieBreakerPriority })

    setCourseMultiplier(config.course_multiplier || { enabled: true, source: 'course_tier' })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')

      // Convert 'none' back to empty strings for database
      const tieBreakerForDB = {
        priority: tieBreaking.priority.map(val => val === 'none' ? '' : val)
      }

      const updatedConfig = {
        rank_points: rankPoints,
        performance_points: performancePoints,
        tie_breaking: tieBreakerForDB,
        course_multiplier: courseMultiplier
      }

      const { error } = await supabase
        .from('points_systems')
        .update({ config: updatedConfig })
        .eq('id', selectedSystem.id)

      if (error) throw error

      toast({
        title: 'Points system updated',
        description: `${selectedSystem.name} has been updated successfully`
      })

      await fetchPointsSystems()
    } catch (err) {
      console.error('Error saving rules:', err)
      setError(err.message || 'Failed to save rules')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save rules'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateSystem = async () => {
    try {
      setError('')
      setCreating(true)

      if (!newSystemName) {
        setError('System name is required')
        return
      }

      // Check for duplicate name
      const { data: existing } = await supabase
        .from('points_systems')
        .select('id')
        .eq('name', newSystemName)
        .limit(1)

      if (existing && existing.length > 0) {
        setError('A points system with this name already exists')
        return
      }

      let config
      if (createDialog.duplicateFrom) {
        // Duplicate from existing system
        config = createDialog.duplicateFrom.config
      } else {
        // Create with default config
        config = {
          rank_points: { '1': 10, '2': 7, '3': 5, 'default': 2 },
          performance_points: { birdie: 1, eagle: 3, ace: 5, most_birdies: 20 },
          tie_breaking: { priority: ['aces', 'eagles', 'birdies', 'earliest_birdie'] },
          course_multiplier: { enabled: true, source: 'course_tier' }
        }
      }

      const { error } = await supabase
        .from('points_systems')
        .insert([{
          name: newSystemName,
          description: `Points system for ${newSystemName}`,
          config
        }])

      if (error) throw error

      toast({
        title: 'Points system created',
        description: `${newSystemName} has been created successfully`
      })

      setCreateDialog({ open: false, duplicateFrom: null })
      setNewSystemName('')
      await fetchPointsSystems()
    } catch (err) {
      console.error('Error creating system:', err)
      setError(err.message || 'Failed to create system')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create system'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    try {
      setError('')
      setDeleting(true)

      // Check if any events reference this system
      const { data: events, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('points_system_id', deleteDialog.system.id)
        .limit(1)

      if (checkError) throw checkError

      if (events && events.length > 0) {
        setError('Cannot delete points system - it is referenced by existing events.')
        return
      }

      const { error } = await supabase
        .from('points_systems')
        .delete()
        .eq('id', deleteDialog.system.id)

      if (error) throw error

      toast({
        title: 'Points system deleted',
        description: `${deleteDialog.system.name} has been deleted successfully`
      })

      setDeleteDialog({ open: false, system: null })
      await fetchPointsSystems()
    } catch (err) {
      console.error('Error deleting system:', err)
      setError(err.message || 'Failed to delete system')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete system'
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleAddRankPoint = () => {
    const nextRank = Object.keys(rankPoints).filter(k => k !== 'default').length + 1
    setRankPoints({ ...rankPoints, [nextRank]: 0 })
  }

  const handleRemoveRankPoint = (rank) => {
    const updated = { ...rankPoints }
    delete updated[rank]
    setRankPoints(updated)
  }

  const handleTieBreakerChange = (index, value) => {
    const updated = [...tieBreaking.priority]
    updated[index] = value
    setTieBreaking({ priority: updated })
  }

  // Get available tie breaker options for a specific dropdown (excluding already selected)
  const getAvailableTieBreakerOptions = (currentIndex) => {
    const selected = tieBreaking.priority.filter((val, idx) => idx !== currentIndex && val !== 'none')
    return TIE_BREAKER_OPTIONS.filter(opt => opt.value === 'none' || !selected.includes(opt.value))
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading points systems...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header with System Selector and Actions */}
      <div className="space-y-3">
        {/* Row 1: Points System Selector and Save Button */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex-1 max-w-md">
            {pointsSystems.length > 0 && (
              <>
                <Label htmlFor="system-select">Select Points System</Label>
                <Select
                  value={selectedSystem?.id.toString()}
                  onValueChange={(value) => {
                    const system = pointsSystems.find(s => s.id === parseInt(value))
                    setSelectedSystem(system)
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pointsSystems.map((system) => (
                      <SelectItem key={system.id} value={system.id.toString()}>
                        {system.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {selectedSystem && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>

        {/* Row 2: Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedSystem && (
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => {
                setError('')
                setNewSystemName('')
                setCreateDialog({ open: true, duplicateFrom: selectedSystem })
              }}
            >
              <Copy className="h-3 w-3 mr-1.5" />
              Duplicate
            </Button>
          )}
          {selectedSystem && (
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => {
                setError('')
                setDeleteDialog({ open: true, system: selectedSystem })
              }}
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-sm"
            onClick={() => {
              setError('')
              setNewSystemName('')
              setCreateDialog({ open: true, duplicateFrom: null })
            }}
          >
            <Plus className="h-3 w-3 mr-1.5" />
            Create New
          </Button>
        </div>
      </div>

      {/* No Systems State */}
      {pointsSystems.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No points systems yet. Create your first one!</p>
          <Button onClick={() => setCreateDialog({ open: true, duplicateFrom: null })}>
            <Plus className="h-4 w-4 mr-2" />
            Create Points System
          </Button>
        </Card>
      ) : (
        <>
          {/* (a) Placement Points Configuration */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Placement Points</h3>
                <p className="text-sm text-muted-foreground">Points awarded based on finishing position</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleAddRankPoint}>
                <Plus className="h-4 w-4 mr-1" />
                Add Rank
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(rankPoints)
                .sort((a, b) => {
                  if (a[0] === 'default') return 1
                  if (b[0] === 'default') return -1
                  return parseInt(a[0]) - parseInt(b[0])
                })
                .map(([rank, points]) => (
                  <div key={rank} className="flex items-center gap-2">
                    <Label className="text-sm whitespace-nowrap">
                      {rank === 'default' ? 'Default' : `${rank}${rank === '1' ? 'st' : rank === '2' ? 'nd' : rank === '3' ? 'rd' : 'th'}`}:
                    </Label>
                    <Input
                      type="number"
                      value={points}
                      onChange={(e) => setRankPoints({ ...rankPoints, [rank]: parseInt(e.target.value) || 0 })}
                      className="w-20"
                    />
                    {rank !== 'default' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveRankPoint(rank)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </Card>

          {/* (b) Performance Bonuses */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Performance Bonuses</h3>
              <p className="text-sm text-muted-foreground">Extra points for special achievements (set to 0 to disable)</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="birdie">Birdie</Label>
                <Input
                  id="birdie"
                  type="number"
                  value={performancePoints.birdie}
                  onChange={(e) => setPerformancePoints({ ...performancePoints, birdie: parseInt(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="eagle">Eagle</Label>
                <Input
                  id="eagle"
                  type="number"
                  value={performancePoints.eagle}
                  onChange={(e) => setPerformancePoints({ ...performancePoints, eagle: parseInt(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="ace">Ace</Label>
                <Input
                  id="ace"
                  type="number"
                  value={performancePoints.ace}
                  onChange={(e) => setPerformancePoints({ ...performancePoints, ace: parseInt(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="most_birdies">Most Birdies</Label>
                <Input
                  id="most_birdies"
                  type="number"
                  value={performancePoints.most_birdies}
                  onChange={(e) => setPerformancePoints({ ...performancePoints, most_birdies: parseInt(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>

          {/* (c) Tie Breakers */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Tie Breakers</h3>
              <p className="text-sm text-muted-foreground">Priority order for resolving placement ties (1st priority to 4th priority)</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map(index => (
                <div key={index}>
                  <Label htmlFor={`tie-${index}`}>{index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'} Priority</Label>
                  <Select
                    value={tieBreaking.priority[index] || ''}
                    onValueChange={(value) => handleTieBreakerChange(index, value)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableTieBreakerOptions(index).map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </Card>

          {/* (d) Course Difficulty Multiplier */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="font-semibold text-lg">Course Difficulty Multiplier</h3>
              <p className="text-sm text-muted-foreground">Apply multiplier based on course tier</p>
            </div>

            <div>
              <Label htmlFor="multiplier-enabled">Enabled</Label>
              <Select
                value={courseMultiplier.enabled.toString()}
                onValueChange={(value) => setCourseMultiplier({ ...courseMultiplier, enabled: value === 'true' })}
              >
                <SelectTrigger className="mt-1.5 max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </>
      )}

      {/* Create System Dialog */}
      <Dialog open={createDialog.open} onOpenChange={(open) => setCreateDialog({ open, duplicateFrom: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createDialog.duplicateFrom ? `Duplicate "${createDialog.duplicateFrom.name}"` : 'Create Points System'}
            </DialogTitle>
            <DialogDescription>
              {createDialog.duplicateFrom
                ? 'Create a new points system based on the selected one'
                : 'Create a new points system with default configuration'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="system_name">System Name *</Label>
              <Input
                id="system_name"
                value={newSystemName}
                onChange={(e) => setNewSystemName(e.target.value)}
                placeholder="e.g., 2026, 2027, Summer League 2025"
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Typically named by year (2025, 2026, etc.)
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setCreateDialog({ open: false, duplicateFrom: null })
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateSystem} disabled={creating}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, system: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Points System</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.system?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setDeleteDialog({ open: false, system: null })
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
