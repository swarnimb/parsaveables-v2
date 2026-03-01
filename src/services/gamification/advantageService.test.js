import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as advantageService from './advantageService'
import * as pulpService from './pulpService'
import { BusinessLogicError } from '@/utils/errors'

// Services use createClient() directly, so mock the supabase-js module itself.
const { mockSupabase } = vi.hoisted(() => {
  const mockSupabase = { from: vi.fn() }
  return { mockSupabase }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
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
      // Mock 1: pulpy_windows validation → open
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'window-123', status: 'open' },
          error: null,
        }),
      })

      // Mock 2: advantage_catalog lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            advantage_key: 'mulligan',
            name: 'Mulligan',
            pulp_cost: 150,
            expiration_hours: 24,
          },
          error: null,
        }),
      })

      // Mock 3: player fetch (no existing advantages)
      mockSupabase.from.mockReturnValueOnce({
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

      // Mock 4: player update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            active_advantages: [
              {
                advantage_key: 'mulligan',
                purchased_at: new Date().toISOString(),
                expires_at: new Date().toISOString(),
                used_at: null,
                round_id: null,
              },
            ],
          },
          error: null,
        }),
      })

      const result = await advantageService.purchaseAdvantage(1, 'mulligan', 'window-123')

      // Verify PULP deduction happened
      expect(pulpService.deductTransaction).toHaveBeenCalledWith(
        1,
        150,
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
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      // Mock 1: pulpy_windows validation → open
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'window-123', status: 'open' },
          error: null,
        }),
      })

      // Mock 2: advantage_catalog lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            advantage_key: 'mulligan',
            name: 'Mulligan',
            pulp_cost: 150,
            expiration_hours: 24,
          },
          error: null,
        }),
      })

      // Mock 3: player fetch (already has active mulligan)
      mockSupabase.from.mockReturnValueOnce({
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

      // Should throw because of duplicate active advantage
      await expect(
        advantageService.purchaseAdvantage(1, 'mulligan', 'window-123')
      ).rejects.toThrow(BusinessLogicError)

      // PULP should NOT be deducted
      expect(pulpService.deductTransaction).not.toHaveBeenCalled()
    })

    it('should allow purchasing same advantage after previous one expired', async () => {
      const pastDate = new Date(Date.now() - 1000).toISOString()

      // Mock 1: pulpy_windows validation → open
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'window-123', status: 'open' },
          error: null,
        }),
      })

      // Mock 2: advantage_catalog lookup
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            advantage_key: 'mulligan',
            name: 'Mulligan',
            pulp_cost: 150,
            expiration_hours: 24,
          },
          error: null,
        }),
      })

      // Mock 3: player fetch (has expired mulligan)
      mockSupabase.from.mockReturnValueOnce({
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

      // Mock 4: player update
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 1,
            active_advantages: [
              { advantage_key: 'mulligan', expires_at: pastDate, used_at: null, round_id: null },
              { advantage_key: 'mulligan', purchased_at: new Date().toISOString(), used_at: null, round_id: null },
            ],
          },
          error: null,
        }),
      })

      const result = await advantageService.purchaseAdvantage(1, 'mulligan', 'window-123')

      // Should succeed because previous advantage is expired
      expect(pulpService.deductTransaction).toHaveBeenCalled()
      expect(result.player.active_advantages).toHaveLength(2)
    })
  })
})
