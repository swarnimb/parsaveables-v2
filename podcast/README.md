# ParSaveables Podcast Generator

Automated podcast generation system that creates monthly recap episodes covering highlights, rivalries, and memorable moments from disc golf rounds.

## How It Works

1. **Determines Episode Period**: Automatically calculates the next monthly period based on the last published episode
2. **Fetches Round Data**: Pulls round results, challenges, and leaderboard standings from Supabase
3. **Generates Script**: Uses Claude AI to create an engaging 2-3 minute podcast script
4. **Generates Audio**: Converts script to audio using ElevenLabs text-to-speech
5. **Uploads to Storage**: Saves audio file to Supabase Storage
6. **Publishes Episode**: Creates episode record in database and marks it as published

## Prerequisites

- Node.js 18+
- Environment variables configured (see below)
- Supabase database with podcast tables
- ElevenLabs API account

## Environment Variables

Required in your `.env.local`:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Claude AI
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB  # Adam voice (default)
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
- **Episode Record**: Created in `podcast_episodes` table
- **Script**: Saved in `podcast_scripts` table
- **Logs**: Generation stages logged to `podcast_generation_logs` table

## Troubleshooting

**Error: "ElevenLabs API error"**
- Check your ELEVENLABS_API_KEY is valid
- Verify you have credits in your ElevenLabs account

**Error: "Failed to fetch rounds"**
- Ensure SUPABASE_SERVICE_ROLE_KEY is set (not anon key)
- Check RLS policies allow service role access

**Error: "Script too long"**
- The script generator aims for 300-500 words
- ElevenLabs has a 5000 character limit per request

## Cost Estimate

Per episode generation:
- Claude API: ~$0.01-0.02 (1-2K tokens)
- ElevenLabs: ~$0.10-0.15 (500 words ≈ 2-3 min audio)
- **Total: ~$0.12 per episode**

Monthly podcast = ~$0.12/month
