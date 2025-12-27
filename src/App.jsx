import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Lazy load pages for code splitting
const Login = lazy(() => import('@/pages/Login'))
const Leaderboard = lazy(() => import('@/pages/Leaderboard'))
const Rounds = lazy(() => import('@/pages/Rounds'))
const Podcast = lazy(() => import('@/pages/Podcast'))
const Activity = lazy(() => import('@/pages/Activity'))
const Betting = lazy(() => import('@/pages/Betting'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const About = lazy(() => import('@/pages/About'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Admin pages
const ControlCenter = lazy(() => import('@/pages/admin/ControlCenter'))
const BettingControls = lazy(() => import('@/pages/admin/BettingControls'))
const ProcessScorecards = lazy(() => import('@/pages/admin/ProcessScorecards'))

// Layout wrapper for authenticated pages
import AppLayout from '@/components/layout/AppLayout'

// Loading fallback component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

// Animated Routes Component
function AnimatedRoutes() {
  const location = useLocation()

  return (
    <Suspense fallback={<PageLoader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
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
    </AnimatePresence>
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}

export default App
