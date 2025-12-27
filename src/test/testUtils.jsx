import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

/**
 * Custom render function that wraps components with necessary providers
 */
export function renderWithRouter(ui, options = {}) {
  return render(ui, {
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    ...options,
  })
}

/**
 * Mock Supabase client for testing
 */
export const createMockSupabaseClient = () => ({
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  })),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: null, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
})

/**
 * Mock player data for tests
 */
export const mockPlayer = {
  id: 1,
  player_name: 'Test Player',
  user_id: 'test-user-id',
  pulp_balance: 100,
  active: true,
  created_at: '2025-01-01T00:00:00Z',
}

/**
 * Mock event data for tests
 */
export const mockEvent = {
  id: 1,
  name: 'Season 2025',
  type: 'season',
  year: 2025,
  is_active: true,
  betting_lock_time: null,
}

/**
 * Mock leaderboard player data
 */
export const mockLeaderboardPlayers = [
  {
    player_name: 'Shogun',
    total_points: 290.5,
    rounds_played: 27,
    wins: 8,
    podiums: 15,
    total_birdies: 45,
    total_eagles: 3,
    total_aces: 1,
    best_score: 52,
  },
  {
    player_name: 'Jabba the Putt',
    total_points: 272.5,
    rounds_played: 33,
    wins: 6,
    podiums: 18,
    total_birdies: 38,
    total_eagles: 2,
    total_aces: 0,
    best_score: 54,
  },
  {
    player_name: 'Bird',
    total_points: 243.5,
    rounds_played: 27,
    wins: 9,
    podiums: 23,
    total_birdies: 42,
    total_eagles: 4,
    total_aces: 2,
    best_score: 51,
  },
]
