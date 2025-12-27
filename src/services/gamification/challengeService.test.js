import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as challengeService from './challengeService'
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
      or: vi.fn().mockReturnThis(),
      in: vi.fn(),
      single: vi.fn(),
    })),
    raw: vi.fn((sql) => sql),
  },
}))

vi.mock('./pulpService', () => ({
  deductTransaction: vi.fn(),
  addTransaction: vi.fn(),
}))

describe('challengeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('issueChallenge', () => {
    it('should deduct wager from challenger when issuing challenge', async () => {
      const { supabase } = await import('../supabase')

      // Mock existing challenge check (none exists)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      // Mock challenge creation
      supabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            round_id: 'round-456',
            challenger_id: 1,
            challenged_id: 2,
            wager_amount: 100,
            status: 'pending',
          },
          error: null,
        }),
      })

      const result = await challengeService.issueChallenge(1, 2, 'round-456', 100)

      // Verify wager deducted from challenger
      expect(pulpService.deductTransaction).toHaveBeenCalledWith(
        1,
        100,
        'challenge_loss',
        'Challenge issued to player 2',
        { round_id: 'round-456', challenged_id: 2 }
      )

      expect(result.status).toBe('pending')
      expect(result.wager_amount).toBe(100)
    })

    it('should reject challenge with wager below minimum (20 PULPs)', async () => {
      await expect(
        challengeService.issueChallenge(1, 2, 'round-456', 15)
      ).rejects.toThrow('Minimum challenge wager is 20 PULPs')

      expect(pulpService.deductTransaction).not.toHaveBeenCalled()
    })

    it('should reject self-challenge', async () => {
      await expect(
        challengeService.issueChallenge(1, 1, 'round-456', 100)
      ).rejects.toThrow('Cannot challenge yourself')

      expect(pulpService.deductTransaction).not.toHaveBeenCalled()
    })
  })

  describe('respondToChallenge', () => {
    it('should deduct wager from challenged player when accepting', async () => {
      const { supabase } = await import('../supabase')

      // Mock challenge fetch
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            round_id: 'round-456',
            challenger_id: 1,
            challenged_id: 2,
            wager_amount: 100,
            status: 'pending',
          },
          error: null,
        }),
      })

      // Mock challenge update
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            status: 'accepted',
            responded_at: expect.any(String),
          },
          error: null,
        }),
      })

      const result = await challengeService.respondToChallenge('challenge-123', 2, true)

      // Verify wager deducted from challenged player
      expect(pulpService.deductTransaction).toHaveBeenCalledWith(
        2,
        100,
        'challenge_loss',
        'Challenge accepted from player 1',
        { challenge_id: 'challenge-123', round_id: 'round-456' }
      )

      expect(result.status).toBe('accepted')
    })

    it('should charge 50% cowardice tax when rejecting', async () => {
      const { supabase } = await import('../supabase')

      // Mock challenge fetch
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            round_id: 'round-456',
            challenger_id: 1,
            challenged_id: 2,
            wager_amount: 100,
            status: 'pending',
          },
          error: null,
        }),
      })

      // Mock challenge update
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            status: 'rejected',
            cowardice_tax_paid: 50,
            responded_at: expect.any(String),
          },
          error: null,
        }),
      })

      // Mock challenges_declined increment
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await challengeService.respondToChallenge('challenge-123', 2, false)

      // Verify cowardice tax (50% of wager = 50 PULPs)
      expect(pulpService.deductTransaction).toHaveBeenCalledWith(
        2,
        50,
        'challenge_rejected_penalty',
        'Cowardice tax for rejecting challenge from player 1',
        { challenge_id: 'challenge-123', round_id: 'round-456' }
      )

      // Verify refund to challenger
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        1,
        100,
        'admin_adjustment',
        'Challenge rejected - wager refunded',
        { challenge_id: 'challenge-123', round_id: 'round-456' }
      )

      expect(result.status).toBe('rejected')
      expect(result.cowardice_tax_paid).toBe(50)
    })
  })

  describe('resolveChallenge', () => {
    it('should award 2x wager to winner (lower score)', async () => {
      const { supabase } = await import('../supabase')

      // Mock challenge fetch
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            round_id: 'round-456',
            challenger_id: 1,
            challenged_id: 2,
            wager_amount: 100,
            status: 'accepted',
          },
          error: null,
        }),
      })

      // Mock player scores (challenger wins with lower score)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              player_name: 'Shogun',
              total_strokes: 52,
              registered_players: { id: 1 },
            },
            {
              player_name: 'Jabba',
              total_strokes: 58,
              registered_players: { id: 2 },
            },
          ],
          error: null,
        }),
      })

      // Mock challenge update
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            status: 'resolved',
            winner_id: 1,
            resolved_at: expect.any(String),
          },
          error: null,
        }),
      })

      const result = await challengeService.resolveChallenge('challenge-123')

      // Verify winner receives 2x wager (200 PULPs)
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        1,
        200, // 100 * 2
        'challenge_win',
        'Challenge won against player 2',
        { challenge_id: 'challenge-123', round_id: 'round-456' }
      )

      expect(result.result).toBe('winner')
      expect(result.winnerId).toBe(1)
      expect(result.loserId).toBe(2)
      expect(result.payout).toBe(200)
    })

    it('should refund both players on tie', async () => {
      const { supabase } = await import('../supabase')

      // Mock challenge fetch
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            round_id: 'round-456',
            challenger_id: 1,
            challenged_id: 2,
            wager_amount: 100,
            status: 'accepted',
          },
          error: null,
        }),
      })

      // Mock player scores (tie - same score)
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              player_name: 'Shogun',
              total_strokes: 55,
              registered_players: { id: 1 },
            },
            {
              player_name: 'Jabba',
              total_strokes: 55,
              registered_players: { id: 2 },
            },
          ],
          error: null,
        }),
      })

      // Mock challenge update
      supabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            status: 'resolved',
            winner_id: null,
            resolved_at: expect.any(String),
          },
          error: null,
        }),
      })

      const result = await challengeService.resolveChallenge('challenge-123')

      // Verify both players get refund (100 PULPs each)
      expect(pulpService.addTransaction).toHaveBeenCalledTimes(2)
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        1,
        100,
        'admin_adjustment',
        'Challenge tied - wager refunded',
        { challenge_id: 'challenge-123', round_id: 'round-456' }
      )
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        2,
        100,
        'admin_adjustment',
        'Challenge tied - wager refunded',
        { challenge_id: 'challenge-123', round_id: 'round-456' }
      )

      expect(result.result).toBe('tie')
      expect(result.challenge.winner_id).toBeNull()
    })
  })
})
