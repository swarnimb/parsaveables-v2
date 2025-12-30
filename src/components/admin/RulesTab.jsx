import { useState, useEffect } from 'react'
import { Save, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function RulesTab() {
  const [pointsSystems, setPointsSystems] = useState([])
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state for the selected system
  const [rankPoints, setRankPoints] = useState({})
  const [performancePoints, setPerformancePoints] = useState({
    birdie: 1,
    eagle: 3,
    ace: 5
  })
  const [tieBreaking, setTieBreaking] = useState({
    enabled: true,
    method: 'average'
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
    const config = system.config || {}
    setRankPoints(config.rank_points || {})
    setPerformancePoints(config.performance_points || { birdie: 1, eagle: 3, ace: 5 })
    setTieBreaking(config.tie_breaking || { enabled: true, method: 'average' })
    setCourseMultiplier(config.course_multiplier || { enabled: true, source: 'course_tier' })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const updatedConfig = {
        rank_points: rankPoints,
        performance_points: performancePoints,
        tie_breaking: tieBreaking,
        course_multiplier: courseMultiplier
      }

      const { error } = await supabase
        .from('points_systems')
        .update({ config: updatedConfig })
        .eq('id', selectedSystem.id)

      if (error) throw error

      setSuccess('Rules saved successfully!')
      fetchPointsSystems()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error('Error saving rules:', err)
      setError(err.message || 'Failed to save rules')
    } finally {
      setSaving(false)
    }
  }

  const handleAddRankPoint = () => {
    const nextRank = Object.keys(rankPoints).length + 1
    setRankPoints({ ...rankPoints, [nextRank]: 0 })
  }

  const handleRemoveRankPoint = (rank) => {
    const updated = { ...rankPoints }
    delete updated[rank]
    setRankPoints(updated)
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading rules...</div>
  }

  if (pointsSystems.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Rules & Points System</h2>
          <p className="text-sm text-muted-foreground">Configure scoring rules</p>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No points systems found. Create an event with a points system first!</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with System Selector */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <h2 className="text-2xl font-bold mb-2">Rules & Points System</h2>
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
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}
      {success && (
        <Card className="p-4 border-green-600 bg-green-600/10">
          <p className="text-sm text-green-600">{success}</p>
        </Card>
      )}

      {/* System Description */}
      {selectedSystem && (
        <Card className="p-4 bg-accent/50">
          <p className="text-sm text-muted-foreground">{selectedSystem.description}</p>
        </Card>
      )}

      {/* Rank Points Configuration */}
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

      {/* Performance Points Configuration */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Performance Bonuses</h3>
          <p className="text-sm text-muted-foreground">Extra points for special achievements</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
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
        </div>
      </Card>

      {/* Tie Breaking Configuration */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Tie Breaking</h3>
          <p className="text-sm text-muted-foreground">How to handle ties in placement</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tie-enabled">Enabled</Label>
            <Select
              value={tieBreaking.enabled.toString()}
              onValueChange={(value) => setTieBreaking({ ...tieBreaking, enabled: value === 'true' })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="tie-method">Method</Label>
            <Select
              value={tieBreaking.method}
              onValueChange={(value) => setTieBreaking({ ...tieBreaking, method: value })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="average">Average Points</SelectItem>
                <SelectItem value="split">Split Points</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Course Multiplier Configuration */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Course Difficulty Multiplier</h3>
          <p className="text-sm text-muted-foreground">Apply multiplier based on course tier</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="multiplier-enabled">Enabled</Label>
            <Select
              value={courseMultiplier.enabled.toString()}
              onValueChange={(value) => setCourseMultiplier({ ...courseMultiplier, enabled: value === 'true' })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="multiplier-source">Source</Label>
            <Select
              value={courseMultiplier.source}
              onValueChange={(value) => setCourseMultiplier({ ...courseMultiplier, source: value })}
              disabled={!courseMultiplier.enabled}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="course_tier">Course Tier</SelectItem>
                <SelectItem value="manual">Manual Override</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    </div>
  )
}
