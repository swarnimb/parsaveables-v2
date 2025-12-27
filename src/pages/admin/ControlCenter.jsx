import { Settings, Lock, FileText, Users, Trophy, Coins } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'

export default function ControlCenter() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Admin Control Center</h1>
        <p className="text-muted-foreground">
          Manage all aspects of ParSaveables
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Betting Controls */}
        <Link to="/admin/betting-controls">
          <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Betting Controls</h3>
                <p className="text-sm text-muted-foreground">
                  Lock betting for upcoming events
                </p>
              </div>
            </div>
          </Card>
        </Link>

        {/* Process Scorecards */}
        <Link to="/admin/process-scorecards">
          <Card className="p-6 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Process Scorecards</h3>
                <p className="text-sm text-muted-foreground">
                  Manually trigger scorecard processing
                </p>
              </div>
            </div>
          </Card>
        </Link>

        {/* Manage Players */}
        <Card className="p-6 opacity-50">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Manage Players</h3>
              <p className="text-sm text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </div>
        </Card>

        {/* Manage Achievements */}
        <Card className="p-6 opacity-50">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Achievement Catalog</h3>
              <p className="text-sm text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </div>
        </Card>

        {/* PULP Management */}
        <Card className="p-6 opacity-50">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Coins className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">PULP Management</h3>
              <p className="text-sm text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </div>
        </Card>

        {/* System Settings */}
        <Card className="p-6 opacity-50">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-500/10 flex items-center justify-center flex-shrink-0">
              <Settings className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">System Settings</h3>
              <p className="text-sm text-muted-foreground">
                Coming soon...
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Admin Access Warning */}
      <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
        <p className="text-sm text-yellow-600 font-semibold mb-1">
          ⚠️ Admin Access
        </p>
        <p className="text-sm text-muted-foreground">
          All authenticated users currently have access to admin controls. In production, implement proper admin role checks.
        </p>
      </div>
    </div>
  )
}
