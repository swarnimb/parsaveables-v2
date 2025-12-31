# GitHub Actions Setup for Monthly Podcast Automation

## 📋 Overview

The monthly podcast is now automated using **GitHub Actions** (free!) instead of Vercel crons (paid).

- **Schedule:** 1st of every month at 12:00 AM UTC
- **Workflow file:** `.github/workflows/monthly-podcast.yml`
- **Cost:** $0 (GitHub Actions is free for public repos, 2,000 minutes/month for private repos)

---

## 🔐 Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### How to Add Secrets:
1. Go to your GitHub repo: `https://github.com/YOUR_USERNAME/parsaveables-v2`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below:

### Secrets to Add:

| Secret Name | Value (from .env.local) |
|-------------|------------------------|
| `VITE_SUPABASE_URL` | `https://bcovevbtcdsgzbrieiin.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...` (your service role key) |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-rzzFLJk4tA8eD3N21C9DpFTx...` (your Anthropic key) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5-20250929` |
| `ELEVENLABS_API_KEY` | `sk_bea21bf387197581aebdb415642e0e5ffb61c8c2fe9ec152` |
| `ELEVENLABS_HOST_VOICE_ID` | `dfeOmy6Uay63tNhyO99j` (Annie's voice) |
| `ELEVENLABS_COHOST_VOICE_ID` | `50y2RdLRjpTShM4ZFm5D` (Hyzer's voice) |

---

## ✅ Testing the Workflow

### Manual Test (Before Waiting for Monthly Trigger):

1. Push the workflow file to GitHub:
   ```bash
   git add .github/workflows/monthly-podcast.yml
   git commit -m "Add monthly podcast automation via GitHub Actions"
   git push
   ```

2. Go to GitHub repo → **Actions** tab

3. Click on **"Generate Monthly Podcast"** workflow

4. Click **"Run workflow"** → **"Run workflow"** button

5. Watch the logs in real-time to ensure it works

---

## 🎯 What Happens Every Month:

1. GitHub triggers the workflow on the 1st at midnight UTC
2. Sets up Ubuntu VM with Node.js and FFmpeg
3. Installs podcast dependencies
4. Runs `npm run generate` with all secrets injected
5. Script generates Episode N covering previous month's data
6. Uploads to Supabase Storage
7. Creates database records
8. Workflow completes (takes ~5-10 minutes)

---

## 🔍 Monitoring

- **View past runs:** GitHub repo → Actions tab → "Generate Monthly Podcast"
- **Get notifications:** GitHub will email you if a workflow fails
- **Logs:** Click on any workflow run to see detailed logs

---

## 🛑 Disable Automation

To stop monthly generation:

1. Go to `.github/workflows/monthly-podcast.yml`
2. Delete the file or comment out the `schedule:` section
3. Commit and push

---

## 💡 Cost Comparison

| Method | Cost | Notes |
|--------|------|-------|
| **GitHub Actions** | **$0/month** | Free for public repos, 2000 min/month for private |
| Vercel Crons | $20/month | Requires Pro plan |
| Manual | $0/month | Remember to run every month 😅 |

**Winner:** GitHub Actions! ✅
