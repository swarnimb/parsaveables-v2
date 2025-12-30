# ParSaveables v2 - Deployment Guide

## Vercel Deployment

This project is configured for deployment on Vercel with serverless functions.

### Prerequisites

1. A Vercel account (free tier works)
2. Supabase project with database set up
3. Anthropic API key (for Claude Vision)
4. Gmail API credentials (for scorecard processing)
5. ElevenLabs API key (for podcast generation)

### Environment Variables

Set these environment variables in your Vercel project settings (Settings → Environment Variables):

#### Required for All Environments

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Anthropic Claude API
ANTHROPIC_API_KEY=your_anthropic_api_key

# Gmail API (for scorecard processing)
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_REFRESH_TOKEN=your_gmail_refresh_token

# ElevenLabs (for podcast generation)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_preferred_voice_id
```

#### Optional Configuration

```bash
# Default scorecard processing email
DEFAULT_SCORECARD_EMAIL=your_group_email@gmail.com

# Enable debug logging
DEBUG=true
```

### Deployment Steps

1. **Connect Repository to Vercel**
   ```bash
   # Install Vercel CLI (optional)
   npm install -g vercel

   # Login to Vercel
   vercel login

   # Deploy
   vercel
   ```

2. **Set Environment Variables**
   - Go to your project in Vercel Dashboard
   - Navigate to Settings → Environment Variables
   - Add all required variables listed above
   - Make sure to set them for Production, Preview, and Development environments

3. **Configure Build Settings** (usually auto-detected)
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Deploy**
   ```bash
   # Production deployment
   vercel --prod
   ```

### API Routes

After deployment, your API routes will be available at:

- `https://your-domain.vercel.app/api/processScorecard` - Process scorecards
- `https://your-domain.vercel.app/api/generatePodcast` - Generate podcast
- `https://your-domain.vercel.app/api/pulp/getBalance` - Get PULP balance
- `https://your-domain.vercel.app/api/pulp/getTransactions` - Get transactions
- `https://your-domain.vercel.app/api/pulp/placeBet` - Place bet
- `https://your-domain.vercel.app/api/pulp/issueChallenge` - Issue challenge
- `https://your-domain.vercel.app/api/pulp/respondToChallenge` - Respond to challenge
- `https://your-domain.vercel.app/api/pulp/purchaseAdvantage` - Purchase advantage
- `https://your-domain.vercel.app/api/pulp/lockBetting` - Lock betting

### Cron Jobs (Optional)

To automatically process scorecards, add a `vercel.json` cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/processScorecard",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

This runs scorecard processing every 6 hours.

### Database Setup

1. Run the migration scripts in `database/migrations/` in order
2. Seed initial data with `database/seeds/seed_data.sql`
3. Configure Row Level Security policies in Supabase dashboard

### Testing the Deployment

After deployment, test the following:

1. **Frontend**
   - Login/Signup flow
   - Leaderboard displays correctly
   - Dashboard shows stats
   - Betting page functions work

2. **API Endpoints**
   ```bash
   # Test scorecard processing (requires admin auth)
   curl -X POST https://your-domain.vercel.app/api/processScorecard \
     -H "Authorization: Bearer YOUR_TOKEN"

   # Test PULP balance
   curl https://your-domain.vercel.app/api/pulp/getBalance?playerId=1
   ```

### Troubleshooting

#### API Routes Return 404
- Ensure `api/` directory exists at project root
- Check Vercel deployment logs for build errors
- Verify environment variables are set

#### Import Errors in API Functions
- All imports use correct paths relative to project root
- `api/` files import from `../src/services/`
- Ensure all dependencies are in `package.json`

#### Authentication Issues
- Verify Supabase URL and anon key are correct
- Check JWT token expiration in Supabase settings
- Ensure RLS policies are configured correctly

### Cost Optimization

To stay under $5/month:

- **Vercel**: Free tier (100GB bandwidth, unlimited serverless function executions)
- **Supabase**: Free tier (500MB database, 2GB bandwidth)
- **Anthropic Claude**: Pay-as-you-go (~$0.50-2/month for typical usage)
- **ElevenLabs**: Free tier (10,000 characters/month for podcast)

**Total estimated cost**: $0-5/month depending on usage

### Support

For deployment issues:
- Check Vercel deployment logs
- Review Supabase logs in dashboard
- Consult `docs/ARCHITECTURE.md` for system design
- Check `docs/API-CONTRACT.md` for API specifications
