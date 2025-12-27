import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Pages (placeholders for now)
import Login from '@/pages/Login'
import Leaderboard from '@/pages/Leaderboard'
import Rounds from '@/pages/Rounds'
import Podcast from '@/pages/Podcast'
import Activity from '@/pages/Activity'
import Betting from '@/pages/Betting'
import Dashboard from '@/pages/Dashboard'
import About from '@/pages/About'
import NotFound from '@/pages/NotFound'

// Admin pages
import ControlCenter from '@/pages/admin/ControlCenter'
import BettingControls from '@/pages/admin/BettingControls'
import ProcessScorecards from '@/pages/admin/ProcessScorecards'

// Layout wrapper for authenticated pages
import AppLayout from '@/components/layout/AppLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/leaderboard" replace />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rounds" element={<Rounds />} />
          <Route path="/podcast" element={<Podcast />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/betting" element={<Betting />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/about" element={<About />} />

          {/* Admin routes */}
          <Route path="/admin/control-center" element={<ControlCenter />} />
          <Route path="/admin/betting-controls" element={<BettingControls />} />
          <Route path="/admin/process-scorecards" element={<ProcessScorecards />} />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
