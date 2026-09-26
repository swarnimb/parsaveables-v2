import { describe, it, expect } from 'vitest'
import { processScorecard, rankPlayers } from './scoringService'
import { calculatePoints } from './pointsService'

// Eastway Park — Beastway Longs (Queen City round 1)
const PARS = [3, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3, 4, 5]
const holes = PARS.map((par, i) => ({ hole: i + 1, par }))

const card = (name, holeByHole) => ({
  name,
  holeByHole,
  totalScore: holeByHole.reduce((s, v) => s + v, 0) - PARS.reduce((s, v) => s + v, 0),
})

const scorecardData = {
  courseName: 'Eastway Park',
  holes,
  players: [
    card('Jabba the Putt', [3, 4, 4, 3, 3, 3, 4, 3, 4, 3, 3, 3, 5, 4, 4, 2, 4, 7]),
    card('Jaguar', [4, 5, 5, 5, 3, 4, 4, 3, 4, 3, 4, 4, 3, 4, 3, 3, 4, 6]),
    card('Intern Line Cook', [3, 4, 6, 2, 5, 3, 3, 5, 5, 3, 4, 3, 3, 5, 3, 3, 5, 6]),
    card('Xerxes', [3, 5, 6, 3, 4, 3, 3, 4, 3, 3, 3, 4, 3, 5, 4, 3, 5, 7]),
  ],
}

const rankOf = (players, name) => players.find(p => p.name === name).rank

describe('rankPlayers', () => {
  it('shares the rank when all configured tie-breakers match (pars are not a tie-breaker)', () => {
    const { players } = processScorecard(scorecardData, ['aces', 'eagles', 'birdies', 'earliest_birdie'])

    expect(rankOf(players, 'Jabba the Putt')).toBe(1)
    expect(rankOf(players, 'Intern Line Cook')).toBe(2)
    expect(rankOf(players, 'Jaguar')).toBe(3)
    expect(rankOf(players, 'Xerxes')).toBe(3)
  })

  it('uses the default Rules tab order when none is configured', () => {
    const { players } = processScorecard(scorecardData)
    expect(rankOf(players, 'Jaguar')).toBe(rankOf(players, 'Xerxes'))
  })

  it('follows the configured order', () => {
    const a = { name: 'A', totalScore: 0, aces: 1, birdies: 0, holeByHole: PARS }
    const b = { name: 'B', totalScore: 0, aces: 0, birdies: 3, holeByHole: PARS }

    expect(rankPlayers([b, a], holes, ['aces', 'birdies'])[0].name).toBe('A')
    expect(rankPlayers([a, b], holes, ['birdies', 'aces'])[0].name).toBe('B')
  })

  it('ignores blank tie-breakers and shares the rank when none apply', () => {
    const a = { name: 'A', totalScore: 0, birdies: 0, holeByHole: PARS }
    const b = { name: 'B', totalScore: 0, birdies: 3, holeByHole: PARS }
    const c = { name: 'C', totalScore: 2, birdies: 0, holeByHole: PARS }

    expect(rankPlayers([a, b, c], holes, ['', '', '', '']).map(p => p.rank)).toEqual([1, 1, 3])
  })

  it('gives tied players the same averaged rank points', () => {
    const { players } = processScorecard(scorecardData)
    const configuration = {
      pointsSystem: { name: 'Test', config: { rank_points: { 1: 15, 2: 12, 3: 9, 4: 7, default: 2 } } },
      course: { multiplier: 1 },
    }
    const withPoints = calculatePoints(players, configuration)
    const points = name => withPoints.find(p => p.name === name).points

    expect(points('Jaguar').rankPoints).toBe(8)
    expect(points('Xerxes').rankPoints).toBe(8)
    expect(points('Jaguar').finalTotal).toBe(points('Xerxes').finalTotal)
  })
})
