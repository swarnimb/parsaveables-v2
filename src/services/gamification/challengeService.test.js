import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as challengeService from './challengeService'
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

describe('challengeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('issueChallenge', () => {
    it('should deduct wager from challenger when issuing challenge', async () => {
      // Mock 1: pulpy_windows validation → open
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'window-123', status: 'open' },
          error: null,
        }),
      })

      // Mock 2: existing challenge check (none for this challenger+window)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      // Mock 3: rank validation — find current season event
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
      })

      // Mock 4: rank validation — player_rounds totals (challenger ranks lower)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { player_id: 1, final_total: 10 },  // challenger (lower season points)
            { player_id: 2, final_total: 50 },  // challenged (higher season points)
          ],
          error: null,
        }),
      })

      // Mock 5: pending challenge check for challengee (none)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      // Mock 6: challenge insert
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            challenger_id: 1,
            challenged_id: 2,
            window_id: 'window-123',
            wager_amount: 100,
            status: 'pending',
          },
          error: null,
        }),
      })

      const result = await challengeService.issueChallenge(1, 2, 'window-123', 100)

      // Verify wager deducted from challenger
      expect(pulpService.deductTransaction).toHaveBeenCalledWith(
        1,
        100,
        'challenge_loss',
        'Challenge issued to player 2',
        { window_id: 'window-123', challenged_id: 2 }
      )

      expect(result.status).toBe('pending')
      expect(result.wager_amount).toBe(100)
    })

    it('should reject challenge with wager below minimum (20 PULPs)', async () => {
      await expect(
        challengeService.issueChallenge(1, 2, 'window-123', 15)
      ).rejects.toThrow('Minimum challenge wager is 20 PULPs')

      expect(pulpService.deductTransaction).not.toHaveBeenCalled()
    })

    it('should reject self-challenge', async () => {
      await expect(
        challengeService.issueChallenge(1, 1, 'window-123', 100)
      ).rejects.toThrow('Cannot challenge yourself')

      expect(pulpService.deductTransaction).not.toHaveBeenCalled()
    })
  })

  describe('respondToChallenge', () => {
    it('should deduct wager from challenged player when accepting', async () => {
      // Mock 1: challenge fetch (includes window_id)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            window_id: 'window-456',
            challenger_id: 1,
            challenged_id: 2,
            wager_amount: 100,
            status: 'pending',
          },
          error: null,
        }),
      })

      // Mock 2: window status check → open
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { status: 'open' },
          error: null,
        }),
      })

      // Mock 3: challenge update → accepted
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            status: 'accepted',
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
        { challenge_id: 'challenge-123', window_id: 'window-456' }
      )

      expect(result.status).toBe('accepted')
    })

    it('should charge 50% burn when declining', async () => {
      // Mock 1: challenge fetch (includes window_id)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            window_id: 'window-456',
            challenger_id: 1,
            challenged_id: 2,
            wager_amount: 100,
            status: 'pending',
          },
          error: null,
        }),
      })

      // Mock 2: window status check → open
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { status: 'open' },
          error: null,
        }),
      })

      // Mock 3: player challenges_declined fetch → null (skip update)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      // Mock 4: challenge update → declined
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'challenge-123',
            status: 'declined',
            cowardice_tax_paid: 50,
          },
          error: null,
        }),
      })

      const result = await challengeService.respondToChallenge('challenge-123', 2, false)

      // Verify 50% burn from challengee
      expect(pulpService.deductTransaction).toHaveBeenCalledWith(
        2,
        50,
        'challenge_declined_burn',
        'Cowardice tax for declining challenge from player 1',
        { challenge_id: 'challenge-123', window_id: 'window-456' }
      )

      // Verify refund to challenger
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        1,
        100,
        'admin_adjustment',
        'Challenge declined — wager refunded',
        { challenge_id: 'challenge-123', window_id: 'window-456' }
      )

      expect(result.status).toBe('declined')
      expect(result.cowardice_tax_paid).toBe(50)
    })
  })

  describe('resolveChallengesForWindow', () => {
    it('should award 2x wager to winner (lower score)', async () => {
      const mockChallenge = {
        id: 'challenge-123',
        challenger_id: 1,
        challenged_id: 2,
        wager_amount: 100,
        window_id: 'window-123',
        status: 'accepted',
      }

      // Mock 1: get accepted challenges for window (double .eq() — use thenable)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve) => resolve({ data: [mockChallenge], error: null }),
      })

      // Mock 2: player_rounds scores (challenger wins with lower strokes)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { total_strokes: 52, registered_players: { id: 1 } },
            { total_strokes: 58, registered_players: { id: 2 } },
          ],
          error: null,
        }),
      })

      // Mock 3: challenge update (mark resolved)
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await challengeService.resolveChallengesForWindow('window-123', 'round-456')

      // Verify winner receives 2x wager (200 PULPs)
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        1,
        200,
        'challenge_win',
        'Challenge won against player 2',
        { challenge_id: 'challenge-123', round_id: 'round-456', window_id: 'window-123' }
      )

      expect(result.total).toBe(1)
      expect(result.resolved).toBe(1)
    })

    it('should refund both players on tie', async () => {
      const mockChallenge = {
        id: 'challenge-123',
        challenger_id: 1,
        challenged_id: 2,
        wager_amount: 100,
        window_id: 'window-123',
        status: 'accepted',
      }

      // Mock 1: get accepted challenges for window
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve) => resolve({ data: [mockChallenge], error: null }),
      })

      // Mock 2: player_rounds scores (tie — same strokes)
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            { total_strokes: 55, registered_players: { id: 1 } },
            { total_strokes: 55, registered_players: { id: 2 } },
          ],
          error: null,
        }),
      })

      // Mock 3: challenge update (mark resolved, no winner)
      mockSupabase.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const result = await challengeService.resolveChallengesForWindow('window-123', 'round-456')

      // Verify both players get refund
      expect(pulpService.addTransaction).toHaveBeenCalledTimes(2)
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        1,
        100,
        'admin_adjustment',
        'Challenge tied — wager refunded',
        { challenge_id: 'challenge-123', round_id: 'round-456' }
      )
      expect(pulpService.addTransaction).toHaveBeenCalledWith(
        2,
        100,
        'admin_adjustment',
        'Challenge tied — wager refunded',
        { challenge_id: 'challenge-123', round_id: 'round-456' }
      )

      expect(result.total).toBe(1)
    })
  })
})
