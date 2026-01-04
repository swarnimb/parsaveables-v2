# ParSaveables Podcast Generator

Automated podcast generation system that creates monthly recap episodes with enthusiastic sports radio commentary featuring two hosts (Annie & Hyzer) covering highlights, rivalries, and memorable moments from disc golf rounds.

## How It Works

1. **Determines Episode Period**: Automatically calculates the next monthly period based on the last published episode
2. **Fetches Round Data**: Pulls round results, challenges, bets, PULP transactions, and leaderboard standings from Supabase
3. **Generates Script**: Uses Claude AI to create an engaging 3-4 minute podcast script
   - **Tone**: Enthusiastic sports radio commentary (not dry/deadpan)
   - **Format**: Two-host dialogue between Annie (story curator) and Hyzer (stats enthusiast)
   - **Structure**: 5-act format (Cold Open, Round Recaps, Bets/Challenges, Talking Points, Sign Off)
   - **Target**: 600-800 words (3-4 minutes when spoken)
4. **Generates Audio**: Converts script to audio using ElevenLabs with two distinct voices
   - **Annie**: Story curator voice (ELEVENLABS_HOST_VOICE_ID)
   - **Hyzer**: Stats enthusiast voice (ELEVENLABS_COHOST_VOICE_ID)
5. **Processes Music**: Adds intro/outro music with professional fade effects via FFmpeg
   - **Intro**: 5 seconds with fade out from 3-5s
   - **Outro**: 8 seconds with fade in from 0-4s
   - **Final**: Concatenates intro + dialogue + outro
6. **Uploads to Storage**: Saves final audio file to Supabase Storage
7. **Publishes Episode**: Creates episode record in database and marks it as published

## Prerequisites

- Node.js 18+
- FFmpeg installed and in PATH (required for intro/outro music processing)
- Environment variables configured (see below)
- Supabase database with podcast tables
- ElevenLabs API account with two voice IDs configured

## Environment Variables

Required in your `.env.local`:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Claude AI
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# ElevenLabs (Two-Host Setup)
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_HOST_VOICE_ID=pNInz6obpgDQGcFmaJgB       # Annie (story curator)
ELEVENLABS_COHOST_VOICE_ID=EXAVITQu4vr4xnSDxMaL    # Hyzer (stats enthusiast)
```

## Installation

```bash
cd podcast
npm install
```

## Usage

### Manual Generation

Generate a podcast episode manually:

```bash
npm run generate
```

Or directly:

```bash
node generate-dialogue-podcast.js
```

### Via API Endpoint

Trigger from your app's admin panel:

```bash
POST /api/generatePodcast
```

This is called by the "Process Scorecards" modal in the admin dropdown.

### Automated (Vercel Cron)

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/generatePodcast",
    "schedule": "0 0 1 * *"
  }]
}
```

This runs on the 1st of every month at midnight UTC.

## Output

- **Audio File**: Uploaded to `podcast-episodes/ParSaveables-EP##.mp3` in Supabase Storage
  - Includes intro music (5s) + dialogue (2-3min) + outro music (8s) ≈ 3-4 minutes total
- **Episode Record**: Created in `podcast_episodes` table
- **Script**: Saved in `podcast_scripts` table (dialogue only, no intro/outro music)
- **Logs**: Generation stages logged to `podcast_generation_logs` table

## Troubleshooting

**Error: "ElevenLabs API error"**
- Check your ELEVENLABS_API_KEY is valid
- Verify you have credits in your ElevenLabs account
- Ensure both ELEVENLABS_HOST_VOICE_ID and ELEVENLABS_COHOST_VOICE_ID are set

**Error: "Failed to fetch rounds"**
- Ensure SUPABASE_SERVICE_ROLE_KEY is set (not anon key)
- Check RLS policies allow service role access

**Error: "FFmpeg not found" or "Intro/outro processing failed"**
- Ensure FFmpeg is installed and accessible in PATH
- Verify `assets/intro-music.mp3` and `assets/outro-music.mp3` exist in the podcast directory
- On Windows: Install FFmpeg via Chocolatey or download binaries
- On macOS: Install via Homebrew (`brew install ffmpeg`)
- On Linux: Install via apt (`sudo apt-get install ffmpeg`)

**Error: "Script too long"**
- The script generator aims for 600-800 words (3-4 minutes)
- ElevenLabs has a 5000 character limit per request
- Each voice processes their lines separately

## Script Style Guide

The podcast uses an **enthusiastic sports radio commentary** tone with a two-host dialogue format.

### Character Voices

- **Hyzer**: Stats enthusiast who gets genuinely excited about numbers and patterns
- **Annie**: Story curator who connects stats to human drama and context
- **Both**: Self-deprecating about the league ("bunch of degenerates"), enthusiastic about the chaos

### 5-Act Structure

1. **ACT 1: Cold Open & Setup** (Lines 1-15)
   - Dual welcome: "Welcome folks!"
   - Show title: "This is PAR SAVEABLES!"
   - Host character intros
   - Episode preview and hooks

2. **ACT 2: Round Recaps** (Lines 16-40)
   - 2-3 rounds or story beats
   - Quick stat dump → interesting narrative observation
   - Highlight aces, upsets, dominant performances

3. **ACT 3: Bet & Challenge Breakdown** (Lines 41-55)
   - Who bet on what, winners and losers
   - Challenge outcomes - celebrate winners, roast those who rejected
   - PULP economy movement

4. **ACT 4: Talking Points Showcase** (Lines 56-70, if provided)
   - Anecdotal stories from custom talking points
   - Beer drama, controversies, funny moments
   - Build mysteries for unresolved drama

5. **ACT 5: Sign Off** (Lines 71-80)
   - Positive forward look
   - Rhetorical questions, predictions
   - **Required catchphrase**: "Keep those discs flying and your beers accounted for—"
   - **Show tagline**: "—and we'll catch you next time on Par Saveables!"
   - **Final tagline**: "Where the bags are heavy, the language is colorful, and the [league characteristic]!"

### Running Gags & League Lingo

- **"The format strikes!"** - When point systems create unexpected winners
- **"It's par saveable"** - For recoveries or mediocre but salvageable results
- **"Blessed" / "Cursed"** - For clutch moments or chokes
- **"Degenerates"** - Self-deprecating term for league players
- **"Treesus"** - Disc golf deity (use sparingly)
- **"Heavy bags"** - Reference to league culture

### Tag-Team Storytelling

Hosts complete each other's thoughts with dashed interruptions:

```
ANNIE: So Mike challenged Jake for 50 PULPs, and let me tell you—
HYZER: —Jake REJECTED it! Paid the cowardice tax!
```

## Audio Processing Technical Details

The podcast uses a three-step FFmpeg workflow for professional intro/outro music integration:

### Step 1: Intro Processing
- **Source**: `assets/intro-music.mp3`
- **Duration**: Trimmed to exactly 5 seconds
- **Fade Effect**: Fade OUT starting at 3 seconds for 2 seconds duration (`afade=t=out:st=3:d=2`)
- **Output**: Temporary processed intro file

### Step 2: Outro Processing
- **Source**: `assets/outro-music.mp3`
- **Duration**: Trimmed to exactly 8 seconds
- **Fade Effect**: Fade IN starting at 0 seconds for 4 seconds duration (`afade=t=in:st=0:d=4`)
- **Output**: Temporary processed outro file

### Step 3: Concatenation
- **Input**: Processed intro + dialogue audio + processed outro
- **Method**: FFmpeg concat demuxer
- **Output**: Final episode MP3 (192 kbps)
- **Cleanup**: Removes all temporary files

### Total Episode Length
- Intro: 5 seconds
- Dialogue: ~2-3 minutes (600-800 words)
- Outro: 8 seconds
- **Total**: ~3-4 minutes

## Cost Estimate

Per episode generation:
- Claude API: ~$0.01-0.02 (1-2K tokens)
- ElevenLabs: ~$0.10-0.15 (500 words ≈ 2-3 min audio)
- **Total: ~$0.12 per episode**

Monthly podcast = ~$0.12/month
