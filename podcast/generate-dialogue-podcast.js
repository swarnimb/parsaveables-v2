/**
 * Enhanced Automated Podcast Generation Script
 *
 * Generates two-person conversational podcast episodes with AI-generated dialogue
 * covering highlights, rivalries, PULP economy, and custom talking points.
 *
 * Features:
 * - Two-person dialogue format (Host & Co-host)
 * - References previous episode to avoid repetition
 * - Comprehensive PULP economy coverage
 * - Custom talking points from JSON file
 * - Natural, funny conversation style
 *
 * Usage: node generate-dialogue-podcast.js
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set FFmpeg path to use bundled binary
ffmpeg.setFfmpegPath(ffmpegStatic);

// Load environment variables from parent directory's .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  supabase: {
    url: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'
  },
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY,
    // Two voices for dialogue
    hostVoiceId: process.env.ELEVENLABS_HOST_VOICE_ID || 'hA4zGnmTwX2NQiTRMt7o', // Annie
    cohostVoiceId: process.env.ELEVENLABS_COHOST_VOICE_ID || '50y2RdLRjpTShM4ZFm5D' // Hyzer
  }
};

// Initialize clients
const supabase = createClient(config.supabase.url, config.supabase.serviceKey);
const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(stage, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${stage}] ${message}`, metadata);
}

async function logToDatabase(episodeId, stage, metadata = {}) {
  try {
    await supabase.from('podcast_generation_logs').insert({
      episode_id: episodeId,
      stage,
      metadata,
      started_at: new Date().toISOString()
    });
  } catch (error) {
    log('ERROR', 'Failed to log to database', { error: error.message });
  }
}

async function updateLogSuccess(episodeId, stage, success, errorMessage = null) {
  try {
    await supabase
      .from('podcast_generation_logs')
      .update({
        completed_at: new Date().toISOString(),
        success,
        error_message: errorMessage
      })
      .eq('episode_id', episodeId)
      .eq('stage', stage)
      .is('completed_at', null);
  } catch (error) {
    log('ERROR', 'Failed to update log', { error: error.message });
  }
}

function loadTalkingPoints(episodeNumber) {
  try {
    const filePath = path.join(__dirname, 'talking-points.json');
    if (!fs.existsSync(filePath)) {
      log('TALKING_POINTS', 'No talking points file found, using empty notes');
      return {};
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const allPoints = JSON.parse(content);
    const episodeKey = `episode_${episodeNumber}`;

    return allPoints[episodeKey] || {};
  } catch (error) {
    log('ERROR', 'Failed to load talking points', { error: error.message });
    return {};
  }
}

// ============================================================================
// STEP 1: DETERMINE EPISODE PERIOD
// ============================================================================

async function determineEpisodePeriod() {
  log('PERIOD', 'Determining episode period...');

  // Get latest episode
  const { data: latestEpisode } = await supabase
    .from('podcast_episodes')
    .select('*')
    .order('episode_number', { ascending: false })
    .limit(1)
    .single();

  if (!latestEpisode) {
    // First episode - cover all time
    return {
      periodStart: '2025-01-01',
      periodEnd: new Date().toISOString().split('T')[0],
      episodeNumber: 1,
      type: 'season_recap'
    };
  }

  // Calculate next monthly period
  const lastEnd = new Date(latestEpisode.period_end);
  const periodStart = new Date(lastEnd);
  periodStart.setDate(periodStart.getDate() + 1);

  const periodEnd = new Date(); // Always cover up to today

  return {
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    episodeNumber: latestEpisode.episode_number + 1,
    type: 'monthly_recap'
  };
}

// ============================================================================
// STEP 2: FETCH PREVIOUS EPISODE SCRIPT
// ============================================================================

async function fetchPreviousScript(episodeNumber) {
  if (episodeNumber === 1) return null;

  try {
    const { data } = await supabase
      .from('podcast_scripts')
      .select('script_text')
      .eq('episode_number', episodeNumber - 1)
      .single();

    return data?.script_text || null;
  } catch (error) {
    log('WARNING', 'Could not fetch previous script', { error: error.message });
    return null;
  }
}

// ============================================================================
// STEP 3: FETCH COMPREHENSIVE DATA
// ============================================================================

async function fetchComprehensiveData(periodStart, periodEnd) {
  log('FETCH', 'Fetching comprehensive data...', { periodStart, periodEnd });

  // 1. Fetch rounds with detailed player data
  const { data: rounds } = await supabase
    .from('rounds')
    .select(`
      *,
      player_rounds (
        player_name,
        total_score,
        final_total,
        birdies,
        eagles,
        aces,
        rank
      )
    `)
    .gte('date', periodStart)
    .lte('date', periodEnd)
    .order('date', { ascending: true });

  // 2. Fetch challenges for the period
  const { data: challenges } = await supabase
    .from('challenges')
    .select(`
      *,
      challenger:registered_players!challenges_challenger_id_fkey(player_name),
      challenged:registered_players!challenges_challenged_id_fkey(player_name)
    `)
    .gte('issued_at', periodStart)
    .lte('issued_at', periodEnd)
    .order('issued_at', { ascending: false });

  // 3. Fetch blessings for the period
  const { data: blessings } = await supabase
    .from('blessings')
    .select(`
      *,
      player:registered_players(player_name)
    `)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd);

  // 4. Fetch PULP transactions
  const { data: transactions } = await supabase
    .from('pulp_transactions')
    .select(`
      *,
      player:registered_players(player_name)
    `)
    .gte('created_at', periodStart)
    .lte('created_at', periodEnd)
    .order('amount', { ascending: false })
    .limit(20);

  // 5. Fetch current leaderboard
  const { data: leaderboard } = await supabase
    .from('registered_players')
    .select('player_name, pulp_balance')
    .order('pulp_balance', { ascending: false })
    .limit(10);

  // 6. Fetch events (seasons/tournaments) that started during this period
  const { data: newEvents } = await supabase
    .from('events')
    .select('name, type, start_date')
    .gte('start_date', periodStart)
    .lte('start_date', periodEnd);

  // 7. Calculate statistics (guard against null from failed queries)
  const stats = calculateStats(rounds || [], challenges || [], blessings || [], transactions || []);

  return {
    rounds: rounds || [],
    challenges: challenges || [],
    blessings: blessings || [],
    transactions: transactions || [],
    leaderboard: leaderboard || [],
    newEvents: newEvents || [],
    stats
  };
}

function calculateStats(rounds, challenges, blessings, transactions) {
  const stats = {
    totalRounds: rounds.length,
    totalPlayers: new Set(rounds.flatMap(r => r.player_rounds?.map(pr => pr.player_name) || [])).size,
    totalChallenges: challenges.length,
    challengesAccepted: challenges.filter(c => c.status === 'accepted').length,
    challengesWon: challenges.filter(c => c.status === 'won').length,
    totalBlessings: blessings.length,
    totalWagered: blessings.reduce((sum, b) => sum + (b.wager_amount || 0), 0),
    biggestWin: transactions
      .filter(t => t.amount > 0)
      .sort((a, b) => b.amount - a.amount)[0],
    biggestLoss: transactions
      .filter(t => t.amount < 0)
      .sort((a, b) => a.amount - b.amount)[0],
    mostAces: 0,
    mostBirdies: 0
  };

  // Find most aces/birdies
  const playerStats = {};
  rounds.forEach(round => {
    round.player_rounds?.forEach(pr => {
      if (!playerStats[pr.player_name]) {
        playerStats[pr.player_name] = { aces: 0, birdies: 0 };
      }
      playerStats[pr.player_name].aces += pr.aces || 0;
      playerStats[pr.player_name].birdies += pr.birdies || 0;
    });
  });

  stats.mostAces = Math.max(...Object.values(playerStats).map(p => p.aces), 0);
  stats.mostBirdies = Math.max(...Object.values(playerStats).map(p => p.birdies), 0);
  stats.topAcePlayer = Object.entries(playerStats).find(([_, s]) => s.aces === stats.mostAces)?.[0];
  stats.topBirdiePlayer = Object.entries(playerStats).find(([_, s]) => s.birdies === stats.mostBirdies)?.[0];

  return stats;
}

function formatBetsForPrompt(bets) {
  if (!bets || bets.length === 0) return 'No bets placed this period.';

  // Calculate summary stats
  const totalBets = bets.length;
  const totalWagered = bets.reduce((sum, b) => sum + b.wager_amount, 0);
  const wonPerfect = bets.filter(b => b.status === 'won_perfect');
  const wonPartial = bets.filter(b => b.status === 'won_partial');
  const lost = bets.filter(b => b.status === 'lost');

  // Find notable bets (biggest wagers, self-bets that failed, perfect wins)
  const notableBets = [];

  // Biggest wager
  const biggestWager = bets.reduce((max, b) => b.wager_amount > (max?.wager_amount || 0) ? b : max, null);
  if (biggestWager) {
    const player = biggestWager.player?.player_name || 'Unknown';
    const predictions = [biggestWager.prediction_first, biggestWager.prediction_second, biggestWager.prediction_third];
    const outcome = biggestWager.status === 'won_perfect' ? `WON PERFECT (+${biggestWager.payout_amount} PULPs)` :
                    biggestWager.status === 'won_partial' ? `WON PARTIAL (+${biggestWager.payout_amount} PULPs)` :
                    `LOST (-${biggestWager.wager_amount} PULPs)`;
    notableBets.push(`- Biggest wager: ${player} bet ${biggestWager.wager_amount} PULPs on [${predictions.join(', ')}] → ${outcome}`);
  }

  // Self-bets (people who bet on themselves)
  const selfBets = bets.filter(b => {
    const playerName = b.player?.player_name;
    return playerName && (b.prediction_first === playerName || b.prediction_second === playerName || b.prediction_third === playerName);
  });
  if (selfBets.length > 0) {
    selfBets.forEach(bet => {
      const player = bet.player?.player_name;
      const outcome = bet.status === 'lost' ? 'LOST' : bet.status === 'won_perfect' ? 'WON PERFECT' : 'WON';
      notableBets.push(`- ${player} bet ${bet.wager_amount} PULPs on themselves → ${outcome}`);
    });
  }

  // Perfect wins
  wonPerfect.forEach(bet => {
    if (bet !== biggestWager) { // Don't duplicate if already mentioned
      const player = bet.player?.player_name;
      notableBets.push(`- ${player} had a perfect prediction (+${bet.payout_amount} PULPs)`);
    }
  });

  let summary = `TOTALS: ${totalBets} bets, ${totalWagered} PULPs wagered | ${wonPerfect.length} perfect wins, ${wonPartial.length} partial wins, ${lost.length} losses\n\n`;
  summary += notableBets.length > 0 ? notableBets.join('\n') : 'No particularly notable bets.';

  return summary;
}

function formatChallengesForPrompt(challenges) {
  if (!challenges || challenges.length === 0) return 'No challenges issued this period.';

  // Calculate summary stats
  const totalChallenges = challenges.length;
  const rejected = challenges.filter(c => c.status === 'rejected');
  const resolved = challenges.filter(c => c.status === 'resolved');
  const pending = challenges.filter(c => c.status === 'pending' || c.status === 'accepted');

  const notableChallenges = [];

  // Biggest wager challenge
  const biggestChallenge = challenges.reduce((max, c) => c.wager_amount > (max?.wager_amount || 0) ? c : max, null);
  if (biggestChallenge) {
    const challenger = biggestChallenge.challenger?.player_name || 'Unknown';
    const challenged = biggestChallenge.challenged?.player_name || 'Unknown';
    const wager = biggestChallenge.wager_amount;
    let outcome = '';
    if (biggestChallenge.status === 'rejected') {
      outcome = `REJECTED (${challenged} paid ${biggestChallenge.cowardice_tax_paid} PULPs tax)`;
    } else if (biggestChallenge.status === 'resolved' && biggestChallenge.winner_id) {
      const winner = biggestChallenge.winner_id === biggestChallenge.challenger_id ? challenger : challenged;
      outcome = `${winner} WON`;
    } else {
      outcome = `${biggestChallenge.status.toUpperCase()}`;
    }
    notableChallenges.push(`- Biggest challenge: ${challenger} challenged ${challenged} for ${wager} PULPs → ${outcome}`);
  }

  // Rejections (cowards)
  rejected.forEach(challenge => {
    if (challenge !== biggestChallenge) {
      const challenger = challenge.challenger?.player_name;
      const challenged = challenge.challenged?.player_name;
      notableChallenges.push(`- ${challenged} rejected ${challenger}'s challenge (paid ${challenge.cowardice_tax_paid} PULPs tax)`);
    }
  });

  // Only show first 3-4 notable ones
  const limitedNotable = notableChallenges.slice(0, 4);

  let summary = `TOTALS: ${totalChallenges} challenges | ${resolved.length} resolved, ${rejected.length} rejected, ${pending.length} pending\n\n`;
  summary += limitedNotable.length > 0 ? limitedNotable.join('\n') : 'No particularly notable challenges.';

  return summary;
}

// ============================================================================
// STEP 3B: BUILD PLAYER PROFILES & FORMAT HELPERS
// ============================================================================

function buildPlayerProfiles(rounds) {
  const profiles = {};

  rounds.forEach(round => {
    const playerCount = round.player_rounds?.length || 0;
    round.player_rounds?.forEach(pr => {
      if (!profiles[pr.player_name]) {
        profiles[pr.player_name] = {
          roundsPlayed: 0, wins: 0, podiums: 0, lastPlaces: 0,
          totalScore: 0, bestFinish: Infinity, worstFinish: 0,
          totalBirdies: 0, totalEagles: 0, totalAces: 0,
          rankHistory: [], scoreHistory: []
        };
      }
      const p = profiles[pr.player_name];
      p.roundsPlayed++;
      if (pr.rank === 1) p.wins++;
      if (pr.rank <= 3) p.podiums++;
      if (pr.rank === playerCount) p.lastPlaces++;
      p.totalScore += pr.total_score || 0;
      p.bestFinish = Math.min(p.bestFinish, pr.rank);
      p.worstFinish = Math.max(p.worstFinish, pr.rank);
      p.totalBirdies += pr.birdies || 0;
      p.totalEagles += pr.eagles || 0;
      p.totalAces += pr.aces || 0;
      p.rankHistory.push(pr.rank);
      p.scoreHistory.push(pr.total_score);
    });
  });

  Object.entries(profiles).forEach(([name, p]) => {
    p.avgScore = (p.totalScore / p.roundsPlayed).toFixed(1);
    p.avgFinish = (p.rankHistory.reduce((a, b) => a + b, 0) / p.roundsPlayed).toFixed(1);

    // Trend: compare first half avg rank to second half
    if (p.rankHistory.length >= 2) {
      const mid = Math.floor(p.rankHistory.length / 2);
      const firstAvg = p.rankHistory.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const secondAvg = p.rankHistory.slice(mid).reduce((a, b) => a + b, 0) / (p.rankHistory.length - mid);
      if (secondAvg < firstAvg - 0.5) p.trend = 'improving';
      else if (secondAvg > firstAvg + 0.5) p.trend = 'declining';
      else p.trend = 'steady';
    } else {
      p.trend = 'too few rounds';
    }

    // Consistency: stdev of ranks
    const mean = p.rankHistory.reduce((a, b) => a + b, 0) / p.rankHistory.length;
    const variance = p.rankHistory.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / p.rankHistory.length;
    p.consistency = Math.sqrt(variance).toFixed(1);

    // Streak: consecutive same finishes
    p.currentStreak = null;
    if (p.rankHistory.length >= 2) {
      const lastRank = p.rankHistory[p.rankHistory.length - 1];
      let streak = 1;
      for (let i = p.rankHistory.length - 2; i >= 0; i--) {
        if (p.rankHistory[i] === lastRank) streak++;
        else break;
      }
      if (streak >= 2) p.currentStreak = `${streak}x rank ${lastRank}`;
    }
  });

  return profiles;
}

function formatRoundsForPrompt(rounds) {
  return rounds.map((r, i) => {
    const sorted = [...(r.player_rounds || [])].sort((a, b) => a.rank - b.rank);
    const results = sorted.map(pr => {
      const highlights = [];
      if (pr.aces > 0) highlights.push(`${pr.aces} ace${pr.aces > 1 ? 's' : ''}`);
      if (pr.eagles > 0) highlights.push(`${pr.eagles} eagle${pr.eagles > 1 ? 's' : ''}`);
      if (pr.birdies > 0) highlights.push(`${pr.birdies} birdie${pr.birdies > 1 ? 's' : ''}`);
      const extra = highlights.length > 0 ? ` (${highlights.join(', ')})` : '';
      return `  ${pr.rank}. ${pr.player_name} - ${pr.total_score}${extra}`;
    }).join('\n');
    return `Round ${i + 1} at ${r.course_name}:\n${results}`;
  }).join('\n\n');
}

function formatPlayerProfilesForPrompt(profiles) {
  return Object.entries(profiles)
    .sort((a, b) => parseFloat(a[1].avgFinish) - parseFloat(b[1].avgFinish))
    .map(([name, p]) => {
      const parts = [
        `${name}: ${p.roundsPlayed} rounds, avg finish ${p.avgFinish}, avg score ${p.avgScore}`,
        `  Wins: ${p.wins}, Podiums: ${p.podiums}, Last places: ${p.lastPlaces}`,
        `  Birdies: ${p.totalBirdies}, Eagles: ${p.totalEagles}, Aces: ${p.totalAces}`,
        `  Ranks: [${p.rankHistory.join(', ')}] | Trend: ${p.trend} | Consistency: ${p.consistency}`
      ];
      if (p.currentStreak) parts.push(`  Streak: ${p.currentStreak}`);
      return parts.join('\n');
    }).join('\n\n');
}

// ============================================================================
// STEP 4: GENERATE TWO-PERSON DIALOGUE SCRIPT
// ============================================================================

async function generateDialogueScript(data, episodeInfo, previousScript, talkingPoints) {
  log('SCRIPT', 'Generating two-person dialogue script with Claude...');

  const playerProfiles = buildPlayerProfiles(data.rounds);

  const prompt = `You are writing a two-person podcast episode for ParSaveables, a disc golf league where friends compete and create chaos.

**FORMAT RULES:**
- Every line: [ANNIE]: or [HYZER]: followed by spoken dialogue
- NO narration, NO stage directions, NO brackets except speaker tags
- NO [laughs], [sighs], [pauses], [chuckles] or any non-spoken text in brackets
- Use exclamation points and energetic language to convey emotion instead
- Each speaker: 1-4 sentences per turn
- Total: 800-1200 words

**CHARACTERS:**
- ANNIE: The storyteller. Connects stats to narratives, builds drama, gives every player their moment.
- HYZER: The stats nerd. Pulls out numbers, spots patterns, gets genuinely excited about data.
- Both are casual, like two friends who watched every round. Think sports bar recap, not ESPN desk.
- They complete each other's sentences with dashes, react to each other, light roasting and banter throughout.

**EPISODE ${episodeInfo.episodeNumber}** | ${episodeInfo.type}
${data.newEvents.length > 0 ? `
NEW THIS PERIOD: ${data.newEvents.map(e => `${e.name} (${e.type}) started`).join(', ')}
This is opening day! Hype up the new ${data.newEvents.map(e => e.type).join('/')} with excitement and humor.
` : ''}
OVERVIEW: ${data.stats.totalRounds} rounds, ${data.stats.totalPlayers} players
${data.stats.mostAces > 0 ? `Aces leader: ${data.stats.topAcePlayer} with ${data.stats.mostAces}` : 'No aces this period'}
${data.stats.mostBirdies > 0 ? `Birdies leader: ${data.stats.topBirdiePlayer} with ${data.stats.mostBirdies}` : ''}

**ROUND-BY-ROUND RESULTS:**
${formatRoundsForPrompt(data.rounds)}

**PLAYER PROFILES (cross-round analysis):**
${formatPlayerProfilesForPrompt(playerProfiles)}

${previousScript ? `PREVIOUS EPISODE (don't repeat these topics):
${previousScript.substring(0, 400)}` : ''}

${Object.keys(talkingPoints).length > 0 ? `TALKING POINTS (weave these in naturally during relevant round discussions):
${Object.entries(talkingPoints).map(([category, points]) => {
  if (!Array.isArray(points) || points.length === 0) return '';
  return `${category}: ${points.join(' | ')}`;
}).filter(Boolean).join('\n')}` : ''}

**HOW TO COVER THE ROUNDS:**
1. Cover ALL ${data.stats.totalRounds} rounds — don't skip any. But don't just read results like a spreadsheet.
2. For each round, find the STORY: Was it an upset? A blowout? A tight finish? Did someone choke? Did someone surge from the bottom?
3. Spotlight EVERY player at least once across the episode. Use the player profiles:
   - Who's on a hot streak or cold streak?
   - Who's been finishing in the same position repeatedly?
   - Who's improving round over round? Who's declining?
   - Who's the most consistent? Who's the most volatile?
   - Who's quietly solid in the middle of the pack?
   - Who had a great birdie/eagle/ace day?
4. Don't read dates — reference courses naturally ("back at Metro", "the Fox Run round").
5. Don't go round-by-round in a mechanical order if it doesn't flow well. Group by storylines if that's more interesting.

**BANTER & GAGS:**
Sprinkle these naturally THROUGHOUT the episode (don't concentrate them):
- "It's par saveable" — for mediocre but salvageable performances
- "Treesus" — disc golf deity, use 1-2 times max
- "Blessed" / "Cursed" — for clutch moments or chokes
- Light roasting of bottom finishers (respectful but funny)
- Quick reactions between hosts after revealing a stat or result
- Tag-team storytelling: complete each other's sentences with dashes

**STRUCTURE:**
- Quick welcome (2-3 lines max, not a whole production)
- Dive into rounds and player stories (the bulk of the episode)
- Brief sign-off (2-3 lines, natural "see you next time")
- Let the conversation flow naturally — no rigid acts or forced segments

**WHAT NOT TO DO:**
- Don't invent shot details, putts, or incidents not in the data or talking points
- Don't read "on January 15th at Fox Run, Player X scored 52" — that's a database dump
- Don't only talk about winners — mid-pack and bottom players are just as interesting
- Don't concentrate all banter at the start or end — distribute it throughout
- Don't pad with filler — if a round was uneventful, say so and move on
- Don't use sound effects or stage directions in brackets

NOW WRITE THE FULL DIALOGUE:`;

  const message = await anthropic.messages.create({
    model: config.anthropic.model,
    max_tokens: 3000,
    temperature: 0.9, // Higher temp for more creative, natural dialogue
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const script = message.content[0].text;
  log('SCRIPT', 'Dialogue script generated', {
    length: script.length,
    tokens: message.usage.input_tokens + message.usage.output_tokens
  });

  return script;
}

// ============================================================================
// STEP 5: GENERATE DIALOGUE AUDIO (MULTI-VOICE)
// ============================================================================

async function generateDialogueAudio(script, episodeNumber) {
  log('AUDIO', 'Generating two-person dialogue audio...');

  // Parse script into lines with speaker identification
  const lines = script.split('\n').filter(line => line.trim());
  const audioSegments = [];

  for (const line of lines) {
    // Trim line to handle whitespace and line ending issues
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match "[ANNIE]:" or "[HYZER]:" patterns
    const match = trimmedLine.match(/^\[(ANNIE|HYZER)\]:\s*(.+)$/i);
    if (!match) {
      // Log lines that don't match for debugging
      if (trimmedLine.length > 0 && !trimmedLine.startsWith('#')) {
        log('WARNING', 'Line did not match pattern', { line: trimmedLine.substring(0, 100) });
      }
      continue;
    }

    const [, speaker, text] = match;
    const isAnnie = speaker.toUpperCase().includes('ANNIE');
    const voiceId = isAnnie ? config.elevenlabs.hostVoiceId : config.elevenlabs.cohostVoiceId;

    log('AUDIO', `Generating segment for ${speaker}`, { textLength: text.length });

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': config.elevenlabs.apiKey
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: 'eleven_turbo_v2_5', // Free tier compatible model
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.6, // More expressive
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    audioSegments.push(Buffer.from(audioBuffer));

    // Small delay between API calls to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Concatenate all audio segments into dialogue-only file
  const dialogueAudio = Buffer.concat(audioSegments);
  const dialogueFilePath = path.join(__dirname, `dialogue-${episodeNumber}.mp3`);
  fs.writeFileSync(dialogueFilePath, dialogueAudio);

  log('AUDIO', 'Dialogue audio generated', {
    segments: audioSegments.length,
    fileSize: dialogueAudio.length,
    filePath: dialogueFilePath
  });

  // Add intro/outro music with fade effects
  const finalAudioPath = await addIntroOutroMusic(dialogueFilePath, episodeNumber);

  // Clean up dialogue-only file
  fs.unlinkSync(dialogueFilePath);

  return finalAudioPath;
}

// ============================================================================
// STEP 6B: ADD INTRO/OUTRO MUSIC WITH FADE EFFECTS
// ============================================================================

async function addIntroOutroMusic(dialoguePath, episodeNumber) {
  log('AUDIO', 'Adding intro/outro music with fade effects...');

  const introPath = path.join(__dirname, 'assets', 'intro-music.mp3');
  const outroPath = path.join(__dirname, 'assets', 'outro-music.mp3');
  const finalPath = path.join(__dirname, `episode-${episodeNumber}.mp3`);

  // Check if intro/outro files exist
  if (!fs.existsSync(introPath)) {
    log('WARNING', 'Intro music not found, skipping intro');
    return dialoguePath;
  }
  if (!fs.existsSync(outroPath)) {
    log('WARNING', 'Outro music not found, skipping outro');
    return dialoguePath;
  }

  // Temporary processed files
  const processedIntroPath = path.join(__dirname, `intro-processed-${episodeNumber}.mp3`);
  const processedOutroPath = path.join(__dirname, `outro-processed-${episodeNumber}.mp3`);

  return new Promise((resolve, reject) => {
    // Step 1: Process intro (5 seconds with fade out from 3-5s)
    log('AUDIO', 'Processing intro: 5 seconds with fade out from 3-5s');

    ffmpeg(introPath)
      .duration(5) // Trim to 5 seconds
      .audioFilters([
        'afade=t=out:st=3:d=2' // Fade out starting at 3s for 2s duration
      ])
      .output(processedIntroPath)
      .on('end', () => {
        log('AUDIO', 'Intro processed successfully');

        // Step 2: Process outro (8 seconds with fade in from 0-4s)
        log('AUDIO', 'Processing outro: 8 seconds with fade in from 0-4s');

        ffmpeg(outroPath)
          .duration(8) // Trim to 8 seconds
          .audioFilters([
            'afade=t=in:st=0:d=4' // Fade in starting at 0s for 4s duration
          ])
          .output(processedOutroPath)
          .on('end', () => {
            log('AUDIO', 'Outro processed successfully');

            // Step 3: Concatenate all three files
            log('AUDIO', 'Concatenating intro + dialogue + outro');

            const concatListPath = path.join(__dirname, `concat-${episodeNumber}.txt`);
            const concatContent = `file '${processedIntroPath.replace(/\\/g, '/')}'\nfile '${dialoguePath.replace(/\\/g, '/')}'\nfile '${processedOutroPath.replace(/\\/g, '/')}'`;
            fs.writeFileSync(concatListPath, concatContent);

            ffmpeg()
              .input(concatListPath)
              .inputOptions(['-f', 'concat', '-safe', '0'])
              .audioCodec('libmp3lame')
              .audioBitrate('192k')
              .output(finalPath)
              .on('end', () => {
                // Clean up temporary files
                fs.unlinkSync(processedIntroPath);
                fs.unlinkSync(processedOutroPath);
                fs.unlinkSync(concatListPath);

                const stats = fs.statSync(finalPath);
                log('AUDIO', 'Final episode created successfully', {
                  filePath: finalPath,
                  fileSize: stats.size
                });

                resolve(finalPath);
              })
              .on('error', (err) => {
                log('ERROR', 'Concatenation failed', { error: err.message });
                // Clean up on error
                if (fs.existsSync(processedIntroPath)) fs.unlinkSync(processedIntroPath);
                if (fs.existsSync(processedOutroPath)) fs.unlinkSync(processedOutroPath);
                if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
                reject(err);
              })
              .run();
          })
          .on('error', (err) => {
            log('ERROR', 'Outro processing failed', { error: err.message });
            if (fs.existsSync(processedIntroPath)) fs.unlinkSync(processedIntroPath);
            reject(err);
          })
          .run();
      })
      .on('error', (err) => {
        log('ERROR', 'Intro processing failed', { error: err.message });
        reject(err);
      })
      .run();
  });
}

// ============================================================================
// STEP 6: UPLOAD TO SUPABASE STORAGE
// ============================================================================

async function uploadAudio(audioFilePath, episodeNumber) {
  log('UPLOAD', 'Uploading audio to Supabase Storage...');

  const fileName = `ParSaveables-EP${episodeNumber.toString().padStart(2, '0')}.mp3`;
  const audioBuffer = fs.readFileSync(audioFilePath);

  const { data, error } = await supabase.storage
    .from('podcast-episodes')
    .upload(fileName, audioBuffer, {
      contentType: 'audio/mpeg',
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: publicUrl } = supabase.storage
    .from('podcast-episodes')
    .getPublicUrl(fileName);

  log('UPLOAD', 'Audio uploaded successfully', {
    fileName,
    url: publicUrl.publicUrl
  });

  // Clean up local file
  fs.unlinkSync(audioFilePath);

  return publicUrl.publicUrl;
}

// ============================================================================
// STEP 7: CREATE EPISODE RECORD
// ============================================================================

async function createEpisode(episodeInfo, script, audioUrl) {
  log('DATABASE', 'Creating episode record...');

  // Create episode first (need episode.id for script table)
  const { data: episode, error } = await supabase
    .from('podcast_episodes')
    .insert({
      episode_number: episodeInfo.episodeNumber,
      title: `Episode ${episodeInfo.episodeNumber}: ${episodeInfo.type === 'monthly_recap' ? 'Monthly Mayhem' : 'Season Showdown'}`,
      description: `Annie and Hyzer recap the action from ${episodeInfo.periodStart} to ${episodeInfo.periodEnd}`,
      period_start: episodeInfo.periodStart,
      period_end: episodeInfo.periodEnd,
      type: episodeInfo.type,
      audio_url: audioUrl,
      is_published: true,
      published_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Save script with episode_id (foreign key)
  const wordCount = script.split(/\s+/).length;
  const estimatedDuration = Math.round(wordCount / 150); // ~150 words per minute

  const { error: scriptError } = await supabase
    .from('podcast_scripts')
    .insert({
      episode_id: episode.id,
      script_text: script,
      word_count: wordCount,
      estimated_duration_minutes: estimatedDuration,
      generated_by: 'claude-sonnet-4-5',
      status: 'approved'
    });

  if (scriptError) {
    log('ERROR', 'Failed to save podcast script', { error: scriptError.message, details: scriptError });
  }

  log('DATABASE', 'Episode and script created successfully', {
    episodeId: episode.id,
    wordCount,
    estimatedDuration
  });

  return episode;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    log('START', '🎙️  Starting enhanced podcast generation...');

    // Step 1: Determine period
    const episodeInfo = await determineEpisodePeriod();
    log('INFO', 'Episode info determined', episodeInfo);

    // Step 2: Fetch previous script
    const previousScript = await fetchPreviousScript(episodeInfo.episodeNumber);
    if (previousScript) {
      log('PREVIOUS', 'Previous episode script loaded for context');
    }

    // Step 3: Load custom talking points
    const talkingPoints = loadTalkingPoints(episodeInfo.episodeNumber);
    log('TALKING_POINTS', 'Custom talking points loaded', {
      categories: Object.keys(talkingPoints).length
    });

    // Step 4: Fetch comprehensive data
    await logToDatabase(null, 'fetch_data', episodeInfo);
    const data = await fetchComprehensiveData(episodeInfo.periodStart, episodeInfo.periodEnd);
    await updateLogSuccess(null, 'fetch_data', true);
    log('DATA', 'Comprehensive data fetched', {
      rounds: data.rounds.length,
      challenges: data.challenges.length,
      blessings: data.blessings.length,
      transactions: data.transactions.length
    });

    // Step 5: Generate dialogue script
    await logToDatabase(null, 'generate_script');
    const script = await generateDialogueScript(data, episodeInfo, previousScript, talkingPoints);
    await updateLogSuccess(null, 'generate_script', true);

    // Step 6: Generate dialogue audio
    await logToDatabase(null, 'generate_audio');
    const audioFilePath = await generateDialogueAudio(script, episodeInfo.episodeNumber);
    await updateLogSuccess(null, 'generate_audio', true);

    // Step 7: Upload audio
    await logToDatabase(null, 'upload_audio');
    const audioUrl = await uploadAudio(audioFilePath, episodeInfo.episodeNumber);
    await updateLogSuccess(null, 'upload_audio', true);

    // Step 8: Create episode
    await logToDatabase(null, 'create_episode');
    const episode = await createEpisode(episodeInfo, script, audioUrl);
    await updateLogSuccess(episode.id, 'create_episode', true);

    log('SUCCESS', '✅ Enhanced podcast generation completed!', {
      episodeId: episode.id,
      episodeNumber: episode.episode_number,
      audioUrl: episode.audio_url,
      format: 'Two-person dialogue'
    });

    process.exit(0);
  } catch (error) {
    log('ERROR', '❌ Podcast generation failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
