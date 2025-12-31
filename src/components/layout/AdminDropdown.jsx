import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Settings, Lock, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-accent rounded-lg transition-colors"
        aria-label="Admin menu"
      >
        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
          <Settings className="h-4 w-4" />
        </div>
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
                onClick={() => setIsOpen(false)}
              >
                <motion.div
                  className="flex items-center gap-3 px-4 py-2 rounded-md bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 transition-all relative overflow-hidden"
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Animated shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{
                      x: ['-200%', '200%']
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      ease: "linear",
                      repeatDelay: 1
                    }}
                  />
                  <motion.div
                    animate={{
                      rotate: [0, -5, 5, -5, 0]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 2,
                      ease: "easeInOut"
                    }}
                  >
                    <FileText className="h-4 w-4 text-primary relative z-10" />
                  </motion.div>
                  <span className="font-medium text-primary relative z-10">Process Scorecards</span>
                </motion.div>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
