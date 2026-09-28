import { describe, it, expect } from 'vitest'
import { calculatePoints, findSoleBirdieLeader, validatePointsBreakdown } from './pointsService'

const configuration = ({ mostBirdies = 1, multiplier = 1.0, multiplierEnabled = false } = {}) => ({
  pointsSystem: {
    name: 'Test',
    config: {
      rank_points: { 1: 10, 2: 7, 3: 5, 4: 3, default: 1 },
      performance_points: { birdie: 0, eagle: 2, ace: 5, most_birdies: mostBirdies },
      course_multiplier: { enabled: multiplierEnabled },
    },
  },
  course: { multiplier },
})

const player = (name, rank, birdies, extra = {}) => ({ name, rank, birdies, eagles: 0, aces: 0, ...extra })
const pointsOf = (players, name) => players.find(p => p.name === name).points

describe('findSoleBirdieLeader', () => {
  it('returns the player with strictly the most birdies', () => {
    const players = [player('A', 1, 4), player('B', 2, 3)]
    expect(findSoleBirdieLeader(players).name).toBe('A')
  })

  it('returns null when the lead is tied', () => {
    expect(findSoleBirdieLeader([player('A', 1, 4), player('B', 2, 4)])).toBeNull()
  })

  it('returns null when nobody birdied', () => {
    expect(findSoleBirdieLeader([player('A', 1, 0), player('B', 2, 0)])).toBeNull()
  })
})

describe('calculatePoints — most birdies bonus', () => {
  it('awards the bonus to the sole birdie leader only', () => {
    const result = calculatePoints([player('A', 1, 4), player('B', 2, 3)], configuration())
    expect(pointsOf(result, 'A')).toMatchObject({ mostBirdiesPoints: 1, finalTotal: 11 })
    expect(pointsOf(result, 'B')).toMatchObject({ mostBirdiesPoints: 0, finalTotal: 7 })
  })

  it('awards nothing when the birdie lead is tied', () => {
    const result = calculatePoints([player('A', 1, 4), player('B', 2, 4)], configuration())
    expect(result.every(p => p.points.mostBirdiesPoints === 0)).toBe(true)
  })

  it('awards nothing when the rule is set to 0', () => {
    const result = calculatePoints([player('A', 1, 4), player('B', 2, 3)], configuration({ mostBirdies: 0 }))
    expect(pointsOf(result, 'A').finalTotal).toBe(10)
  })

  it('applies the course multiplier to the bonus', () => {
    const config = configuration({ multiplier: 1.5, multiplierEnabled: true })
    const result = calculatePoints([player('A', 1, 4), player('B', 2, 3)], config)
    expect(pointsOf(result, 'A').finalTotal).toBe(16.5)
  })
})

describe('validatePointsBreakdown', () => {
  it('passes for breakdowns produced by calculatePoints', () => {
    const players = [player('A', 1, 4, { aces: 1, eagles: 1 }), player('B', 2, 3), player('C', 2, 1)]
    const config = configuration({ multiplier: 1.25, multiplierEnabled: true })
    expect(() => calculatePoints(players, config).forEach(validatePointsBreakdown)).not.toThrow()
  })

  it('throws with context when a bonus is in the total but not the breakdown', () => {
    const [a] = calculatePoints([player('A', 1, 0, { aces: 1 })], configuration())
    const broken = { ...a, points: { ...a.points, acePoints: 0 } }
    expect(() => validatePointsBreakdown(broken)).toThrow(/Points breakdown mismatch for A/)
  })
})
