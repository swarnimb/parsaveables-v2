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
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  const prompt = `You are creating a fun, engaging TWO-PERSON CONVERSATIONAL podcast episode for ParSaveables, a disc golf league for friends.

**CRITICAL FORMAT INSTRUCTIONS:**
- Write this as a DIALOGUE between TWO HOSTS (Annie and Hyzer)
- Format EVERY LINE as: "ANNIE:" or "HYZER:" followed by what they say
- Make it feel like a natural conversation with back-and-forth banter
- NO narration, NO stage directions, ONLY dialogue
- Each person should speak 3-5 sentences before the other responds
- Total length: 600-800 words (3-4 minutes when spoken)

**ABSOLUTELY NO NON-WORD FILLERS OR SOUND EFFECTS:**
- NO [laughs], [chuckles], [giggles]
- NO [gasps], [sighs], [groans]
- NO [whistles], [claps], [snaps]
- NO [pauses], [beat], [silence]
- NO stage directions or actions in brackets
- ONLY use actual spoken words that can be read aloud
- If you want to convey a laugh, write "Ha" or have them say something funny
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
  `- ${r.date} at ${r.course_name}: ${r.player_rounds?.length || 0} players${
    r.player_rounds?.[0] ? ` (Winner: ${r.player_rounds.find(pr => pr.rank === 1)?.player_name || 'N/A'})` : ''
  }`
).join('\n')}

**Bets This Month:**
${formatBetsForPrompt(data.bets)}

**Challenges This Month:**
${formatChallengesForPrompt(data.challenges)}

**Top PULP Transactions:**
${data.transactions.slice(0, 5).map(t =>
  `- ${t.player?.player_name}: ${t.amount > 0 ? '+' : ''}${t.amount} PULPs (${t.description})`
).join('\n')}

${previousScript ? `**PREVIOUS EPISODE COVERED:**
${previousScript.substring(0, 500)}...

IMPORTANT: Don't repeat topics from the previous episode. Find NEW angles and stories.` : ''}

${Object.keys(talkingPoints).length > 0 ? `**CUSTOM TALKING POINTS (incorporate these naturally):**
${Object.entries(talkingPoints).map(([category, points]) => {
  if (!Array.isArray(points) || points.length === 0) return '';
  return `${category.toUpperCase()}:\n${points.map(p => `- ${p}`).join('\n')}`;
}).filter(Boolean).join('\n\n')}` : ''}

**CRITICAL - What Data You Have:**

1. STATS & RANKINGS - Use for objective facts:
   - Who won rounds, their scores, birdies/eagles/aces
   - Challenge outcomes with full details (who challenged who, wager, outcome)
   - Bet details with predictions (who they picked, wager, won/lost)
   - PULP transactions and leaderboard standings

2. TALKING POINTS - Use ONLY for anecdotal color (if provided):
   - Specific shot details (water hazards, tree hits, clutch putts)
   - Funny moments and on-course incidents
   - Drama and rivalries
   - Any context manually added by user

**DON'T MAKE STUFF UP:**
- DON'T invent shot details (putts, hazards, etc.) if not in talking points
- DON'T create drama that isn't in the data
- DO roast players based on their stats and bet/challenge results
- DO use talking points to add personality when available
- If talking points are empty, lean into dry humor about stats

**Tone & Humor Guidelines:**
- CASUAL - Friends recapping over beers, NOT SportsCenter
- SARCASTIC & DRY - Roast performances, understate big moments
- Light roasting of players - friendly mockery, not mean
- Mix deadpan observations with occasional genuine excitement
- Use "It's par saveable" when someone recovers from bad performance or has mediocre result
- Subtly reference "blessings" and "curses" for clutch moments or chokes
- Self-aware - acknowledge when stats are boring or unimpressive
- NO forced enthusiasm, NO exclamation points every sentence, NO corporate podcast voice

**Opening Catchphrase:**
"Another month, another round of questionable decisions."

**Conversation Flow (Natural, Not Forced):**
1. COLD OPEN - Catchphrase, mention the period
2. ROUND RECAP - Who won, who sucked, notable stats
3. BET BREAKDOWN - Who bet on what, winners and losers (roast bad predictions)
4. CHALLENGE DRAMA - Call out cowards who rejected, celebrate winners
5. PULP ECONOMY - Leaderboard movement, biggest gains/losses
6. WILDCARD - Funny moment from talking points OR roast boring stats
7. SIGN OFF - Quick tease or shade someone

**Example Tone (With Data):**

GOOD (Using stats, no fillers):
HYZER: Mike bet 200 PULPs on himself finishing top 3.
ANNIE: How'd that go?
HYZER: Eighth place.
ANNIE: Blessed.

GOOD (With talking point, no fillers):
TALKING POINT: "Jake's drive hit a tree"
ANNIE: Jake's tee shot on hole 5 found a tree.
HYZER: Someone must've cursed that throw.
ANNIE: Or he just threw it at a tree. Hard to tell.

BAD (Making stuff up):
ANNIE: Mike had some clutch 40-foot putts! ❌ DON'T INVENT THIS
HYZER: Yeah and that drive was incredible! ❌ DON'T INVENT THIS

BAD (Using non-word fillers):
ANNIE: Mike bet on himself. [laughs] ❌ NO BRACKETS
HYZER: [sighs] That's rough. ❌ NO SOUND EFFECTS
ANNIE: [pauses] Should we tell him? ❌ NO STAGE DIRECTIONS

GOOD (Expressing same thing with words):
ANNIE: Mike bet on himself. Ha.
HYZER: That's rough.
ANNIE: Should we tell him?

**Examples of Good Roasting:**

ANNIE: Sarah challenged Jake for 50 PULPs.
HYZER: And?
ANNIE: Jake rejected it. Paid the cowardice tax.
HYZER: Classic.

HYZER: Mike's down to 10 PULPs on the leaderboard.
ANNIE: It's par saveable.
HYZER: I mean, technically he could earn them back... theoretically.

**Opening Example:**
ANNIE: Another month, another round of questionable decisions.
HYZER: December was... something.
ANNIE: That's generous.

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
    // Match "ANNIE:" or "HYZER:" patterns
    const match = line.match(/^(ANNIE|HYZER):\s*(.+)$/i);
    if (!match) continue;

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

  return new Promise((resolve, reject) => {
    // Create concat file list for ffmpeg
    const concatListPath = path.join(__dirname, `concat-${episodeNumber}.txt`);
    const concatContent = `file '${introPath.replace(/\\/g, '/')}'\nfile '${dialoguePath.replace(/\\/g, '/')}'\nfile '${outroPath.replace(/\\/g, '/')}'`;
    fs.writeFileSync(concatListPath, concatContent);

    ffmpeg()
      .input(concatListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      // Add fade effects using complex filter
      .complexFilter([
        // Intro: fade in from 0s for 2 seconds
        '[0:a]afade=t=in:st=0:d=2[intro]',
        // Dialogue: no fade (pass through)
        '[1:a]acopy[dialogue]',
        // Outro: fade out starting 3 seconds before end, lasting 3 seconds
        '[2:a]afade=t=out:st=0:d=3[outro]',
        // Concatenate all three
        '[intro][dialogue][outro]concat=n=3:v=0:a=1[out]'
      ])
      .outputOptions(['-map', '[out]'])
      .output(finalPath)
      .on('start', (cmd) => {
        log('AUDIO', 'FFmpeg command started', { command: cmd });
      })
      .on('end', () => {
        // Clean up concat list file
        fs.unlinkSync(concatListPath);

        const stats = fs.statSync(finalPath);
        log('AUDIO', 'Final audio with intro/outro created', {
          filePath: finalPath,
          fileSize: stats.size
        });
        resolve(finalPath);
      })
      .on('error', (err) => {
        log('ERROR', 'FFmpeg processing failed', { error: err.message });
        // Clean up concat list if exists
        if (fs.existsSync(concatListPath)) {
          fs.unlinkSync(concatListPath);
        }
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
