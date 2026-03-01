import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eventAPI } from './api'

// Mock Supabase - inline to avoid hoisting issues
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}))

describe('eventAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllEvents', () => {
    it('should fetch all events sorted by year and date', async () => {
      const mockEvents = [
        { id: 1, name: 'Season 2025', type: 'season', year: 2025 },
        { id: 2, name: 'Season 2024', type: 'season', year: 2024 },
      ]

      // Mock the Supabase chain
      const { supabase } = await import('./supabase')
      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: mockEvents, error: null })),
      })

      const result = await eventAPI.getAllEvents()

      expect(supabase.from).toHaveBeenCalledWith('events')
      expect(result).toEqual(mockEvents)
    })

    it('should throw error if fetch fails', async () => {
      const { supabase } = await import('./supabase')
      const mockError = new Error('Database error')

      supabase.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: vi.fn((cb) => cb({ data: null, error: mockError })),
      })

      await expect(eventAPI.getAllEvents()).rejects.toThrow('Database error')
    })
  })

  describe('getLeaderboardForEvent', () => {
    it('should aggregate player stats correctly for tournaments', async () => {
      const mockRounds = [
        {
          registered_players: { player_name: 'Player1' },
          final_total: 10.5,
          rank: 1,
          birdies: 3,
          eagles: 1,
          aces: 0,
          total_score: 52,
        },
        {
          registered_players: { player_name: 'Player1' },
          final_total: 8.0,
          rank: 2,
          birdies: 2,
          eagles: 0,
          aces: 0,
          total_score: 54,
        },
        {
          registered_players: { player_name: 'Player2' },
          final_total: 9.0,
          rank: 1,
          birdies: 2,
          eagles: 0,
          aces: 1,
          total_score: 53,
        },
      ]

      const { supabase } = await import('./supabase')

      // Mock event fetch (tournament)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { type: 'tournament' },
          error: null,
        }),
      })

      // Mock event_players fetch (no players explicitly assigned — show all)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      // Mock player_rounds fetch
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockRounds,
          error: null,
        }),
      })

      const result = await eventAPI.getLeaderboardForEvent(1)

      // Player1 should have total_points = 10.5 + 8.0 = 18.5 (all rounds for tournament)
      const player1 = result.find((p) => p.player_name === 'Player1')
      expect(player1.total_points).toBe(18.5)
      expect(player1.rounds_played).toBe(2)
      expect(player1.wins).toBe(1)
      expect(player1.podiums).toBe(2)
      expect(player1.total_birdies).toBe(5)
      expect(player1.best_score).toBe(52)
    })

    it('should use top 10 scores only for seasons', async () => {
      const mockRounds = Array.from({ length: 12 }, (_, i) => ({
        registered_players: { player_name: 'Player1' },
        final_total: 10 - i, // Descending scores: 10, 9, 8, ..., -1
        rank: i % 3 === 0 ? 1 : 2,
        birdies: 2,
        eagles: 0,
        aces: 0,
        total_score: 52 + i,
      }))

      const { supabase } = await import('./supabase')

      // Mock event fetch (season)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { type: 'season' },
          error: null,
        }),
      })

      // Mock event_players fetch (no players explicitly assigned — show all)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      // Mock player_rounds fetch
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockRounds,
          error: null,
        }),
      })

      const result = await eventAPI.getLeaderboardForEvent(1)

      // Top 10 scores: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 = 55
      const player1 = result[0]
      expect(player1.total_points).toBe(55)
      expect(player1.rounds_played).toBe(12)
    })
  })
})
