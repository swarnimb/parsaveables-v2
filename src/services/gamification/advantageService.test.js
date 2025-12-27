import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as advantageService from './advantageService'
import * as pulpService from './pulpService'
import { BusinessLogicError } from '@/utils/errors'

// Mock Supabase - inline to avoid hoisting issues
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}))

vi.mock('./pulpService', () => ({
  deductTransaction: vi.fn(),
  addTransaction: vi.fn(),
}))

describe('advantageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('purchaseAdvantage', () => {
    it('should deduct correct PULP amount and add advantage to player', async () => {
      const { supabase } = await import('../supabase')

      // Mock advantage catalog lookup
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            advantage_key: 'mulligan',
            name: 'Mulligan',
            pulp_cost: 120,
            expiration_hours: 24,
          },
          error: null,
        }),
      })

      // Mock player fetch (no existing advantages)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            player_name: 'Shogun',
            active_advantages: [],
          },
          error: null,
        }),
      })

      // Mock player update
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            active_advantages: [
              {
                advantage_key: 'mulligan',
                purchased_at: expect.any(String),
                expires_at: expect.any(String),
                used_at: null,
                round_id: null,
              },
            ],
          },
          error: null,
        }),
      })

      const result = await advantageService.purchaseAdvantage(1, 'mulligan')

      // Verify PULP deduction happened
      expect(pulpService.deductTransaction).toHaveBeenCalledWith(
        1,
        120,
        'advantage_purchase',
        'Purchased Mulligan',
        { advantage_key: 'mulligan' }
      )

      // Verify advantage was added
      expect(result.player.active_advantages).toHaveLength(1)
      expect(result.player.active_advantages[0].advantage_key).toBe('mulligan')
      expect(result.player.active_advantages[0].used_at).toBeNull()
    })

    it('should enforce one advantage per type limit', async () => {
      const { supabase } = await import('../supabase')

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      // Mock advantage catalog lookup
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            advantage_key: 'mulligan',
            name: 'Mulligan',
            pulp_cost: 120,
            expiration_hours: 24,
          },
          error: null,
        }),
      })

      // Mock player fetch (already has active mulligan)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            player_name: 'Shogun',
            active_advantages: [
              {
                advantage_key: 'mulligan',
                purchased_at: new Date().toISOString(),
                expires_at: futureDate,
                used_at: null,
                round_id: null,
              },
            ],
          },
          error: null,
        }),
      })

      // Should throw error
      await expect(advantageService.purchaseAdvantage(1, 'mulligan')).rejects.toThrow(
        BusinessLogicError
      )

      // PULP should NOT be deducted
      expect(pulpService.deductTransaction).not.toHaveBeenCalled()
    })

    it('should allow purchasing same advantage after previous one expired', async () => {
      const { supabase } = await import('../supabase')

      const pastDate = new Date(Date.now() - 1000).toISOString()

      // Mock advantage catalog lookup
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            advantage_key: 'mulligan',
            name: 'Mulligan',
            pulp_cost: 120,
            expiration_hours: 24,
          },
          error: null,
        }),
      })

      // Mock player fetch (has expired mulligan)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            player_name: 'Shogun',
            active_advantages: [
              {
                advantage_key: 'mulligan',
                purchased_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
                expires_at: pastDate,
                used_at: null,
                round_id: null,
              },
            ],
          },
          error: null,
        }),
      })

      // Mock player update
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            active_advantages: [
              {
                advantage_key: 'mulligan',
                purchased_at: pastDate,
                expires_at: pastDate,
                used_at: null,
                round_id: null,
              },
              {
                advantage_key: 'mulligan',
                purchased_at: expect.any(String),
                expires_at: expect.any(String),
                used_at: null,
                round_id: null,
              },
            ],
          },
          error: null,
        }),
      })

      const result = await advantageService.purchaseAdvantage(1, 'mulligan')

      // Should succeed because previous advantage is expired
      expect(pulpService.deductTransaction).toHaveBeenCalled()
      expect(result.player.active_advantages).toHaveLength(2)
    })
  })
})
