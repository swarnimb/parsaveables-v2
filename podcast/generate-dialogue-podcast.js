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
    hostVoiceId: process.env.ELEVENLABS_HOST_VOICE_ID || 'pNInz6obpgDQGcFmaJgB', // Adam
    cohostVoiceId: process.env.ELEVENLABS_COHOST_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL' // Bella
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

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  periodEnd.setDate(periodEnd.getDate() - 1); // Last day of the month period

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

  // 3. Fetch bets for the period
  const { data: bets } = await supabase
    .from('bets')
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
    .select('player_name, total_pulps')
    .order('total_pulps', { ascending: false })
    .limit(10);

  // 6. Calculate statistics
  const stats = calculateStats(rounds, challenges, bets, transactions);

  return {
    rounds: rounds || [],
    challenges: challenges || [],
    bets: bets || [],
    transactions: transactions || [],
    leaderboard: leaderboard || [],
    stats
  };
}

function calculateStats(rounds, challenges, bets, transactions) {
  const stats = {
    totalRounds: rounds.length,
    totalPlayers: new Set(rounds.flatMap(r => r.player_rounds?.map(pr => pr.player_name) || [])).size,
    totalChallenges: challenges.length,
    challengesAccepted: challenges.filter(c => c.status === 'accepted').length,
    challengesWon: challenges.filter(c => c.status === 'won').length,
    totalBets: bets.length,
    totalWagered: bets.reduce((sum, b) => sum + (b.wager_amount || 0), 0),
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
// STEP 4: GENERATE TWO-PERSON DIALOGUE SCRIPT
// ============================================================================

async function generateDialogueScript(data, episodeInfo, previousScript, talkingPoints) {
  log('SCRIPT', 'Generating two-person dialogue script with Claude...');

  const prompt = `You are creating an ENTHUSIASTIC, STORY-DRIVEN two-person podcast episode for ParSaveables, a disc golf league where friends compete, bet, and create chaos.

**CRITICAL FORMAT INSTRUCTIONS:**
- Write this as a DIALOGUE between TWO HOSTS (Annie and Hyzer)
- Format EVERY LINE as: "[ANNIE]:" or "[HYZER]:" followed by what they say (with square brackets)
- This is SPORTS RADIO COMMENTARY, not a casual chat - bring energy and enthusiasm!
- NO narration, NO stage directions, ONLY dialogue
- Each person should speak 2-5 sentences before the other responds
- Total length: 600-800 words (3-4 minutes when spoken)

**ABSOLUTELY NO NON-WORD FILLERS OR SOUND EFFECTS:**
- NO [laughs], [chuckles], [giggles]
- NO [gasps], [sighs], [groans]
- NO [whistles], [claps], [snaps]
- NO [pauses], [beat], [silence]
- NO stage directions or actions in brackets
- ONLY use actual spoken words that can be read aloud
- If you want to convey excitement, use exclamation points and energetic language
- If you want to show a pause, just end the sentence and start a new one

**Episode Context:**
- Episode ${episodeInfo.episodeNumber}
- Period: ${episodeInfo.periodStart} to ${episodeInfo.periodEnd}
- Type: ${episodeInfo.type}

**Statistics:**
- Rounds Played: ${data.stats.totalRounds}
- Unique Players: ${data.stats.totalPlayers}
- Total Challenges: ${data.stats.totalChallenges} (${data.stats.challengesAccepted} accepted)
- Total Bets Placed: ${data.stats.totalBets}
- Total PULPs Wagered: ${data.stats.totalWagered}
${data.stats.mostAces > 0 ? `- Most Aces: ${data.stats.topAcePlayer} with ${data.stats.mostAces} aces!` : ''}
${data.stats.mostBirdies > 0 ? `- Most Birdies: ${data.stats.topBirdiePlayer} with ${data.stats.mostBirdies} birdies` : ''}

**Top PULP Holders:**
${data.leaderboard.slice(0, 5).map((p, i) => `${i + 1}. ${p.player_name}: ${p.total_pulps} PULPs`).join('\n')}

**Recent Rounds:**
${data.rounds.slice(-3).map(r =>
  \`- \${r.date} at \${r.course_name}: \${r.player_rounds?.length || 0} players\${
    r.player_rounds?.[0] ? \` (Winner: \${r.player_rounds.find(pr => pr.rank === 1)?.player_name || 'N/A'})\` : ''
  }\`
).join('\n')}

**Bets This Month:**
${formatBetsForPrompt(data.bets)}

**Challenges This Month:**
${formatChallengesForPrompt(data.challenges)}

**Top PULP Transactions:**
${data.transactions.slice(0, 5).map(t =>
  \`- \${t.player?.player_name}: \${t.amount > 0 ? '+' : ''}\${t.amount} PULPs (\${t.description})\`
).join('\n')}

${previousScript ? \`**PREVIOUS EPISODE COVERED:**
\${previousScript.substring(0, 500)}...

IMPORTANT: Don't repeat topics from the previous episode. Find NEW angles and stories.\` : ''}

${Object.keys(talkingPoints).length > 0 ? \`**CUSTOM TALKING POINTS (incorporate these naturally):**
\${Object.entries(talkingPoints).map(([category, points]) => {
  if (!Array.isArray(points) || points.length === 0) return '';
  return \`\${category.toUpperCase()}:\\n\${points.map(p => \`- \${p}\`).join('\\n')}\`;
}).filter(Boolean).join('\\n\\n')}\` : ''}

**CRITICAL - What Data You Have:**

1. STATS & RANKINGS - Use for objective facts:
   - Who won rounds, their scores, birdies/eagles/aces
   - Challenge outcomes with full details (who challenged who, wager, outcome)
   - Bet details with predictions (who they picked, wager, won/lost)
   - PULP transactions and leaderboard standings

2. TALKING POINTS - Use for anecdotal storytelling (if provided):
   - Specific shot details (water hazards, tree hits, clutch putts)
   - Funny moments and on-course incidents
   - Drama, controversies, and rivalries
   - Any context manually added by user

**DON'T MAKE STUFF UP:**
- DON'T invent shot details (putts, hazards, etc.) if not in talking points
- DON'T create drama, controversies, or stories that aren't in the data or talking points
- DO highlight impressive stats and roast poor performances
- DO use talking points to build narratives and add color commentary
- If talking points are empty, focus on stats-driven storytelling
- If data is sparse or boring, acknowledge it and move on

**Tone & Style Guidelines:**

**ENERGY LEVEL:**
- Enthusiastic sports radio commentary - bring excitement and storytelling flair!
- Use exclamation points for genuine excitement (aces, wins, upsets, drama)
- Build anticipation and suspense when telling stories
- Genuine emotion - celebrate great performances, sympathize with brutal losses

**STORYTELLING APPROACH:**
- NARRATIVE-FIRST: Stats support stories, not the other way around
- Build mysteries and intrigue (if talking points mention unresolved drama)
- Use contrast and irony for comedic effect
- Tag-team storytelling - complete each other's thoughts mid-sentence

**CHARACTER VOICES:**
- HYZER: Stats enthusiast who gets genuinely excited about numbers and patterns
- ANNIE: Story curator who connects stats to human drama and context
- Both: Self-deprecating about the league ("bunch of degenerates"), enthusiastic about the chaos

**RUNNING GAGS & LEAGUE LINGO:**
- "The format strikes!" - When point systems create unexpected winners
- "It's par saveable" - For recoveries or mediocre but salvageable results
- "Blessed" / "Cursed" - For clutch moments or chokes
- "Degenerates" - Self-deprecating term for league players
- "Treesus" - Disc golf deity (use sparingly)
- "Heavy bags" - Reference to league culture
- Beer-related chaos - Recurring theme if it appears in talking points

**WHAT TO AVOID:**
- Deadpan or overly sarcastic delivery
- Dry, unenthusiastic recaps
- "Another month, another round of questionable decisions" (OLD opening - don't use)
- Corporate podcast voice or forced positivity
- Over-explaining stats - quick dumps, then move to story

**REQUIRED OPENING STRUCTURE (Lines 1-10 ish):**

1. Dual enthusiastic welcome:
   [HYZER]: Welcome folks!
   [ANNIE]: Welcome folks!

2. Show title announcement + tagline:
   [HYZER]: This is PAR SAVEABLES!
   [ANNIE]: [Energetic league descriptor - "The world of heavy bags, curses, and pocket beers!"]

3. Host introductions (character-defining):
   [HYZER]: I'm Hyzer, your resident stats nerd who [self-deprecating quirk]—
   [ANNIE]: —and I'm Annie, here to [storytelling role]. For those just tuning in, ParSaveables is [brief league description]—
   [HYZER]: —we track EVERYTHING! [List exciting things tracked]—

4. Episode preview (build anticipation):
   [ANNIE]: We've got some absolute [doozies/gems/chaos] to cover today. We're talking [period recap].
   [HYZER]: [Notable stat or drama hook]

5. Hook/tease (if major story exists):
   [ANNIE]: But the REAL story [tease biggest moment]
   [HYZER]: [React or build on tease]

**CONVERSATION FLOW:**

**ACT 1: COLD OPEN & SETUP (Lines 1-15)**
- Dual welcome + show intro
- Host character intros
- Episode preview and hooks

**ACT 2: ROUND RECAPS (Lines 16-40)**
- 2-3 rounds or story beats
- Quick stat dump → interesting narrative observation
- Use "The format strikes!" if point system creates surprises
- Highlight aces, upsets, dominant performances

**ACT 3: BET & CHALLENGE BREAKDOWN (Lines 41-55)**
- Who bet on what, winners and losers (roast bad predictions)
- Challenge outcomes - celebrate winners, roast those who rejected
- PULP economy movement (leaderboard climbs/falls)

**ACT 4: TALKING POINTS SHOWCASE (Lines 56-70, if provided)**
- Weave in anecdotal stories from talking points
- Beer drama, controversies, funny moments
- Build mysteries (if talking points mention unresolved drama)

**ACT 5: SIGN OFF (Lines 71-80)**
- Positive forward look (upcoming rounds, new players, teasers)
- Rhetorical questions (unanswered mysteries, predictions)
- Catchphrase farewell: "Keep those discs flying and your beers accounted for—"
- Show tagline: "—and we'll catch you next time on Par Saveables!"
- Final tagline: "Where the bags are heavy, the language is colorful, and the [league characteristic]!"

**TAG-TEAM STORYTELLING TECHNIQUE:**

Share sentences with dashes:
[ANNIE]: So Mike challenged Jake for 50 PULPs, and let me tell you—
[HYZER]: —Jake REJECTED it! Paid the cowardice tax!

Build on each other:
[HYZER]: Three rounds this month.
[ANNIE]: But here's the kicker—
[HYZER]: Two of them were won by the SAME person!

**EXAMPLES OF GOOD DIALOGUE:**

**Stats-Driven Story (No talking points):**
[HYZER]: Mike bet 200 PULPs on himself finishing top 3!
[ANNIE]: How'd that go?
[HYZER]: Eighth place.
[ANNIE]: Blessed.
[HYZER]: It's par saveable... theoretically.

**With Talking Point:**
TALKING POINT: "Jake's drive on hole 5 hit a tree and bounced into the water"
[ANNIE]: Jake's tee shot on hole 5 found a tree.
[HYZER]: Classic.
[ANNIE]: But wait, it gets better—bounced right into the water.
[HYZER]: Treesus works in mysterious ways.

**Energy & Excitement (Ace):**
TALKING POINT: "Sarah hit an ace on hole 12 with a forehand"
[HYZER]: And then Sarah—oh man—chains on hole 12!
[ANNIE]: Wait, ace?
[HYZER]: ACE! Forehand, too!
[ANNIE]: That's the highlight of the month right there!

**Mystery Building:**
TALKING POINT: "Controversy during round 3, details TBD"
[ANNIE]: And then we had the round 3... situation.
[HYZER]: The one we literally cannot discuss.
[ANNIE]: Not yet, anyway.
[HYZER]: All I'll say is, the league has never seen anything like it.

**BAD EXAMPLES (Don't do this):**

❌ Making stuff up:
[ANNIE]: Mike had some clutch 40-foot putts! (NOT IN DATA)

❌ Using sound effect fillers:
[HYZER]: [laughs] That's rough. (NO SOUND EFFECTS IN BRACKETS)

❌ Deadpan when you should be excited:
[ANNIE]: Sarah got an ace. Moving on. (SHOW EXCITEMENT!)

❌ Over-explaining boring stats:
[HYZER]: So the average score was 54.3, which is 2.1 strokes better than last month's 56.4... (TOO MUCH DETAIL)

**FINAL CHECKLIST BEFORE WRITING:**
✅ Dual welcome + show title
✅ Host character intros
✅ Episode preview with hooks
✅ 2-3 story beats from stats/rounds
✅ Bet & challenge breakdown
✅ Weave in talking points naturally (if provided)
✅ Build mysteries (if unresolved drama exists)
✅ Catchphrase sign-off
✅ Show tagline at end
✅ NO brackets, NO made-up details
✅ Enthusiastic sports radio energy throughout

NOW WRITE THE FULL DIALOGUE (600-800 words, DIALOGUE FORMAT ONLY):`;

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

  await supabase
    .from('podcast_scripts')
    .insert({
      episode_id: episode.id,
      script_text: script,
      word_count: wordCount,
      estimated_duration_minutes: estimatedDuration,
      generated_by: 'claude-sonnet-4-5',
      status: 'published'
    });

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
      bets: data.bets.length,
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
