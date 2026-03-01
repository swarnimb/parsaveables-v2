import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

// Eagerly load frequently accessed pages for instant navigation
import Login from '@/pages/Login'
import Leaderboard from '@/pages/Leaderboard'
import Rounds from '@/pages/Rounds'
import Activity from '@/pages/Activity'
import Pulps from '@/pages/Pulps'
import Dashboard from '@/pages/Dashboard'

// Lazy load less frequently accessed pages
const Podcast = lazy(() => import('@/pages/Podcast'))
const About = lazy(() => import('@/pages/About'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const ControlCenter = lazy(() => import('@/pages/admin/ControlCenter'))
const ProcessScorecards = lazy(() => import('@/pages/admin/ProcessScorecards'))

// Layout wrapper for authenticated pages
import AppLayout from '@/components/layout/AppLayout'
import SplashScreen from '@/components/layout/SplashScreen'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import OfflineDetector from '@/components/shared/OfflineDetector'
import { Toaster } from '@/components/ui/toaster'

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

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes with layout */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rounds" element={<Rounds />} />
          <Route path="/podcast" element={<Suspense fallback={<PageLoader />}><Podcast /></Suspense>} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/pulps" element={<Pulps />} />
          {/* Legacy redirect — /betting → /pulps */}
          <Route path="/betting" element={<Navigate to="/pulps" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/about" element={<Suspense fallback={<PageLoader />}><About /></Suspense>} />

          {/* Admin routes */}
          <Route path="/admin/control-center" element={<Suspense fallback={<PageLoader />}><ControlCenter /></Suspense>} />
          <Route path="/admin/process-scorecards" element={<Suspense fallback={<PageLoader />}><ProcessScorecards /></Suspense>} />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SplashScreen />
        <OfflineDetector />
        <AnimatedRoutes />
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
