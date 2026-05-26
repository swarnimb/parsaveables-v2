/**
 * Static demo data for VITE_DEMO_MODE=true. Shapes mirror real Supabase query
 * responses so the UI renders without ever touching the network.
 *
 * The visitor is auto-signed-in as `demoUser` linked to player id=1 ("You").
 */

// --- Auth -------------------------------------------------------------------

export const demoUser = {
  id: 'demo-user-00000000-0000-0000-0000-000000000001',
  email: 'demo@parsaveables.example',
  app_metadata: { provider: 'demo' },
  user_metadata: { name: 'Demo Visitor' },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
}

export const demoSession = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_at: 9999999999,
  expires_in: 3600,
  token_type: 'bearer',
  user: demoUser,
}

// --- Players ----------------------------------------------------------------

export const players = [
  { id: 1, player_name: 'You',          user_id: demoUser.id, active: true, status: 'active', pulp_balance: 73, onboarding_completed: true, betting_interest_shown: true, betting_interest_confirmed: true, active_advantages: [] },
  { id: 2, player_name: 'Sky Tossington', user_id: null, active: true, status: 'active', pulp_balance: 92, onboarding_completed: true, betting_interest_shown: true, betting_interest_confirmed: true, active_advantages: [] },
  { id: 3, player_name: 'Vinny Cruz',   user_id: null, active: true, status: 'active', pulp_balance: 54, onboarding_completed: true, betting_interest_shown: true, betting_interest_confirmed: true, active_advantages: [] },
  { id: 4, player_name: 'Bex Patel',    user_id: null, active: true, status: 'active', pulp_balance: 110, onboarding_completed: true, betting_interest_shown: true, betting_interest_confirmed: true, active_advantages: [] },
  { id: 5, player_name: 'Mango Beaufort', user_id: null, active: true, status: 'active', pulp_balance: 38, onboarding_completed: true, betting_interest_shown: true, betting_interest_confirmed: true, active_advantages: [] },
  { id: 6, player_name: 'Quin Park',    user_id: null, active: true, status: 'active', pulp_balance: 67, onboarding_completed: true, betting_interest_shown: true, betting_interest_confirmed: true, active_advantages: [] },
  { id: 7, player_name: 'Riggs Lao',    user_id: null, active: true, status: 'active', pulp_balance: 81, onboarding_completed: true, betting_interest_shown: true, betting_interest_confirmed: true, active_advantages: [] },
  { id: 8, player_name: 'Yumi Tanaka',  user_id: null, active: true, status: 'active', pulp_balance: 45, onboarding_completed: true, betting_interest_shown: true, betting_interest_confirmed: true, active_advantages: [] },
]

export const demoPlayer = players[0]

// --- Events -----------------------------------------------------------------

export const events = [
  { id: 100, name: 'Season 2026', type: 'season',     year: 2026, start_date: '2026-01-01', end_date: '2026-12-31', is_active: true,  betting_lock_time: null },
  { id: 200, name: 'Spring Tournament 2026', type: 'tournament', year: 2026, start_date: '2026-03-01', end_date: '2026-04-30', is_active: true, betting_lock_time: null },
]

// All 8 players are in both events
export const eventPlayers = events.flatMap(e =>
  players.map(p => ({ event_id: e.id, player_id: p.id, registered_players: { id: p.id, player_name: p.player_name } }))
)

// --- Rounds -----------------------------------------------------------------

export const rounds = [
  { id: 1001, date: '2026-04-12', course_name: 'Dilly Dally',        scorecard_image_url: null, created_at: '2026-04-12T18:30:00Z', event_id: 100 },
  { id: 1002, date: '2026-04-05', course_name: 'Roy G. Guerrero',    scorecard_image_url: null, created_at: '2026-04-05T17:15:00Z', event_id: 100 },
  { id: 1003, date: '2026-03-29', course_name: 'Bartholomew',        scorecard_image_url: null, created_at: '2026-03-29T19:00:00Z', event_id: 100 },
  { id: 1004, date: '2026-03-22', course_name: 'Dilly Dally',        scorecard_image_url: null, created_at: '2026-03-22T18:45:00Z', event_id: 200 },
  { id: 1005, date: '2026-03-15', course_name: 'Roy G. Guerrero',    scorecard_image_url: null, created_at: '2026-03-15T17:30:00Z', event_id: 100 },
]

/**
 * Build per-player records for a round. Each entry covers every column the UI
 * touches: total_score, rank, final_total, birdies/eagles/aces/etc., and the
 * `registered_players` join shape used by leaderboard queries.
 */
function makePlayerRound({ roundId, eventId, playerId, score, rank, birdies = 0, eagles = 0, aces = 0, pars = 8, bogeys = 4, doubles = 0 }) {
  const p = players.find(pl => pl.id === playerId)
  // Synthetic final_total roughly aligned with rank + birdie/eagle/ace bonuses
  const rankPoints = [0, 50, 40, 30, 20, 15, 10, 5, 2][rank] || 1
  const birdiePts = birdies * 2
  const eaglePts = eagles * 5
  const acePts = aces * 10
  const final_total = rankPoints + birdiePts + eaglePts + acePts
  return {
    round_id: roundId,
    event_id: eventId,
    player_id: playerId,
    player_name: p.player_name,
    registered_players: { player_name: p.player_name },
    total_score: score,
    total_strokes: 54 + score,
    rank,
    rank_points: rankPoints,
    birdie_points: birdiePts,
    eagle_points: eaglePts,
    ace_points: acePts,
    final_total,
    birdies,
    eagles,
    aces,
    pars,
    bogeys,
    double_bogeys: doubles,
    course_name: rounds.find(r => r.id === roundId)?.course_name || '',
  }
}

// 5 rounds × 8 players = 40 entries. Hand-tuned so "You" trends mid-pack,
// Sky dominates, Bex pushes for second.
export const playerRounds = [
  // Round 1005 — Roy G. Guerrero, 2026-03-15 (Season)
  makePlayerRound({ roundId: 1005, eventId: 100, playerId: 2, score: -6, rank: 1, birdies: 5, eagles: 1 }),
  makePlayerRound({ roundId: 1005, eventId: 100, playerId: 4, score: -3, rank: 2, birdies: 4 }),
  makePlayerRound({ roundId: 1005, eventId: 100, playerId: 7, score: -1, rank: 3, birdies: 3 }),
  makePlayerRound({ roundId: 1005, eventId: 100, playerId: 1, score:  2, rank: 4, birdies: 2 }),
  makePlayerRound({ roundId: 1005, eventId: 100, playerId: 6, score:  3, rank: 5, birdies: 2 }),
  makePlayerRound({ roundId: 1005, eventId: 100, playerId: 3, score:  5, rank: 6, birdies: 1 }),
  makePlayerRound({ roundId: 1005, eventId: 100, playerId: 8, score:  6, rank: 7 }),
  makePlayerRound({ roundId: 1005, eventId: 100, playerId: 5, score:  9, rank: 8 }),

  // Round 1004 — Dilly Dally, 2026-03-22 (Tournament)
  makePlayerRound({ roundId: 1004, eventId: 200, playerId: 4, score: -4, rank: 1, birdies: 4, eagles: 1 }),
  makePlayerRound({ roundId: 1004, eventId: 200, playerId: 2, score: -2, rank: 2, birdies: 3 }),
  makePlayerRound({ roundId: 1004, eventId: 200, playerId: 1, score:  0, rank: 3, birdies: 3, aces: 1 }),
  makePlayerRound({ roundId: 1004, eventId: 200, playerId: 7, score:  1, rank: 4, birdies: 2 }),
  makePlayerRound({ roundId: 1004, eventId: 200, playerId: 6, score:  3, rank: 5, birdies: 2 }),
  makePlayerRound({ roundId: 1004, eventId: 200, playerId: 3, score:  4, rank: 6, birdies: 1 }),
  makePlayerRound({ roundId: 1004, eventId: 200, playerId: 5, score:  7, rank: 7 }),
  makePlayerRound({ roundId: 1004, eventId: 200, playerId: 8, score:  8, rank: 8 }),

  // Round 1003 — Bartholomew, 2026-03-29 (Season)
  makePlayerRound({ roundId: 1003, eventId: 100, playerId: 2, score: -5, rank: 1, birdies: 6 }),
  makePlayerRound({ roundId: 1003, eventId: 100, playerId: 6, score: -2, rank: 2, birdies: 4 }),
  makePlayerRound({ roundId: 1003, eventId: 100, playerId: 4, score:  0, rank: 3, birdies: 3 }),
  makePlayerRound({ roundId: 1003, eventId: 100, playerId: 1, score:  1, rank: 4, birdies: 3 }),
  makePlayerRound({ roundId: 1003, eventId: 100, playerId: 7, score:  2, rank: 5, birdies: 2 }),
  makePlayerRound({ roundId: 1003, eventId: 100, playerId: 8, score:  4, rank: 6, birdies: 1 }),
  makePlayerRound({ roundId: 1003, eventId: 100, playerId: 3, score:  5, rank: 7 }),
  makePlayerRound({ roundId: 1003, eventId: 100, playerId: 5, score: 10, rank: 8 }),

  // Round 1002 — Roy G. Guerrero, 2026-04-05 (Season)
  makePlayerRound({ roundId: 1002, eventId: 100, playerId: 4, score: -5, rank: 1, birdies: 5, eagles: 1 }),
  makePlayerRound({ roundId: 1002, eventId: 100, playerId: 2, score: -3, rank: 2, birdies: 4 }),
  makePlayerRound({ roundId: 1002, eventId: 100, playerId: 1, score: -1, rank: 3, birdies: 4 }),
  makePlayerRound({ roundId: 1002, eventId: 100, playerId: 6, score:  1, rank: 4, birdies: 3 }),
  makePlayerRound({ roundId: 1002, eventId: 100, playerId: 7, score:  2, rank: 5, birdies: 2 }),
  makePlayerRound({ roundId: 1002, eventId: 100, playerId: 3, score:  5, rank: 6, birdies: 1 }),
  makePlayerRound({ roundId: 1002, eventId: 100, playerId: 8, score:  6, rank: 7 }),
  makePlayerRound({ roundId: 1002, eventId: 100, playerId: 5, score:  8, rank: 8 }),

  // Round 1001 — Dilly Dally, 2026-04-12 (Season, most recent)
  makePlayerRound({ roundId: 1001, eventId: 100, playerId: 2, score: -7, rank: 1, birdies: 6, eagles: 1, aces: 1 }),
  makePlayerRound({ roundId: 1001, eventId: 100, playerId: 4, score: -4, rank: 2, birdies: 5 }),
  makePlayerRound({ roundId: 1001, eventId: 100, playerId: 7, score: -2, rank: 3, birdies: 3 }),
  makePlayerRound({ roundId: 1001, eventId: 100, playerId: 1, score:  0, rank: 4, birdies: 3 }),
  makePlayerRound({ roundId: 1001, eventId: 100, playerId: 6, score:  2, rank: 5, birdies: 2 }),
  makePlayerRound({ roundId: 1001, eventId: 100, playerId: 3, score:  4, rank: 6, birdies: 1 }),
  makePlayerRound({ roundId: 1001, eventId: 100, playerId: 8, score:  5, rank: 7 }),
  makePlayerRound({ roundId: 1001, eventId: 100, playerId: 5, score:  7, rank: 8 }),
]

// --- PULPy windows & economy ------------------------------------------------

export const pulpyWindows = [
  // Two historical locked windows tied to past rounds
  { id: 'win-001', opened_at: '2026-04-12T17:00:00Z', opened_by: 4, status: 'locked' },
  { id: 'win-002', opened_at: '2026-04-05T16:00:00Z', opened_by: 2, status: 'locked' },
]

export const blessings = [
  // Demo player's blessing on the most recent locked window
  {
    id: 'bless-001',
    player_id: 1,
    window_id: 'win-001',
    round_id: 1001,
    event_id: 100,
    wager_amount: 25,
    status: 'won_partial',
    prediction_first: 'Sky Tossington',
    prediction_second: 'Bex Patel',
    prediction_third: 'Riggs Lao',
    predictions: { first: 2, second: 4, third: 7 },
    created_at: '2026-04-12T17:05:00Z',
    round: { date: '2026-04-12', course_name: 'Dilly Dally' },
  },
  {
    id: 'bless-002',
    player_id: 4,
    window_id: 'win-001',
    round_id: 1001,
    event_id: 100,
    wager_amount: 40,
    status: 'lost',
    prediction_first: 'Bex Patel',
    prediction_second: 'Sky Tossington',
    prediction_third: 'You',
    predictions: { first: 4, second: 2, third: 1 },
    created_at: '2026-04-12T17:06:00Z',
    round: { date: '2026-04-12', course_name: 'Dilly Dally' },
  },
  {
    id: 'bless-003',
    player_id: 1,
    window_id: 'win-002',
    round_id: 1002,
    event_id: 100,
    wager_amount: 20,
    status: 'won_partial',
    prediction_first: 'Bex Patel',
    prediction_second: 'Sky Tossington',
    prediction_third: 'You',
    predictions: { first: 4, second: 2, third: 1 },
    created_at: '2026-04-05T16:03:00Z',
    round: { date: '2026-04-05', course_name: 'Roy G. Guerrero' },
  },
]

export const challenges = [
  // Demo player won a challenge against Riggs
  {
    id: 'chal-001',
    challenger_id: 1,
    challenged_id: 7,
    window_id: 'win-001',
    round_id: 1001,
    event_id: 100,
    wager_amount: 30,
    status: 'won',
    issued_at: '2026-04-12T17:10:00Z',
    challenger: { player_name: 'You' },
    challenged: { player_name: 'Riggs Lao' },
    round: { date: '2026-04-12', course_name: 'Dilly Dally' },
  },
  // Demo player lost a challenge against Sky
  {
    id: 'chal-002',
    challenger_id: 1,
    challenged_id: 2,
    window_id: 'win-002',
    round_id: 1002,
    event_id: 100,
    wager_amount: 25,
    status: 'lost',
    issued_at: '2026-04-05T16:05:00Z',
    challenger: { player_name: 'You' },
    challenged: { player_name: 'Sky Tossington' },
    round: { date: '2026-04-05', course_name: 'Roy G. Guerrero' },
  },
  // Outgoing challenge to demo player that was declined
  {
    id: 'chal-003',
    challenger_id: 3,
    challenged_id: 1,
    window_id: 'win-002',
    round_id: null,
    event_id: 100,
    wager_amount: 20,
    status: 'rejected',
    issued_at: '2026-04-05T16:08:00Z',
    challenger: { player_name: 'Vinny Cruz' },
    challenged: { player_name: 'You' },
    round: null,
  },
]

export const pulpTransactions = [
  { id: 'txn-001', player_id: 1, transaction_type: 'challenge_win',        amount:  60, description: 'Beat Riggs Lao by 2 strokes',           created_at: '2026-04-12T19:45:00Z' },
  { id: 'txn-002', player_id: 1, transaction_type: 'blessing_win_partial', amount:  25, description: 'Got top 3 right, wrong order',          created_at: '2026-04-12T19:42:00Z' },
  { id: 'txn-003', player_id: 1, transaction_type: 'round_participation',  amount:  10, description: 'Played round at Dilly Dally',           created_at: '2026-04-12T18:30:00Z' },
  { id: 'txn-004', player_id: 1, transaction_type: 'beat_higher_ranked',   amount:  15, description: 'Beat higher-ranked Riggs Lao',          created_at: '2026-04-12T18:31:00Z' },
  { id: 'txn-005', player_id: 1, transaction_type: 'challenge_loss',       amount: -25, description: 'Lost challenge to Sky Tossington',      created_at: '2026-04-05T18:50:00Z' },
  { id: 'txn-006', player_id: 1, transaction_type: 'blessing_win_partial', amount:  20, description: 'Got top 3 right, wrong order',          created_at: '2026-04-05T18:48:00Z' },
  { id: 'txn-007', player_id: 1, transaction_type: 'round_participation',  amount:  10, description: 'Played round at Roy G. Guerrero',       created_at: '2026-04-05T17:15:00Z' },
  { id: 'txn-008', player_id: 1, transaction_type: 'round_participation',  amount:  10, description: 'Played round at Bartholomew',           created_at: '2026-03-29T19:00:00Z' },
  { id: 'txn-009', player_id: 1, transaction_type: 'advantage_purchase',   amount: -80, description: 'Bought Bag Trump',                      created_at: '2026-03-22T18:00:00Z' },
  { id: 'txn-010', player_id: 1, transaction_type: 'round_participation',  amount:  10, description: 'Played round at Dilly Dally',           created_at: '2026-03-22T18:45:00Z' },
]

// --- Activity feed ----------------------------------------------------------

export const activityFeed = [
  { id: 'act-001', player_id: 1, event_type: 'new_round',        description: 'New round at Dilly Dally — you finished 4th',   created_at: '2026-04-12T18:32:00Z', is_read: false, event_data: { round_id: 1001 } },
  { id: 'act-002', player_id: 1, event_type: 'challenge_resolved', description: 'You won your challenge vs Riggs Lao (+60 PULPs)', created_at: '2026-04-12T19:45:00Z', is_read: false, event_data: { challenge_id: 'chal-001' } },
  { id: 'act-003', player_id: 1, event_type: 'bet_won',           description: 'Partial win on your blessing (+25 PULPs)',      created_at: '2026-04-12T19:42:00Z', is_read: false, event_data: { blessing_id: 'bless-001' } },
  { id: 'act-004', player_id: 1, event_type: 'round_processed',   description: 'Round at Roy G. Guerrero processed',           created_at: '2026-04-05T17:20:00Z', is_read: true,  event_data: { round_id: 1002 } },
  { id: 'act-005', player_id: 1, event_type: 'challenge_issued',  description: 'Vinny Cruz challenged you — you declined',     created_at: '2026-04-05T16:09:00Z', is_read: true,  event_data: { challenge_id: 'chal-003' } },
]

// --- Podcast ----------------------------------------------------------------

export const podcastEpisodes = [
  {
    id: 'pod-001',
    episode_number: 3,
    title: 'Sky Strikes Again',
    description: 'Sky takes another commanding win at Dilly Dally while Bex closes the gap. The demo Vinny–You drama continues.',
    audio_url: null,
    is_published: true,
    published_at: '2026-04-13T09:00:00Z',
    created_at: '2026-04-13T09:00:00Z',
  },
  {
    id: 'pod-002',
    episode_number: 2,
    title: 'The Bex Awakens',
    description: 'Bex Patel takes the Spring Tournament with a stunning -4. Roy G. mysteries and a perfectly-timed ace.',
    audio_url: null,
    is_published: true,
    published_at: '2026-03-23T09:00:00Z',
    created_at: '2026-03-23T09:00:00Z',
  },
]

// --- Advantages -------------------------------------------------------------

export const advantageCatalog = [
  { advantage_key: 'bag_trump',     name: 'Bag Trump',     description: 'Pick the bag your rival uses next round.', pulp_cost: 80,  icon: 'Backpack' },
  { advantage_key: 'shotgun_buddy', name: 'Shotgun Buddy', description: 'A friend pours a drink before your rival\'s throw.', pulp_cost: 80, icon: 'Beer' },
  { advantage_key: 'mulligan',      name: 'Mulligan',      description: 'Re-take one throw without penalty.', pulp_cost: 150, icon: 'RotateCcw' },
]

// --- Helpers ----------------------------------------------------------------

export function getPlayerById(id) {
  return players.find(p => p.id === id) || null
}

export function getPlayersForRound(roundId) {
  return playerRounds
    .filter(pr => pr.round_id === roundId)
    .map(pr => ({
      player_name: pr.player_name,
      final_total: pr.final_total,
      rank: pr.rank,
      total_score: pr.total_score,
      birdies: pr.birdies,
      eagles: pr.eagles,
      aces: pr.aces,
    }))
    .sort((a, b) => a.rank - b.rank)
}

export function getRoundsWithPlayerCount() {
  return rounds
    .map(r => ({
      ...r,
      player_count: playerRounds.filter(pr => pr.round_id === r.id).length,
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
}

/**
 * Aggregate playerRounds into the same shape `eventAPI.getLeaderboardForEvent`
 * returns: total_points uses top-10 rounds for seasons, all rounds for
 * tournaments. Stats include rounds_played, wins, podiums, birdies, etc.
 */
export function getLeaderboardForEvent(eventId) {
  const ev = events.find(e => e.id === eventId)
  const isSeason = ev?.type === 'season'
  const rounds = playerRounds.filter(pr => pr.event_id === eventId)

  const stats = {}
  const scoresByPlayer = {}

  rounds.forEach(r => {
    if (!stats[r.player_name]) {
      stats[r.player_name] = {
        player_name: r.player_name,
        total_points: 0,
        rounds_played: 0,
        total_birdies: 0,
        total_eagles: 0,
        total_aces: 0,
        total_pars: 0,
        total_bogeys: 0,
        total_double_bogeys: 0,
        total_strokes: 0,
        best_score: null,
        wins: 0,
        podiums: 0,
      }
      scoresByPlayer[r.player_name] = []
    }
    scoresByPlayer[r.player_name].push(Number(r.final_total) || 0)
    const s = stats[r.player_name]
    s.rounds_played += 1
    s.total_birdies += r.birdies || 0
    s.total_eagles += r.eagles || 0
    s.total_aces += r.aces || 0
    s.total_pars += r.pars || 0
    s.total_bogeys += r.bogeys || 0
    s.total_double_bogeys += r.double_bogeys || 0
    s.total_strokes += r.total_strokes || 0
    if (r.rank === 1) s.wins += 1
    if (r.rank <= 3) s.podiums += 1
    if (s.best_score === null || r.total_score < s.best_score) s.best_score = r.total_score
  })

  Object.keys(stats).forEach(name => {
    const scores = scoresByPlayer[name]
    if (isSeason) {
      const top10 = [...scores].sort((a, b) => b - a).slice(0, 10)
      stats[name].total_points = top10.reduce((sum, x) => sum + x, 0)
    } else {
      stats[name].total_points = scores.reduce((sum, x) => sum + x, 0)
    }
  })

  return Object.values(stats).sort((a, b) => b.total_points - a.total_points)
}
