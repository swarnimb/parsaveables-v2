import { useState, useEffect } from 'react'
import { Lock } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import PageContainer from '@/components/layout/PageContainer'
import TournamentsTab from '@/components/admin/TournamentsTab'
import PlayersTab from '@/components/admin/PlayersTab'
import CoursesTab from '@/components/admin/CoursesTab'
import EventsTab from '@/components/admin/EventsTab'
import RulesTab from '@/components/admin/RulesTab'

export default function ControlCenter() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('tournaments')

  // Check if already authenticated on mount
  useEffect(() => {
    const authFlag = sessionStorage.getItem('controlCenterAuth')
    if (authFlag === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    setError('')

    const correctPassword = import.meta.env.VITE_CONTROL_CENTER_PASSWORD

    if (!correctPassword) {
      setError('Control Center password not configured')
      return
    }

    if (password === correctPassword) {
      sessionStorage.setItem('controlCenterAuth', 'true')
      setIsAuthenticated(true)
      setPassword('')
    } else {
      setError('Incorrect password')
      setPassword('')
    }
  }

  // Password Modal
  if (!isAuthenticated) {
    return (
      <Dialog open={true}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Control Center Access</DialogTitle>
            <DialogDescription className="text-center">
              Enter the admin password to access the Control Center
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1.5"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full">
              Unlock
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  // Main Control Center UI
  return (
    <PageContainer className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Control Center</h1>
        <p className="text-muted-foreground mt-1">
          Manage tournaments, players, courses, events, and rules
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 max-w-4xl">
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        {/* Tournaments Tab */}
        <TabsContent value="tournaments">
          <TournamentsTab />
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players">
          <PlayersTab />
        </TabsContent>

        {/* Courses Tab */}
        <TabsContent value="courses">
          <CoursesTab />
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <EventsTab />
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <RulesTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
