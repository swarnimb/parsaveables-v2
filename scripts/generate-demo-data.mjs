#!/usr/bin/env node
/**
 * Snapshot prod Supabase data into src/lib/demoData.js for the static demo.
 *
 * Re-run anytime you want to refresh the demo with the current live state.
 * Uses the anon key from .env.local — no service-role access needed.
 *
 *   node scripts/generate-demo-data.mjs
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local explicitly (dotenv/config loads .env by default)
const envLocal = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
envLocal.split('\n').forEach(line => {
  const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
  if (match) {
    const [, key, rawVal] = match
    let val = rawVal.trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
})

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } })

const DEMO_PLAYER_ID = 1 // "Intern Line Cook"

async function fetchAll(table, query = q => q.select('*')) {
  const { data, error } = await query(supabase.from(table))
  if (error) {
    console.error(`Error fetching ${table}:`, error.message)
    process.exit(1)
  }
  return data
}

console.log('Fetching prod data…')

const [
  players,
  events,
  eventPlayers,
  rounds,
  playerRounds,
  pulpyWindows,
  blessings,
  challenges,
  pulpTransactions,
  activityFeed,
  podcastEpisodes,
  advantageCatalog,
] = await Promise.all([
  fetchAll('registered_players', q => q.select('*').order('player_name')),
  fetchAll('events', q => q.select('*').order('start_date', { ascending: false })),
  fetchAll('event_players', q => q.select('event_id, player_id')),
  // scorecard_image_url is a public Supabase storage URL. It reveals the
  // prod project ref, but that's not a credential — the actual gate is RLS.
  // We keep these so the demo can show off scorecard images on round expand.
  fetchAll('rounds', q => q.select('*').order('date', { ascending: false })),
  fetchAll('player_rounds', q => q.select('*')),
  fetchAll('pulpy_windows', q => q.select('*').order('opened_at', { ascending: false }).limit(10)),
  fetchAll('blessings', q => q.select('*').order('created_at', { ascending: false }).limit(40)),
  fetchAll('challenges', q => q.select('*').order('issued_at', { ascending: false }).limit(40)),
  fetchAll('pulp_transactions', q => q.select('*').order('created_at', { ascending: false }).limit(100)),
  fetchAll('activity_feed', q => q.select('*').order('created_at', { ascending: false }).limit(50)),
  // audio_url is a public Supabase storage URL — same reasoning as the
  // scorecard URLs above. Keep so the demo podcast actually plays.
  fetchAll('podcast_episodes', q => q.select('*').eq('is_published', true).order('episode_number', { ascending: false })),
  fetchAll('advantage_catalog', q => q.select('*').order('pulp_cost')),
])

const swarnim = players.find(p => p.id === DEMO_PLAYER_ID)
if (!swarnim) {
  console.error(`Could not find a player with id=${DEMO_PLAYER_ID} in registered_players. Edit DEMO_PLAYER_ID.`)
  process.exit(1)
}
console.log(`Demo player: ${swarnim.player_name} (id=${swarnim.id})`)
console.log(`  ${players.length} players · ${events.length} events · ${rounds.length} rounds · ${playerRounds.length} player_rounds`)
console.log(`  ${blessings.length} blessings · ${challenges.length} challenges · ${pulpTransactions.length} txns · ${activityFeed.length} feed`)

// Build a player_name lookup for joining
const playerNameById = Object.fromEntries(players.map(p => [p.id, p.player_name]))

// Enrich player_rounds. CRITICAL: use the *current* player_name from
// registered_players (via player_id), NOT the denormalized player_rounds.
// player_name — that field holds whatever the player was called at the time
// the round was recorded, and the real app's leaderboard groups by the
// joined current name. Without this, renamed players appear as two rows.
const enrichedPlayerRounds = playerRounds.map(pr => {
  const currentName = playerNameById[pr.player_id] || pr.player_name || 'Unknown'
  return {
    ...pr,
    player_name: currentName,
    registered_players: { player_name: currentName },
  }
})

// Enrich blessings with round join shape
const roundById = Object.fromEntries(rounds.map(r => [r.id, r]))
const enrichedBlessings = blessings.map(b => ({
  ...b,
  round: b.round_id ? { date: roundById[b.round_id]?.date, course_name: roundById[b.round_id]?.course_name } : null,
}))

// Enrich challenges with challenger/challenged/round join shapes
const enrichedChallenges = challenges.map(c => ({
  ...c,
  challenger: { player_name: playerNameById[c.challenger_id] || 'Unknown' },
  challenged: { player_name: playerNameById[c.challenged_id] || 'Unknown' },
  round: c.round_id ? { date: roundById[c.round_id]?.date, course_name: roundById[c.round_id]?.course_name } : null,
}))

// Filter blessings/challenges/txns/feed to swarnim where applicable, keeping
// enough volume to show off the activity feed
const swarnimBlessings = enrichedBlessings.filter(b => b.player_id === swarnim.id).slice(0, 10)
const swarnimChallenges = enrichedChallenges.filter(c => c.challenger_id === swarnim.id || c.challenged_id === swarnim.id).slice(0, 10)
const swarnimTxns = pulpTransactions.filter(t => t.player_id === swarnim.id).slice(0, 30)
const swarnimFeed = activityFeed.filter(a => a.player_id === swarnim.id).slice(0, 15)

// All blessings/challenges across players (for community-view bits in Pulps modal)
const allBlessingsForDemo = enrichedBlessings.slice(0, 30)
const allChallengesForDemo = enrichedChallenges.slice(0, 30)

// Build event_players with the registered_players nested object shape
const enrichedEventPlayers = eventPlayers.map(ep => ({
  event_id: ep.event_id,
  player_id: ep.player_id,
  registered_players: { id: ep.player_id, player_name: playerNameById[ep.player_id] || 'Unknown' },
}))

// Stringify with stable formatting
const j = (x) => JSON.stringify(x, null, 2)

const fileSource = `/**
 * Static demo data snapshotted from prod Supabase via scripts/generate-demo-data.mjs.
 * Re-run that script anytime to refresh.
 *
 * The visitor is auto-signed-in as \`demoUser\` linked to player id=${swarnim.id} ("${swarnim.player_name}").
 */

// --- Auth -------------------------------------------------------------------

export const demoUser = {
  id: 'demo-user-00000000-0000-0000-0000-000000000001',
  email: 'demo@parsaveables.example',
  app_metadata: { provider: 'demo' },
  user_metadata: { name: '${swarnim.player_name}' },
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

// --- Players (snapshot) -----------------------------------------------------

const realPlayers = ${j(players)}

// Re-link the snapshotted swarnim record to the synthetic demo auth user so
// useAuth's player linkage works.
export const players = realPlayers.map(p =>
  p.id === ${swarnim.id} ? { ...p, user_id: demoUser.id } : { ...p, user_id: null }
)

export const demoPlayer = players.find(p => p.id === ${swarnim.id})

// --- Events -----------------------------------------------------------------

export const events = ${j(events)}

export const eventPlayers = ${j(enrichedEventPlayers)}

// --- Rounds -----------------------------------------------------------------

export const rounds = ${j(rounds)}

export const playerRounds = ${j(enrichedPlayerRounds)}

// --- PULPy windows & economy ------------------------------------------------

export const pulpyWindows = ${j(pulpyWindows)}

export const blessings = ${j(allBlessingsForDemo)}

export const challenges = ${j(allChallengesForDemo)}

export const pulpTransactions = ${j(swarnimTxns)}

// --- Activity feed ----------------------------------------------------------

export const activityFeed = ${j(swarnimFeed)}

// --- Podcast ----------------------------------------------------------------

export const podcastEpisodes = ${j(podcastEpisodes)}

// --- Advantages -------------------------------------------------------------

export const advantageCatalog = ${j(advantageCatalog)}

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
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date) - new Date(a.date)
    })
}

/**
 * Aggregate playerRounds into the same shape \`eventAPI.getLeaderboardForEvent\`
 * returns: total_points uses top-10 rounds for seasons, all rounds for
 * tournaments.
 */
export function getLeaderboardForEvent(eventId) {
  const ev = events.find(e => e.id === eventId)
  const isSeason = ev?.type === 'season'
  const rs = playerRounds.filter(pr => pr.event_id === eventId)

  const stats = {}
  const scoresByPlayer = {}

  rs.forEach(r => {
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
`

const outPath = join(__dirname, '..', 'src', 'lib', 'demoData.js')
writeFileSync(outPath, fileSource)
console.log(`Wrote ${outPath}`)
