# ParSaveables v2 - Project Dashboard

**Last Updated:** 2026-01-19 (End of Session)
**Current Phase:** Phase 5 (Testing & Bug Fixes) - IN PROGRESS
**Status:** Foundation | Auth & Layout | Leaderboard | Rounds | PULP Design | Backend Services | Frontend UI | Season Awareness | UX Enhancements | Testing Framework | Guest Login | Admin Control Center | Tutorial System | Feature Flags | Podcast System COMPLETE

---

## Quick Status Overview

| Area | Status |
|------|--------|
| Documentation | Complete & Updated (Jan 19, 2026) |
| Project Setup | Complete (Vite, Tailwind v3, Shadcn, Radix UI) |
| Folder Structure | Complete (core/, gamification/ organized) |
| Supabase Client | Configured & Connected |
| Database Migration | Complete (14 migrations: 001-014) |
| Routing | Complete (12 routes + 404) |
| Layout Components | Complete (Header 3-icon, BottomNav, Dropdowns, NotificationDropdown) |
| UI Components | Complete (12 Shadcn components including checkbox) |
| Authentication | Complete (Login, Signup, Protected Routes) |
| Leaderboard | Complete (Event selection, Podium, Expandable Rows, Season Default) |
| Rounds | Complete (Accordion, Scorecard images, Full-screen) |
| Dashboard | Complete (Event dropdown, All Time stats, Expanded metrics) |
| Notifications | Complete (Dropdown with recent activity, View All link) |
| Betting | Complete (Next round logic, Active bet display) |
| Challenges | Complete (Next round logic, Active challenge display) |
| Season Awareness | Complete (Auto-defaults to current season across all pages) |
| PULP Economy Design | Complete (Architecture, Migration 006, Documentation) |
| Backend Services (PULP) | Implemented but Settlement Broken (5 services) |
| PULP API Endpoints | Complete (7 endpoints in api/pulp/) |
| Frontend Pages (PULP) | Complete (Betting, Dashboard, Activity, About, Admin) |
| PULP Settlement | BROKEN - Bets/challenges not resolving after scorecard processing |
| Tutorial System | Complete (Onboarding 7 screens + Betting 5 screens, spotlight effect) |
| Feature Flag System | Complete (PULP economy toggle, Coming Soon screen) |
| Testing Framework | Complete (Vitest + React Testing Library + Happy DOM) |
| PULP Transaction Tests | Complete (Advantages, Betting, Challenges - 16 tests) |
| Guest Login System | Complete (Read-only access, disabled features, tooltips) |
| Admin Control Center | COMPLETE (4 tabs: Events, Players, Courses, Rules) |
| Betting Timer & Lock System | Complete (Countdown timer, auto-reset, cancel/extend) |
| Toast Notifications | Complete (Shadcn Toast, success/error feedback across all features) |
| Podcast Episode 0 | Complete (Database script, ElevenLabs generation, Supabase upload) |
| Podcast Auto-Generation | Complete (GitHub Actions, intro/outro music, enthusiastic tone) |
| Git & Deployment | Complete (Vercel deployment, environment variables) |

---

## This Session Summary (2026-01-19 - Latest)

### Player Alias Matching Bug Fix

**Problem:**
Two players with similar names were being confused by the scorecard processing:
- **BigBirdie** - a registered player name
- **🐦🐦🧺** - another player whose emoji name decodes to "bird bird basket"

The system was incorrectly matching the emoji player to BigBirdie (or vice versa), causing one player to be counted twice.

**Root Cause:**
The `findPlayerByAlias` function in `src/services/core/playerService.js` had **partial matching logic** that checked if one name *contained* the other:
```javascript
// OLD CODE (problematic):
if (normalizedAlias.includes(normalizedInput) ||
    normalizedInput.includes(normalizedAlias)) {
  return player;
}
```

This caused false positives because both "bigbirdie" and "bird bird basket" contain the word "bird".

**Solution:**
Changed alias matching to **EXACT matches only**:
- Case-insensitive exact match on original input
- Exact match on normalized input (for emoji decoding)

**Files Modified:**
- `src/services/core/playerService.js` - Removed partial matching, now exact only

**Commit:** 5a3b430

---

## Previous Session Summary (2026-01-04)

### Podcast System Refinements

**Work Completed:**

1. **Intro/Outro Music Processing Fix**
   - **Problem**: Previous implementation used wrong fade directions and no duration trimming
     - Intro: Faded IN (wrong), used full file length
     - Outro: Faded OUT (wrong), used full file length
   - **Solution**: Three-step FFmpeg workflow
     - Step 1: Process intro → Trim to 5s, fade OUT from 3-5s (2s duration)
     - Step 2: Process outro → Trim to 8s, fade IN from 0-4s (4s duration)
     - Step 3: Concatenate intro + dialogue + outro
   - **File**: `podcast/generate-dialogue-podcast.js` lines 657-753
   - **Commit**: c8ac481

2. **Podcast Script Prompt Update**
   - **Problem**: Prompt described "dry, deadpan, sarcastic" tone but Episode 0 was enthusiastic sports radio
   - **Solution**: Rewrote entire prompt to match Episode 0's actual style
     - **Tone**: Changed from deadpan to "enthusiastic sports radio commentary"
     - **Opening**: From "Another month, another round of questionable decisions" to dual welcome + "This is PAR SAVEABLES!"
     - **Structure**: Added 5-act format (Cold Open, Round Recaps, Bets/Challenges, Talking Points, Sign Off)
     - **Closing**: Added required catchphrase "Keep those discs flying and your beers accounted for—"
     - **Character Voices**: Hyzer (stats enthusiast), Annie (story curator)
     - **Running Gags**: "The format strikes!", "It's par saveable", "Blessed/Cursed", "Degenerates", "Treesus"
     - **Tag-Team Storytelling**: Dashed interruptions for excitement building
   - **File**: `podcast/generate-dialogue-podcast.js` lines 403-647
   - **Commit**: aea36bb

3. **Documentation Updates**
   - **Updated Files**:
     - `podcast/README.md` - Comprehensive rewrite with Script Style Guide and Audio Processing sections
     - `docs/SESSION-HANDOFF.md` - Added this session entry
     - (More documentation updates to follow)

**Technical Details:**

- **FFmpeg Processing**:
  - Intro: `ffmpeg(introPath).duration(5).audioFilters(['afade=t=out:st=3:d=2'])`
  - Outro: `ffmpeg(outroPath).duration(8).audioFilters(['afade=t=in:st=0:d=4'])`
  - Concatenation: Uses FFmpeg concat demuxer with MP3 192kbps output

- **Script Generation**:
  - Target: 600-800 words (3-4 minutes when spoken)
  - Format: Two-host dialogue (Annie: ELEVENLABS_HOST_VOICE_ID, Hyzer: ELEVENLABS_COHOST_VOICE_ID)
  - No bracket fillers (no [laughs], [sighs], etc.)
  - Enthusiastic tone with exclamation points for genuine excitement

**What Stayed the Same:**

- All data sources (stats, rounds, bets, challenges, PULP transactions)
- Talking points functionality for anecdotal color
- "Don't make stuff up" rules
- GitHub Actions monthly automation (Feb 1, 2026 first run)
- ElevenLabs voice IDs (already configured correctly)
- Database schema

**Files Modified:**

- `podcast/generate-dialogue-podcast.js` (intro/outro function + script prompt)
- `podcast/README.md` (comprehensive documentation update)
- `docs/SESSION-HANDOFF.md` (this session entry)

---

## Previous Session Summary (2026-01-03)

### Tutorial System & Feature Flag Implementation

**Work Completed:**

1. **Tutorial System (Onboarding + Betting)**
   - **Onboarding Tutorial** (7 screens, mandatory on first login):
     1. Welcome to ParSaveables
     2. How it works (UDisc → AI → Leaderboard flow with animation)
     3. Leaderboard explanation (with spotlight highlight)
     4. Rounds explanation (with spotlight highlight)
     5. Podcast explanation (with spotlight highlight)
     6. Process Scorecard button (centered, no spotlight to avoid cutoff)
     7. Betting tab tease ("Don't tap it yet 😏" with spotlight)
   - **Betting Tutorial** (5 screens, triggered on first /betting access):
     1. Welcome to PULP (ParSaveables Ultimate Loyalty Program)
     2. Earn PULPs (play more, streaks)
     3. Grow Your PULPs (betting, challenges)
     4. Use Your PULPs (2x2 advantages grid: Mulligan, Bag Trump, Anti-Mulligan, Shotgun Buddy)
     5. Your Vote Kinda Matters (democracy vote with dual responses)
   - **Dual Response System**:
     - "Yes, I'm interested" → "Thank you for showing interest, a new betting economy is coming to you shortly"
     - "Nah, I'm good" → "Someone's a chicken 🐔"
   - **Re-show Logic**: Tutorial re-appears if user said "no" (betting_interest_confirmed !== true)
   - **Spotlight Effect**: Semi-transparent overlay with CSS box-shadow cutouts highlighting UI elements
   - **Navigation**: After "Got it" button, navigate to /leaderboard

2. **Database Schema Updates**
   - Added tutorial tracking columns to registered_players:
     - `onboarding_completed` (BOOLEAN, default FALSE)
     - `betting_interest_shown` (BOOLEAN, default FALSE)
     - `betting_interest_confirmed` (BOOLEAN, default FALSE)

3. **Feature Flag System**
   - Created `src/config/features.js` with pulpEconomy flag (default: false)
   - Centralized toggle for all PULP economy features
   - Easy enable/disable without code changes

4. **Coming Soon Screen**
   - Created `ComingSoon.jsx` component with rocket icon and animated ping
   - Shows to users who confirmed interest when visiting /betting
   - Prevents access to actual betting page until feature enabled
   - Logic: Show Coming Soon when `!features.pulpEconomy` OR `player.betting_interest_confirmed === true`

5. **PULP Activity Filtering**
   - **NotificationBell**: Filters out PULP-related event types when `features.pulpEconomy === false`
   - **Activity Page**: Skips fetching PULP data (transactions, bets, challenges) when feature disabled
   - **Community Feed**: Only shows rounds, hides challenges and achievements when disabled

6. **Bug Fixes**
   - Fixed betting tutorial flicker (removed navigate from effect, handled in onClose callback)
   - Fixed Process Scorecard screen cutoff (removed spotlight, kept centered)
   - Reset user email associations for testing (SQL provided)

7. **Podcast Episode 0 Generation**
   - Created custom script to generate podcast from database script (not Claude API)
   - Script source: `podcast_scripts` table in database (manually written, 64 dialogue lines)
   - ElevenLabs voices: Annie (hA4zGnmTwX2NQiTRMt7o), Hyzer (50y2RdLRjpTShM4ZFm5D)
   - Generated 64 audio segments using ElevenLabs API (6.8 MB dialogue)
   - Combined intro (2.85 MB) + dialogue (6.85 MB) + outro (1.10 MB) = 10.8 MB final episode
   - Uploaded to Supabase Storage: `ParSaveables-EP01.mp3`
   - Database updated: `podcast_episodes` table (audio_url, is_published, published_at)
   - Public URL: https://bcovevbtcdsgzbrieiin.supabase.co/storage/v1/object/public/podcast-episodes/ParSaveables-EP01.mp3
   - Note: Used simple MP3 concatenation (no fade effects) due to FFmpeg installation issue

**Files Created:**
- src/components/tutorial/TutorialSpotlight.jsx (NEW - spotlight effect)
- src/components/tutorial/tutorialData.js (NEW - screen content for both tutorials)
- src/config/features.js (NEW - feature flag config)
- src/components/betting/ComingSoon.jsx (NEW - coming soon screen)
- podcast/generate-from-existing-script.js (NEW - generate podcast from database script)
- podcast/concat-audio-simple.js (NEW - simple MP3 concatenation without FFmpeg)
- podcast/upload-episode.js (NEW - upload episode to Supabase and update database)
- podcast/episode 1 script.md (NEW - manually written 64-line dialogue script)

**Files Modified:**
- src/components/tutorial/Tutorial.jsx (OnboardingTutorial with spotlight)
- src/components/tutorial/BettingTutorial.jsx (5 screens, advantages grid, dual responses)
- src/components/layout/AppLayout.jsx (tutorial integration, betting navigation intercept)
- src/components/layout/BottomNav.jsx (added data-tutorial-target attributes)
- src/components/layout/AdminDropdown.jsx (added data-tutorial-target to Process Scorecard)
- src/components/layout/NotificationBell.jsx (PULP event filtering)
- src/pages/Leaderboard.jsx (empty state message update)
- src/pages/Activity.jsx (PULP data filtering)
- src/pages/Betting.jsx (conditional ComingSoon rendering)

**Database Migrations:**
- Migration 014: Add tutorial tracking columns (onboarding_completed, betting_interest_shown, betting_interest_confirmed)

**Tutorial Flow:**
1. New user signs up → Onboarding tutorial shows immediately (7 screens)
2. User taps Betting tab → Betting tutorial shows (5 screens)
3. User selects response → Coming Soon screen shows (if interested)
4. Every subsequent visit to /betting → Coming Soon screen (until feature enabled)

---

## Previous Session Summary (2025-12-31)

### Admin Control Center Completion & Bug Fixes

**Work Completed:**

1. **Rules Tab Improvements**
   - Added grouped dropdown for points systems (Seasons / Tournaments / Other categories)
   - Default selection to "Season 2025" on load
   - Reduced "Add Rank" button font size to text-xs
   - Standardized all button sizes across tabs (text-sm)
   - Categorization based on which events use each points system

2. **Events Tab - Player Management**
   - Added player selection UI with checkboxes when creating/editing events
   - Display player count on event cards with Users icon
   - Auto-populate year column from start_date
   - Player selection persists when editing events
   - Bulk insert/delete for event_players on save

3. **Database Schema Updates**
   - Migration 009: Created `event_players` junction table
     - Composite primary key (event_id, player_id)
     - Foreign keys with CASCADE delete
     - Indexes for faster lookups
   - Migration 010: Added RLS policies for event_players (INSERT/UPDATE/DELETE)
   - Migration 011: Clear PULP activity data script (reset balances to 100)

4. **Bug Fixes**
   - Removed references to non-existent columns (status, email, user_id in players)
   - Fixed player fetching to show all players (no status filter)
   - Fixed event_players loading issue with Promise.all()
   - EventsTab now uses EventsTab_new.jsx with full player management

5. **Documentation Updates**
   - Updated ARCHITECTURE.md with:
     - New event_players table schema
     - Migrations 009-011 details
     - Control Center now 4 tabs (removed old Tournaments tab reference)
     - Updated frontend structure with EventsTab_new.jsx
     - Starting PULP balance updated to 100 (from 40)
   - Updated API-CONTRACT.md with:
     - Supabase Direct Operations section
     - Event Players Table operations
     - Points Systems Table operations
   - Updated SESSION-HANDOFF.md (this file)
   - Updated .claude/CLAUDE.md with accurate Control Center info

**Files Modified:**
- src/components/admin/RulesTab.jsx (grouped dropdown, default selection, button sizes)
- src/components/admin/EventsTab_new.jsx (player checkboxes, player count display)
- src/components/admin/EventsTab.jsx (legacy, still exists but not used)
- src/pages/admin/ControlCenter.jsx (uses EventsTab_new)

**Files Created:**
- supabase/migrations/009_create_event_players_table.sql
- supabase/migrations/010_add_event_players_write_policies.sql
- supabase/migrations/011_clear_pulp_activity_data.sql

**Control Center Final State (4 Tabs):**
1. **Events**: Create/edit/delete seasons & tournaments with player selection via checkboxes
2. **Players**: Add/edit players (name only), soft delete (set inactive)
3. **Courses**: Manage courses with tiers and multipliers
4. **Rules**: Configure points systems with grouped dropdown, tie-breakers, performance bonuses

---

## Previous Session Summary (2025-12-30)

### PULP Economy UI Improvements & Bug Fixes - PARTIAL

**Work Completed:**
- Betting UI "Active Bet" Display - shows bet details after placing
- Challenges UI "Active Challenge" Display - 3 tabs (Issue, Pending, Active)
- API Validation Fixes - allow null roundId for next-round betting
- Database Schema Fix - Migration 005 dropped NOT NULL on challenges.round_id
- Gamification Service Counter Fix - replaced supabase.raw() with fetch-increment-update

**Critical Issue - UNRESOLVED:**
- PULP Settlement Still Not Working
- Bets and challenges are NOT resolving after scorecard processing
- Root cause appears to be in gamification service integration

---

### Toast Notifications System - COMPLETED

**Work Completed:**
- Shadcn Toast Component Installation
- Betting Page Toast Notifications (all 3 sections)
- Auth Page Toast Notifications
- Admin Page Toast Notifications (BettingControls)

---

### Betting Timer & Lock Management System - COMPLETED

**Work Completed:**
- Animated countdown timer on Betting page
- Enhanced Betting Controls Admin page
- Auto-Reset After Scorecard Processing
- Database Service Enhancement (updateEvent function)

---

### Guest Login & Admin Control Center - COMPLETED

**Work Completed:**
- Guest Login System with read-only access
- Admin Control Center with password protection
- 5 Management Tabs (now 4 - Events, Players, Courses, Rules)

---

## Next Session: Immediate Tasks (Priority Order)

### Priority 1: Fix PULP Economy Settlement (CRITICAL)
- **BROKEN:** Bets and challenges are NOT resolving after scorecard processing
- Debug gamificationService integration with processScorecard workflow
- Verify bet resolution logic (resolveBets function)
- Verify challenge resolution logic (resolveChallenge function)
- Test end-to-end: Place bet → Process scorecard → Verify PULP settlement
- Test end-to-end: Issue/accept challenge → Process scorecard → Verify winner gets PULPs
- Check transaction logging (pulp_transactions table)

### Priority 2: PULP Economy UI Stages
Implement different UI states for betting lifecycle:
- **Pre-lock Stage:** Betting open, show available balance, allow placing bets/challenges
- **Post-lock Stage:** Betting locked, can't modify, show locked state with clear messaging
- **Post-resolve Stage:** Show results (won/lost), display payouts, show updated balance

### Priority 3: End-to-End Testing
- Create test accounts for all players
- Run multiple full scenarios (bets, challenges, advantages)
- Verify all PULP earning mechanisms work
- After testing: Reset for production use

### Priority 4: Podcast Feature
- ✅ Episode 0 content finalized and generated (uploaded to Supabase)
- Build Podcast page UI (audio player, episode description)
- Test /api/generatePodcast endpoint for future episodes

### Priority 5: Polish & Mobile Testing
- Framer Motion animations polish
- Mobile testing & responsive refinements
- Design system pass (colors, branding)

---

## Progress Tracking

**Total Phases:** 7
**Completed:** 4.8 phases (95%)
**Current Phase:** Phase 5 - Testing & Polish

**Phase 1:** Foundation - COMPLETE
**Phase 2:** Authentication & Layout - COMPLETE
**Phase 3:** Leaderboard & Rounds - COMPLETE
**Phase 4A:** PULP Economy Design - COMPLETE
**Phase 4B:** PULP Economy Implementation - COMPLETE
**Phase 4C:** UX Enhancements - COMPLETE
**Phase 5:** Testing & Polish - IN PROGRESS
- Testing framework complete
- Admin Control Center COMPLETE
- Tutorial System COMPLETE
- Podcast Episode 0 COMPLETE
- PULP settlement broken (critical)
- Podcast page UI pending

---

## Database Migrations Applied

| Migration | Description |
|-----------|-------------|
| 001 | PULP economy core tables |
| 002 | Clear user IDs for claiming |
| 003 | Add course aliases, Fix RLS for signup |
| 004 | Fix signup RLS |
| 005 | Add scorecard image URL, Allow null round_id in challenges |
| 006 | PULP economy finalized |
| 007 | Podcast system, Points systems structure update |
| 008 | Standardize events columns |
| 009 | Create event_players junction table |
| 010 | Add event_players write policies (INSERT/UPDATE/DELETE) |
| 011 | Clear PULP activity data (reset balances to 100) |
| 012 | Reserved (not yet used) |
| 013 | Reserved (not yet used) |
| 014 | Add tutorial tracking columns (onboarding_completed, betting_interest_shown, betting_interest_confirmed) |

---

## Key Reference Points

### Control Center Structure (4 Tabs)
```
src/pages/admin/ControlCenter.jsx
├── EventsTab_new.jsx    # Events CRUD with player selection
├── PlayersTab.jsx       # Players CRUD
├── CoursesTab.jsx       # Courses CRUD
└── RulesTab.jsx         # Points system configuration
```

### Folder Structure
```
src/
├── pages/          # 9 pages + 3 admin pages
├── config/         # features.js (feature flags)
├── components/
│   ├── ui/         # 12 Shadcn components
│   ├── layout/     # Header, BottomNav, Dropdowns, NotificationBell
│   ├── admin/      # Control Center tabs
│   ├── leaderboard/# PodiumDisplay, LeaderboardTable
│   ├── betting/    # PredictionsSection, ChallengesSection, AdvantagesSection, ComingSoon
│   ├── rounds/     # RoundCard
│   └── tutorial/   # TutorialSpotlight, Tutorial, BettingTutorial, tutorialData
├── hooks/          # useAuth, use-toast
├── services/       # core/, gamification/, api.js
└── utils/          # seasonUtils, playerUtils
```

### Tech Stack Installed
- React 18.3.1
- Vite 7.3.0
- Tailwind CSS 3.4.17
- Shadcn/ui + Radix UI
- Supabase JS 2.47.13
- Zustand 5.0.2
- Framer Motion 12.0.0
- React Router DOM 7.1.3
- Lucide React 0.468.0
- Vitest + React Testing Library

---

## Known Issues & Notes

### CRITICAL BLOCKER
**PULP Settlement Broken**: Bets and challenges are NOT being resolved after scorecard processing. The gamification service may not be fully integrated with the processScorecard workflow, or the resolution logic has bugs.

### Development Notes
- Browser caching can cause stale data - use Ctrl+Shift+R for hard refresh
- Control Center password: VITE_CONTROL_CENTER_PASSWORD env variable
- Guest mode uses sessionStorage (not Supabase)
- Starting PULP balance: 100 PULPs
- Dev server: http://localhost:5175

### Environment Variables Required
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CONTROL_CENTER_PASSWORD
ANTHROPIC_API_KEY
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REFRESH_TOKEN
ELEVENLABS_API_KEY
```

---

**Status:** Admin Control Center COMPLETE. Critical issue remains with PULP settlement. Ready for debugging and end-to-end testing.

**Dev Server:** http://localhost:5175
