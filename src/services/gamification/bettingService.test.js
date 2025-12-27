import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as bettingService from './bettingService'
import * as pulpService from './pulpService'
import { BusinessLogicError } from '@/utils/errors'

// Mock Supabase - inline to avoid hoisting issues
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('./pulpService', () => ({
  deductTransaction: vi.fn(),
  addTransaction: vi.fn(),
}))

describe('bettingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('placeBet', () => {
    it('should deduct wager amount when placing bet', async () => {
      const { supabase } = await import('../supabase')

      // Mock event check (betting not locked)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { betting_lock_time: null },
          error: null,
        }),
      })

      // Mock existing bet check (no existing bet)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      // Mock bet creation
      supabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'bet-123',
            player_id: 1,
            round_id: 'round-456',
            event_id: 1,
            prediction_first: 'Shogun',
            prediction_second: 'Jabba',
            prediction_third: 'Bird',
            wager_amount: 50,
            status: 'pending',
          },
          error: null,
        }),
      })

      const result = await bettingService.placeBet(
        1,
        'round-456',
        1,
        { first: 'Shogun', second: 'Jabba', third: 'Bird' },
        50
      )

      // Verify wager was deducted
      expect(pulpService.deductTransaction).toHaveBeenCalledWith(
        1,
        50,
        'bet_loss',
        'Bet placed on round round-456',
        { round_id: 'round-456', event_id: 1 }
      )

      // Verify bet was created
      expect(result.wager_amount).toBe(50)
      expect(result.status).toBe('pending')
    })

    it('should reject wager below minimum (20 PULPs)', async () => {
      await expect(
        bettingService.placeBet(
          1,
          'round-456',
          1,
          { first: 'Shogun', second: 'Jabba', third: 'Bird' },
          15 // Below minimum
        )
      ).rejects.toThrow('Minimum wager is 20 PULPs')

      // PULP should NOT be deducted
      expect(pulpService.deductTransaction).not.toHaveBeenCalled()
    })

    it('should reject duplicate player predictions', async () => {
      await expect(
        bettingService.placeBet(
          1,
          'round-456',
          1,
          { first: 'Shogun', second: 'Shogun', third: 'Bird' }, // Duplicate Shogun
          50
        )
      ).rejects.toThrow('Predicted players must be different')

      // PULP should NOT be deducted
      expect(pulpService.deductTransaction).not.toHaveBeenCalled()
    })
  })

  describe('resolveBets', () => {
    it('should pay out 2x wager for perfect match', async () => {
      const { supabase } = await import('../supabase')

      // Mock actual top 3 finishers
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { player_name: 'Shogun', rank: 1 },
            { player_name: 'Jabba the Putt', rank: 2 },
            { player_name: '🐦', rank: 3 },
          ],
          error: null,
        }),
      })

      // Mock locked bets
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'bet-123',
              player_id: 1,
              prediction_first: 'Shogun',
              prediction_second: 'Jabba the Putt',
              prediction_third: '🐦',
              wager_amount: 50,
              status: 'locked',
            },
          ],
          error: null,
        }),
      })

      // Mock bet update
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await bettingService.resolveBets('round-456')

      // Verify perfect win payout (2x wager = 100 PULPs)
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        1,
        100, // 50 * 2
        'bet_win_perfect',
        'Bet won (perfect match) - 2x payout',
        { bet_id: 'bet-123', round_id: 'round-456' }
      )

      expect(result.perfectWins).toBe(1)
      expect(result.totalPaidOut).toBe(100)
    })

    it('should pay out 1x wager for partial match (right players, wrong order)', async () => {
      const { supabase } = await import('../supabase')

      // Mock actual top 3 finishers
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { player_name: 'Shogun', rank: 1 },
            { player_name: 'Jabba the Putt', rank: 2 },
            { player_name: '🐦', rank: 3 },
          ],
          error: null,
        }),
      })

      // Mock locked bets (right players, wrong order)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'bet-456',
              player_id: 2,
              prediction_first: '🐦', // Wrong order
              prediction_second: 'Shogun',
              prediction_third: 'Jabba the Putt',
              wager_amount: 30,
              status: 'locked',
            },
          ],
          error: null,
        }),
      })

      // Mock bet update
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await bettingService.resolveBets('round-456')

      // Verify partial win payout (1x wager = 30 PULPs)
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        2,
        30, // wager back
        'bet_win_partial',
        'Bet won (partial match) - wager returned',
        { bet_id: 'bet-456', round_id: 'round-456' }
      )

      expect(result.partialWins).toBe(1)
      expect(result.totalPaidOut).toBe(30)
    })

    it('should not pay out for losing bet', async () => {
      const { supabase } = await import('../supabase')

      // Mock actual top 3 finishers
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: [
            { player_name: 'Shogun', rank: 1 },
            { player_name: 'Jabba the Putt', rank: 2 },
            { player_name: '🐦', rank: 3 },
          ],
          error: null,
        }),
      })

      // Mock locked bets (completely wrong prediction)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'bet-789',
              player_id: 3,
              prediction_first: 'Player1',
              prediction_second: 'Player2',
              prediction_third: 'Player3',
              wager_amount: 40,
              status: 'locked',
            },
          ],
          error: null,
        }),
      })

      // Mock bet update
      supabase.from.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await bettingService.resolveBets('round-456')

      // Verify NO payout for losing bet
      expect(pulpService.addTransaction).not.toHaveBeenCalled()

      expect(result.losses).toBe(1)
      expect(result.totalPaidOut).toBe(0)
    })
  })
})
