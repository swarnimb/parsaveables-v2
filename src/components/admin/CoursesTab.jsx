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

export default function CoursesTab() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editDialog, setEditDialog] = useState({ open: false, course: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, course: null })
  const [formData, setFormData] = useState({
    course_name: '',
    tier: 2,
    multiplier: 1.5,
    active: true
  })
  const [error, setError] = useState('')

  // Fetch courses
  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('tier', { ascending: true })
        .order('course_name', { ascending: true })

      if (error) throw error
      setCourses(data || [])
    } catch (err) {
      console.error('Error fetching courses:', err)
      setError('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      course_name: '',
      tier: 2,
      multiplier: 1.5,
      active: true
    })
    setEditDialog({ open: true, course: null })
  }

  const handleEdit = (course) => {
    setFormData({
      course_name: course.course_name,
      tier: course.tier,
      multiplier: course.multiplier,
      active: course.active
    })
    setEditDialog({ open: true, course })
  }

  const handleSave = async () => {
    try {
      setError('')

      // Validation
      if (!formData.course_name) {
        setError('Course name is required')
        return
      }

      if (editDialog.course) {
        // Update existing
        const { error } = await supabase
          .from('courses')
          .update(formData)
          .eq('id', editDialog.course.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('courses')
          .insert([formData])

        if (error) throw error
      }

      setEditDialog({ open: false, course: null })
      fetchCourses()
    } catch (err) {
      console.error('Error saving course:', err)
      setError(err.message || 'Failed to save course')
    }
  }

  const handleDelete = async () => {
    try {
      setError('')

      // Check if any rounds reference this course
      const { data: rounds, error: checkError } = await supabase
        .from('rounds')
        .select('id')
        .eq('course_name', deleteDialog.course.course_name)
        .limit(1)

      if (checkError) throw checkError

      if (rounds && rounds.length > 0) {
        setError('Cannot delete course - it is referenced by existing rounds. Set it as inactive instead.')
        return
      }

      // Safe to delete
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', deleteDialog.course.id)

      if (error) throw error

      setDeleteDialog({ open: false, course: null })
      fetchCourses()
    } catch (err) {
      console.error('Error deleting course:', err)
      setError(err.message || 'Failed to delete course')
    }
  }

  const getTierBadge = (tier) => {
    const variants = {
      1: { label: 'Tier 1', variant: 'outline' },
      2: { label: 'Tier 2', variant: 'default' },
      3: { label: 'Tier 3', variant: 'secondary' }
    }
    const { label, variant } = variants[tier] || { label: `Tier ${tier}`, variant: 'outline' }
    return <Badge variant={variant}>{label}</Badge>
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading courses...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Courses</h2>
          <p className="text-sm text-muted-foreground">Manage disc golf courses and their difficulty tiers</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Courses List */}
      {courses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No courses yet. Add your first course!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {courses.map((course) => (
            <Card key={course.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{course.course_name}</h3>
                    {getTierBadge(course.tier)}
                    <Badge variant="outline">{course.multiplier}x</Badge>
                    {!course.active && <Badge variant="secondary">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tier {course.tier} • {course.multiplier}x points multiplier
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(course)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteDialog({ open: true, course })}
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
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, course: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.course ? 'Edit Course' : 'Add Course'}
            </DialogTitle>
            <DialogDescription>
              {editDialog.course ? 'Update course details' : 'Add a new disc golf course'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="course_name">Course Name *</Label>
              <Input
                id="course_name"
                value={formData.course_name}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                placeholder="Zilker Park"
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tier">Difficulty Tier *</Label>
                <Select
                  value={formData.tier.toString()}
                  onValueChange={(value) => {
                    const tier = parseInt(value)
                    // Auto-set multiplier based on tier
                    const multipliers = { 1: 1.0, 2: 1.5, 3: 2.0 }
                    setFormData({
                      ...formData,
                      tier,
                      multiplier: multipliers[tier] || 1.5
                    })
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Tier 1 (Beginner)</SelectItem>
                    <SelectItem value="2">Tier 2 (Intermediate)</SelectItem>
                    <SelectItem value="3">Tier 3 (Advanced)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="multiplier">Points Multiplier *</Label>
                <Input
                  id="multiplier"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="3.0"
                  value={formData.multiplier}
                  onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="active">Status</Label>
              <Select
                value={formData.active.toString()}
                onValueChange={(value) => setFormData({ ...formData, active: value === 'true' })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Inactive courses won't appear in course selection dropdowns
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, course: null })}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editDialog.course ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, course: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog.course?.course_name}"? This will fail if the course is referenced by any rounds.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, course: null })}>
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
