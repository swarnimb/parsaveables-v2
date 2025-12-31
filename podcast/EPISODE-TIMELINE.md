# Podcast Episode Timeline & Plan

## 📅 Episode Schedule

### **Episode 1** ✅ (Already Published)
- **Title:** "The Ruckus Until Now"
- **Period:** 2024-01-01 to 2025-11-29
- **Type:** Season recap
- **Status:** Published and live

---

### **Episode 2** ⚠️ (Test Episode - Recommend Deleting)
- **Period:** 2025-11-30 to 2025-12-29
- **Data:** No real data (test run)
- **Status:** In database but should be deleted

**To delete:**
```bash
cd podcast
node -e "import('dotenv').then(dotenv => { dotenv.default.config({ path: '../.env.local' }); return import('@supabase/supabase-js'); }).then(({ createClient }) => { const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); return supabase.from('podcast_episodes').delete().eq('episode_number', 2); }).then(({ error }) => console.log(error ? 'Error: ' + error.message : '✅ Episode 2 deleted'));"
```

Also delete from Supabase Storage:
- Go to Storage → podcast-episodes
- Delete `ParSaveables-EP02.mp3`

---

### **Episode 2** 🎯 (Manual - Create in Early January 2026)
- **Title:** "2025 Season Wrap + 2026 Preview"
- **Period:** Custom (covers 2025 season + recent rounds)
- **Type:** Special episode
- **Content:**
  - 2025 season highlights
  - Recent round recaps
  - New players joining 2026
  - New PULP economy preview
  - Excitement for new season

**When to create:** Early January 2026 (before Feb 1st)

**How to create:**
1. Fill in `podcast/talking-points.json` with episode_2 content:
   - Season highlights
   - New players
   - 2026 changes
   - Funny moments from 2025

2. Generate:
   ```bash
   cd podcast
   npm run generate
   ```

3. The script will:
   - Pull stats from last 2 rounds + 2025 season data
   - Incorporate your talking points about new players and 2026
   - Create Annie & Hyzer dialogue
   - Add intro/outro music
   - Upload to Supabase

---

### **Episode 3** 🤖 (Auto - February 1, 2026)
- **Triggered by:** GitHub Actions cron
- **Period:** 2026-01-01 to 2026-01-31
- **Type:** Monthly recap
- **Content:** January 2026 rounds/bets/challenges

**First automated episode!**

---

### **Episode 4+** 🤖 (Auto - Monthly)
- **March 1, 2026:** Episode 4 (Feb recap)
- **April 1, 2026:** Episode 5 (Mar recap)
- **May 1, 2026:** Episode 6 (Apr recap)
- ... continues monthly

---

## 🎬 Your Action Plan

### **Now (December 2025):**
1. ✅ Cron updated to start February 1st
2. ✅ talking-points.json template ready for Episode 2

### **Early January 2026:**
1. **Delete Episode 2 (test)** - Use command above
2. **Fill in talking-points.json** with:
   - Your 2025 season highlights
   - New players joining 2026
   - PULP economy changes
   - Funny moments
   - Any other anecdotes

3. **Generate Episode 2:**
   ```bash
   cd podcast
   npm run generate
   ```

4. **Verify on /podcast page** - Should show Episode 2 with your custom content

### **February 1, 2026:**
- GitHub Actions automatically generates Episode 3
- Check GitHub repo → Actions tab to see the run
- Episode 3 appears on /podcast page

### **Every Month After:**
- Automatic episodes on the 1st
- You can optionally add talking points for any episode by updating the JSON

---

## 📝 talking-points.json Template

For your special Episode 2, replace the placeholders in `episode_2` with:

```json
{
  "episode_2": {
    "highlights": [
      "Mike won the 2025 championship with 450 PULPs",
      "Sarah hit 3 aces in the final round at Portlandia",
      "Record-breaking 12 eagles in November"
    ],
    "rivalries": [
      "Mike vs Jake rivalry continued all season",
      "Sarah and Emma had 5 head-to-head challenges"
    ],
    "funny_moments": [
      "Jake threw his disc into the lake... twice in one round",
      "The infamous 'tree magnet' incident at Bryant Lake"
    ],
    "pulp_notes": [
      "Total of 5,000 PULPs wagered in 2025",
      "New PULP starting balance is now 40 instead of 100",
      "Advantages can now be purchased - Mulligans, Anti-Mulligans, etc."
    ],
    "general_notes": [
      "Welcome to Chris, Emma, and Alex joining for 2026!",
      "New season starts with revamped PULP economy",
      "Betting now requires minimum 20 PULPs"
    ]
  }
}
```

---

## 🔍 What the Script Will Use

For Episode 2 (special recap):

**FROM DATABASE:**
- Round stats from recent rounds (Dec 2025)
- Bet/challenge data from December
- Current PULP leaderboard
- Player stats

**FROM TALKING POINTS:**
- 2025 season highlights (you provide)
- New players joining (you provide)
- PULP economy changes (you provide)
- Funny moments from the year (you provide)

**Script combines both** to create a natural dialogue that:
- Recaps 2025 highlights
- Discusses recent rounds
- Gets excited about 2026
- Welcomes new players
- Explains new PULP economy

---

## ✅ Summary

**Timeline:**
1. **Now:** Episode 1 published ✅
2. **Early Jan 2026:** You create Episode 2 (special) 🎯
3. **Feb 1, 2026:** Auto Episode 3 🤖
4. **Monthly after:** Auto episodes forever 🤖

**Your work:**
- Delete test Episode 2
- Fill talking-points.json
- Run `npm run generate` in early January
- That's it! Rest is automatic.

Ready to roll! 🎉
