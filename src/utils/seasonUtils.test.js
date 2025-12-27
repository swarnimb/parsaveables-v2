import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCurrentSeasonYear, getCurrentEvent, getSeasonName, isCurrentSeason } from './seasonUtils'

describe('seasonUtils', () => {
  describe('getCurrentSeasonYear', () => {
    it('should return current year', () => {
      const currentYear = new Date().getFullYear()
      expect(getCurrentSeasonYear()).toBe(currentYear)
    })
  })

  describe('getSeasonName', () => {
    it('should format season name correctly', () => {
      expect(getSeasonName(2025)).toBe('Season 2025')
      expect(getSeasonName(2026)).toBe('Season 2026')
    })
  })

  describe('isCurrentSeason', () => {
    beforeEach(() => {
      // Mock current date to June 15, 2025
      vi.setSystemTime(new Date('2025-06-15'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return false for null or undefined', () => {
      expect(isCurrentSeason(null)).toBe(false)
      expect(isCurrentSeason(undefined)).toBe(false)
    })

    it('should return false for non-season events', () => {
      const tournament = { type: 'tournament', name: 'Summer Tournament 2025' }
      expect(isCurrentSeason(tournament)).toBe(false)
    })

    it('should return true for current year season', () => {
      const currentSeason = { type: 'season', name: 'Season 2025' }
      expect(isCurrentSeason(currentSeason)).toBe(true)
    })

    it('should return false for past/future seasons', () => {
      const pastSeason = { type: 'season', name: 'Season 2024' }
      const futureSeason = { type: 'season', name: 'Season 2026' }
      expect(isCurrentSeason(pastSeason)).toBe(false)
      expect(isCurrentSeason(futureSeason)).toBe(false)
    })
  })

  describe('getCurrentEvent', () => {
    beforeEach(() => {
      // Mock current date to June 15, 2025
      vi.setSystemTime(new Date('2025-06-15'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return null for empty or null events array', () => {
      expect(getCurrentEvent(null)).toBe(null)
      expect(getCurrentEvent([])).toBe(null)
    })

    it('should return current year season if available', () => {
      const events = [
        { id: 1, type: 'season', name: 'Season 2024', is_active: true },
        { id: 2, type: 'season', name: 'Season 2025', is_active: true },
        { id: 3, type: 'tournament', name: 'Summer Tourney', is_active: true },
      ]
      const result = getCurrentEvent(events)
      expect(result.id).toBe(2)
      expect(result.name).toBe('Season 2025')
    })

    it('should fallback to active event if no current year season', () => {
      const events = [
        { id: 1, type: 'season', name: 'Season 2024', is_active: true },
        { id: 2, type: 'tournament', name: 'Summer Tourney', is_active: false },
      ]
      const result = getCurrentEvent(events)
      expect(result.id).toBe(1)
    })

    it('should fallback to first event if no active event', () => {
      const events = [
        { id: 1, type: 'season', name: 'Season 2024', is_active: false },
        { id: 2, type: 'tournament', name: 'Summer Tourney', is_active: false },
      ]
      const result = getCurrentEvent(events)
      expect(result.id).toBe(1)
    })
  })
})
