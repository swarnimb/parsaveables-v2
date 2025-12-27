import { describe, it, expect } from 'vitest'
import { getPlayerDisplayName, getPlayerEmoji } from './playerUtils'

describe('playerUtils', () => {
  describe('getPlayerDisplayName', () => {
    it('should return empty string for null or undefined', () => {
      expect(getPlayerDisplayName(null)).toBe('')
      expect(getPlayerDisplayName(undefined)).toBe('')
      expect(getPlayerDisplayName('')).toBe('')
    })

    it('should return bird emoji for "Bird" player', () => {
      expect(getPlayerDisplayName('Bird')).toBe('🐦')
      expect(getPlayerDisplayName('bird')).toBe('🐦')
      expect(getPlayerDisplayName('BIRD')).toBe('🐦')
    })

    it('should return original name for non-Bird players', () => {
      expect(getPlayerDisplayName('Shogun')).toBe('Shogun')
      expect(getPlayerDisplayName('Jabba the Putt')).toBe('Jabba the Putt')
      expect(getPlayerDisplayName('Test Player')).toBe('Test Player')
    })
  })

  describe('getPlayerEmoji', () => {
    it('should return empty string for null or undefined', () => {
      expect(getPlayerEmoji(null)).toBe('')
      expect(getPlayerEmoji(undefined)).toBe('')
      expect(getPlayerEmoji('')).toBe('')
    })

    it('should return bird emoji for "Bird" player', () => {
      expect(getPlayerEmoji('Bird')).toBe('🐦')
      expect(getPlayerEmoji('bird')).toBe('🐦')
      expect(getPlayerEmoji('BIRD')).toBe('🐦')
    })

    it('should return empty string for non-Bird players', () => {
      expect(getPlayerEmoji('Shogun')).toBe('')
      expect(getPlayerEmoji('Jabba the Putt')).toBe('')
      expect(getPlayerEmoji('Test Player')).toBe('')
    })
  })
})
