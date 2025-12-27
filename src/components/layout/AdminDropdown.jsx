import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Lock, FileText, ChevronDown } from 'lucide-react'

export default function AdminDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg transition-colors"
        aria-label="Admin menu"
      >
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Settings className="h-4 w-4" />
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-lg shadow-lg z-50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium">Admin Tools</p>
              <p className="text-sm text-muted-foreground">Manage the app</p>
            </div>

            {/* Menu items */}
            <div className="py-2">
              <Link
                to="/admin/control-center"
                className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4" />
                <span>Control Center</span>
              </Link>

              <Link
                to="/admin/betting-controls"
                className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Lock className="h-4 w-4" />
                <span>Betting Controls</span>
              </Link>

              <Link
                to="/admin/process-scorecards"
                className="flex items-center gap-3 px-4 py-2 hover:bg-accent transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <FileText className="h-4 w-4" />
                <span>Process Scorecards</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
