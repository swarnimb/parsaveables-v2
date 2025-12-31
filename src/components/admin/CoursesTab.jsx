import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/services/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'

// Tier multiplier mapping
const TIER_MULTIPLIERS = {
  1: 1.0,
  2: 1.5,
  3: 2.0,
  4: 2.5
}

export default function CoursesTab() {
  const { toast } = useToast()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editDialog, setEditDialog] = useState({ open: false, course: null })
  const [deleteDialog, setDeleteDialog] = useState({ open: false, course: null })
  const [formData, setFormData] = useState({
    course_name: '',
    tier: 2
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
    setError('')
    setFormData({
      course_name: '',
      tier: 2
    })
    setEditDialog({ open: true, course: null })
  }

  const handleEdit = (course) => {
    setError('')
    setFormData({
      course_name: course.course_name,
      tier: course.tier
    })
    setEditDialog({ open: true, course })
  }

  const handleSave = async () => {
    try {
      setError('')
      setSaving(true)

      // Validation
      if (!formData.course_name) {
        setError('Course name is required')
        return
      }

      // Auto-set multiplier based on tier
      const multiplier = TIER_MULTIPLIERS[formData.tier] || 1.5

      const saveData = {
        course_name: formData.course_name,
        tier: formData.tier,
        multiplier,
        active: true // Always active by default
      }

      if (editDialog.course) {
        // Update existing
        const { error } = await supabase
          .from('courses')
          .update(saveData)
          .eq('id', editDialog.course.id)

        if (error) throw error

        toast({
          title: 'Course updated',
          description: `${formData.course_name} has been updated successfully`
        })
      } else {
        // Create new
        const { error } = await supabase
          .from('courses')
          .insert([saveData])

        if (error) throw error

        toast({
          title: 'Course created',
          description: `${formData.course_name} has been added successfully`
        })
      }

      setEditDialog({ open: false, course: null })
      await fetchCourses()
    } catch (err) {
      console.error('Error saving course:', err)
      setError(err.message || 'Failed to save course')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save course'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setError('')
      setDeleting(true)

      // Check if any rounds reference this course
      const { data: rounds, error: checkError } = await supabase
        .from('rounds')
        .select('id')
        .eq('course_name', deleteDialog.course.course_name)
        .limit(1)

      if (checkError) throw checkError

      if (rounds && rounds.length > 0) {
        setError('Cannot delete course - it is referenced by existing rounds.')
        return
      }

      // Safe to delete
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', deleteDialog.course.id)

      if (error) throw error

      toast({
        title: 'Course deleted',
        description: `${deleteDialog.course.course_name} has been deleted successfully`
      })

      setDeleteDialog({ open: false, course: null })
      await fetchCourses()
    } catch (err) {
      console.error('Error deleting course:', err)
      setError(err.message || 'Failed to delete course')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete course'
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading courses...</div>
  }

  // Group courses by tier
  const coursesByTier = courses.reduce((acc, course) => {
    const tier = course.tier
    if (!acc[tier]) acc[tier] = []
    acc[tier].push(course)
    return acc
  }, {})

  const tiers = [1, 2, 3, 4] // All possible tiers

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-end">
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* Courses Grouped by Tier */}
      {courses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No courses yet. Add your first course!</p>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={tiers.map(t => `tier-${t}`)} className="space-y-2">
          {tiers.map(tier => {
            const tierCourses = coursesByTier[tier] || []
            const multiplier = TIER_MULTIPLIERS[tier]

            if (tierCourses.length === 0) return null

            return (
              <AccordionItem key={tier} value={`tier-${tier}`} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">Tier {tier}</h3>
                    <span className="text-sm text-muted-foreground">{multiplier}x multiplier</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-4">
                  <div className="space-y-2">
                    {tierCourses.map(course => (
                      <Card key={course.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{course.course_name}</h4>
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
                              onClick={() => {
                                setError('')
                                setDeleteDialog({ open: true, course })
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
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

            <div>
              <Label htmlFor="tier">Difficulty Tier *</Label>
              <Select
                value={formData.tier.toString()}
                onValueChange={(value) => setFormData({ ...formData, tier: parseInt(value) })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1 (1x)</SelectItem>
                  <SelectItem value="2">Tier 2 (1.5x)</SelectItem>
                  <SelectItem value="3">Tier 3 (2x)</SelectItem>
                  <SelectItem value="4">Tier 4 (2.5x)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Points multiplier is automatically set based on tier level
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setEditDialog({ open: false, course: null })
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (editDialog.course ? 'Save Changes' : 'Create')}
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
              Are you sure you want to delete "{deleteDialog.course?.course_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setError('')
              setDeleteDialog({ open: false, course: null })
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
