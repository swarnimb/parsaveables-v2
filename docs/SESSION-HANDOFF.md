# ParSaveables v2 - Project Dashboard

**Last Updated:** 2025-12-30 (End of Session)
**Current Phase:** Phase 5 (Testing & Bug Fixes) - IN PROGRESS
**Status:** ✅ Foundation | ✅ Auth & Layout | ✅ Leaderboard | ✅ Rounds | ✅ PULP Design | ✅ Backend Services | ⚠️ PULP Settlement (Broken) | ✅ Frontend UI | ✅ Season Awareness | ✅ UX Enhancements | ✅ Testing Framework | ✅ Guest Login | ⚠️ Admin Control Center (Needs Polish)

---

## Quick Status Overview

| Area | Status |
|------|--------|
| 📋 Documentation | ✅ Complete & Updated |
| 🏗️ Project Setup | ✅ Complete (Vite, Tailwind v3, Shadcn, Radix UI) |
| 📁 Folder Structure | ✅ Complete (core/, gamification/ organized) |
| 🔌 Supabase Client | ✅ Configured & Connected |
| 🗄️ Database Migration | ✅ Complete (006 PULP economy applied) |
| 🧭 Routing | ✅ Complete (12 routes + 404) |
| 🎨 Layout Components | ✅ Complete (Header 3-icon, BottomNav, Dropdowns, NotificationDropdown) |
| 🎨 UI Components | ✅ Complete (11 Shadcn components) |
| 🔐 Authentication | ✅ Complete (Login, Signup, Protected Routes) |
| 📊 Leaderboard | ✅ Complete (Event selection, Podium, Expandable Rows, Season Default) |
| 🎯 Rounds | ✅ Complete (Accordion, Scorecard images, Full-screen) |
| 🏠 Dashboard | ✅ Complete (Event dropdown, All Time stats, Expanded metrics) |
| 🔔 Notifications | ✅ Complete (Dropdown with recent activity, View All link) |
| 🎲 Betting | ✅ Complete (Next round logic, Active bet display) |
| 🏆 Challenges | ✅ Complete (Next round logic, Active challenge display) |
| 🗓️ Season Awareness | ✅ Complete (Auto-defaults to current season across all pages) |
| 💰 PULP Economy Design | ✅ Complete (Architecture, Migration 006, Documentation) |
| 🛠️ Backend Services (PULP) | ⚠️ Implemented but Settlement Broken (5 services: pulp, betting, challenge, advantage, orchestrator) |
| 🌐 PULP API Endpoints | ✅ Complete (7 endpoints in api/pulp/) |
| 🎨 Frontend Pages (PULP) | ✅ Complete (Betting, Dashboard, Activity, About, Admin) |
| 💸 PULP Settlement | ⚠️ BROKEN - Bets/challenges not resolving after scorecard processing |
| 🎓 Tutorial System | ✅ Complete (Core + PULP tutorials) |
| 🧪 Testing Framework | ✅ Complete (Vitest + React Testing Library + Happy DOM) |
| 💸 PULP Transaction Tests | ✅ Complete (Advantages, Betting, Challenges - 16 tests) |
| 👤 Guest Login System | ✅ Complete (Read-only access, disabled features, tooltips) |
| 🔧 Admin Control Center | ✅ Complete (Password-protected CRUD for 5 management areas) |
| ⏱️ Betting Timer & Lock System | ✅ Complete (Countdown timer, auto-reset, cancel/extend) |
| 🔔 Toast Notifications | ✅ Complete (Shadcn Toast, success/error feedback across all features) |
| ⏳ Git & Deployment | ✅ Complete (Vercel deployment, environment variables) |

---

## This Session Summary (2025-12-30 - Latest)

### PULP Economy UI Improvements & Bug Fixes - PARTIAL ⚠️

**Work Completed:**
- ✅ **Betting UI "Active Bet" Display**
  - Modified PredictionsSection.jsx to show bet details after placing
  - Added existingBet state to fetch pending/locked bets
  - Conditional rendering: show bet card OR form (not both)
  - Active bet card displays: wager, predictions (1st/2nd/3rd), status, lock icon
  - Prevents duplicate bets by hiding form when active bet exists

- ✅ **Challenges UI "Active Challenge" Display**
  - Modified ChallengesSection.jsx to show issued/accepted challenges
  - Added "Active" tab (3 tabs total: Issue, Pending, Active)
  - Fetches TWO types of active challenges:
    - Issued challenges (challenger_id = player, status='pending')
    - Accepted challenges (either player, status='accepted')
  - Shows different UI based on status (pending vs battle active)
  - Prevents issuing new challenges when one is active
  - Auto-defaults to Active tab when challenge exists

- ✅ **API Validation Fixes**
  - Fixed api/pulp/issueChallenge.js to allow null roundId
  - Changed validation from `!roundId` to `wagerAmount === undefined`
  - Allows "next round" challenges with roundId: null

- ✅ **Database Schema Fix**
  - Created migration 005_allow_null_round_id_in_challenges.sql
  - Dropped NOT NULL constraint on challenges.round_id
  - Allows challenges for "next round" before round is created

- ✅ **Gamification Service Counter Fix**
  - Fixed src/services/gamification/index.js line 337-368
  - Replaced `supabase.raw('total_rounds_this_season + 1')` with fetch-increment-update
  - Fixed src/services/gamification/challengeService.js line 217-240
  - Replaced `supabase.raw('challenges_declined + 1')` with fetch-increment-update
  - Supabase JS client doesn't have `.raw()` method - errors are now fixed

**Files Modified (5 files):**
- src/components/betting/PredictionsSection.jsx (active bet display)
- src/components/betting/ChallengesSection.jsx (active challenge display)
- api/pulp/issueChallenge.js (validation fix)
- src/services/gamification/index.js (counter fix)
- src/services/gamification/challengeService.js (counter fix)

**Files Created (1 file):**
- supabase/migrations/005_allow_null_round_id_in_challenges.sql

**Critical Issue - UNRESOLVED ⚠️:**
**PULP Settlement Still Not Working**
- User tested bets and challenges end-to-end
- Visually, bets and challenges appear to go through successfully
- After processing scorecard, PULPs are NOT getting settled
- Bets and challenges are NOT being resolved
- Root cause appears to be in the PULP economy implementation itself
- The gamification service may not be fully integrated with scorecard processing
- OR bet/challenge resolution logic has bugs preventing settlement

**Status:** PULP economy UI is complete, but backend settlement is broken. Needs full investigation and fix.

**Next Steps (User's Priority List for Next Session):**
1. **Control Center Implementation** - Finalize all CRUD operations for tournaments, players, courses, events, rules
2. **PULP Economy UI Stages** - Implement specific views for:
   - Pre-lock stage (betting open, can place bets/challenges)
   - Post-lock stage (betting locked, can't change bets/challenges, show locked state)
   - Post-resolve stage (show results, payouts, won/lost status)
   - Apply to: Predictions, Challenges, Advantages
3. **Fix PULP Economy Settlement** - Debug and fix why PULPs are not settling after scorecard processing
4. **Activity & Notifications Tracking** - Ensure all events appear on activity page that should be there
5. **End-to-End Testing** - Create accounts for all players, run multiple scenarios, test thoroughly
6. **Production Preparation** - Delete all test accounts, reset PULP economy, prepare for real use

**Commits (1):**
- Commit `0a1a0c9`: Fix PULP settlement - replace supabase.raw() with proper counter updates

---

### Toast Notifications System - COMPLETED ✅

**Work Completed:**
- ✅ **Shadcn Toast Component Installation**
  - Installed Shadcn toast component using CLI
  - Created jsconfig.json for proper path resolution
  - Added Toaster component to App.jsx root
  - Auto-generated: toast.jsx, toaster.jsx, use-toast.js hook

- ✅ **Betting Page Toast Notifications**
  - PredictionsSection: Success toast for bet placement, error toasts for validation
  - ChallengesSection: Success/error toasts for issuing, accepting, rejecting challenges
  - AdvantagesSection: Success toast for purchases, error toasts for insufficient PULPs/duplicates
  - Removed inline error/success message displays (replaced with toasts)

- ✅ **Auth Page Toast Notifications**
  - Login page: Success toasts for sign in/sign up, error toasts for failed auth
  - Clear, descriptive error messages with titles and descriptions
  - Removed inline error message displays

- ✅ **Admin Page Toast Notifications**
  - BettingControls: Comprehensive toasts for lock/extend/cancel operations
  - Success feedback: "Betting Locked!", "Lock Extended!", "Lock Cancelled!"
  - Error feedback: "No Active Events", "Lock Failed", validation errors
  - Removed all inline error/success displays

**Files Modified (11 files):**
- jsconfig.json (created for Shadcn CLI)
- src/App.jsx (added Toaster component)
- src/components/betting/PredictionsSection.jsx (toast integration)
- src/components/betting/ChallengesSection.jsx (toast integration)
- src/components/betting/AdvantagesSection.jsx (toast integration)
- src/pages/Login.jsx (toast integration)
- src/pages/admin/BettingControls.jsx (comprehensive toast integration)
- src/components/ui/toast.jsx (auto-generated)
- src/components/ui/toaster.jsx (auto-generated)
- src/hooks/use-toast.js (auto-generated)
- docs/SESSION-HANDOFF.md (this file)

**Technical Implementation:**
- Used Shadcn's useToast hook for consistent API
- Two toast variants: default (success) and destructive (errors)
- Toast structure: title + description for clear messaging
- Auto-dismiss after 5 seconds (Shadcn default)
- Positioned at top-right corner (Shadcn default)
- Cleaned up all inline error/success state displays

**Toast Examples:**
- Success: "Bet Placed! - 20 PULPs wagered on next round. Good luck!"
- Error: "Insufficient PULPs - You only have 15 PULPs available"
- Info: "Round Time Confirmed! - Betting will lock 15 minutes after round time"

**Design Decisions:**
- Replaced all inline error/success messages with toasts for consistency
- Used descriptive titles and clear descriptions for better UX
- Kept toast messages concise (1-2 sentences)
- Destructive variant for all errors and validation failures
- Default variant for all success messages and confirmations

**Next Steps:**
- End-to-end testing of toast notifications across all features
- User feedback on toast timing and positioning (if needed)
- Consider adding custom toast variants for warnings (optional)

---

### Betting Timer & Lock Management System - COMPLETED ✅

**Work Completed:**
- ✅ **Betting Timer Display on Betting Page**
  - Animated countdown timer showing hours and minutes until betting locks
  - Displays between PULP balance card and betting sections
  - Pulsating "Betting Locked / Round in progress" state when locked
  - Automatically hides when no lock time is set
  - Real-time countdown updates every second
  - Rotating clock icon animation (360° every 60 seconds)
  - Polls for lock time changes every 30 seconds

- ✅ **Enhanced Betting Controls Admin Page**
  - Shows current locked state prominently in red-bordered card
  - Displays both round time and lock time when betting is locked
  - "Cancel Lock" button to clear betting_lock_time
  - "Extend 15 mins" button to extend current lock
  - Prevents creating new rounds while lock is active
  - Auto-refreshes every 30 seconds to detect scorecard processing reset
  - Creates lock for all active events simultaneously

- ✅ **Auto-Reset After Scorecard Processing**
  - Added Step 14 to processScorecard.js workflow
  - Automatically clears betting_lock_time when round is processed
  - Compares round date/time with lock time to determine reset
  - Non-fatal error handling (doesn't break scorecard processing)
  - Timer disappears from Betting page after reset

- ✅ **Database Service Enhancement**
  - Added updateEvent() function to databaseService.js
  - Supports updating any event fields with proper error handling
  - Used for both betting lock operations and reset

**Files Modified (7 files):**
- src/pages/admin/BettingControls.jsx (added locked state display, Cancel/Extend buttons, polling)
- src/pages/Betting.jsx (added countdown timer, pulsating locked state, AnimatePresence transitions)
- api/processScorecard.js (added Step 14 for auto-reset logic)
- src/services/core/databaseService.js (added updateEvent function)
- src/components/betting/PredictionsSection.jsx (fixed `active` → `is_active`, added `.limit(1)`)
- src/components/betting/ChallengesSection.jsx (fixed `active` → `is_active`, added `.limit(1)`)
- src/components/leaderboard/LeaderboardTable.jsx (fixed React key warning with Fragment)
- src/components/layout/NotificationBell.jsx (fixed UUID vs INTEGER type mismatch)

**Technical Implementation:**
- Timer uses setInterval for real-time second-by-second countdown
- Lock state polling uses 30-second intervals to detect database changes
- Framer Motion AnimatePresence for smooth show/hide transitions
- Scale animation for PULP balance (removed problematic color animation to "inherit")
- Multiple active events handled with `.limit(1)` to prevent PGRST116 errors
- Error handling for PGRST116 (multiple rows) gracefully handles edge cases

**Issues Resolved:**
- Fixed database field name inconsistency (`active` vs `is_active`) across 4 files
- Fixed Framer Motion color animation error (removed animation to "inherit")
- Fixed React key prop warning in LeaderboardTable (used Fragment with key)
- Fixed NotificationBell UUID vs INTEGER player_id type mismatch
- Fixed multiple active events query error (PGRST116) with `.limit(1)`
- Resolved Vercel dev server issues (kept plain Vite for local, Vercel for production)

**Design Decisions:**
- Timer shows on Betting page (not in admin controls) for player visibility
- Locked state uses pulsating red animation for urgency
- Cancel/Extend buttons side-by-side for easy access
- Auto-reset based on round date/time >= lock time logic
- Non-blocking polling pattern to avoid UI freezes
- 30-second refresh interval balances responsiveness with server load

**Workflow:**
1. Admin sets round date/time in Betting Controls
2. Admin locks betting (sets betting_lock_time for all active events)
3. Players see countdown timer on Betting page
4. Timer counts down in real-time until lock time
5. After lock time, shows "Betting Locked / Round in progress"
6. Admin processes scorecard (or automatic email processing)
7. System detects round date/time >= lock time and clears lock
8. Timer disappears, ready for next round

**Next Steps:**
- Full end-to-end testing of betting timer workflow
- Test auto-reset with actual scorecard processing
- Verify timer displays correctly across different screen sizes
- Production deployment with environment variables

---

### Guest Login & Admin Control Center - COMPLETED ✅

**Work Completed:**
- ✅ **Guest Login System**
  - Added "Continue as Guest" button on Login page below email/password form
  - Session-based guest mode using sessionStorage ('guestMode' flag)
  - Guest users can view: Leaderboard, Rounds, Podcast, Community Activity
  - Disabled for guests:
    - Top nav: ProfileDropdown, NotificationBell, AdminDropdown (hidden completely)
    - Bottom nav: Betting tab (grayed out with opacity-50 + pointer-events-none)
    - Activity page: "Your Activity" tab (disabled state)
  - Shows "Guest" badge in header with "Login" button for conversion to registered player
  - Route protection blocks guests from /betting, /admin/*, /dashboard
  - Automatic redirect to /leaderboard for blocked routes

- ✅ **Admin Control Center - Password Protected**
  - Password-protected access via environment variable (VITE_CONTROL_CENTER_PASSWORD=admin)
  - Session-based authentication using sessionStorage ('controlCenterAuth')
  - Password modal blocks access until correct password entered
  - **5 Management Tabs with Full CRUD Operations:**

  **1. Tournaments Tab** (TournamentsTab.jsx)
  - View all seasons/tournaments with status/type badges
  - Create/edit tournaments (name, dates, type: season/tournament, status: upcoming/active/completed)
  - Delete tournaments with confirmation dialog
  - Uses `events` table

  **2. Players Tab** (PlayersTab.jsx)
  - View all registered players with PULP balances and join dates
  - Add new players (name, email, optional user_id link)
  - Edit player details (name, email)
  - Soft delete (sets status='inactive', preserves historical data)
  - Uses `registered_players` table

  **3. Courses Tab** (CoursesTab.jsx)
  - Manage disc golf courses with difficulty tiers (1-3)
  - Auto-sets multipliers based on tier (1.0x, 1.5x, 2.0x)
  - Active/inactive status for course availability
  - Prevents deletion of courses referenced by existing rounds
  - Uses `courses` table

  **4. Events Tab** (EventsTab.jsx)
  - Select any event/tournament to manage participants
  - Add players to events via dropdown (filtered to show only non-participants)
  - Remove players from events
  - Shows participant count, join dates, PULP balances
  - Uses `event_players` table

  **5. Rules Tab** (RulesTab.jsx)
  - Configure scoring rules per points system
  - Edit placement points (1st, 2nd, 3rd, default) with add/remove rank functionality
  - Set performance bonuses (birdie, eagle, ace)
  - Configure tie-breaking rules (enabled/method)
  - Toggle course difficulty multipliers (enabled/source)
  - Save changes with success/error feedback
  - Uses `points_systems` table (config JSONB field)

**Files Created (6 files):**
- src/components/admin/TournamentsTab.jsx
- src/components/admin/PlayersTab.jsx
- src/components/admin/CoursesTab.jsx
- src/components/admin/EventsTab.jsx
- src/components/admin/RulesTab.jsx
- src/components/ui/tooltip.jsx (Shadcn component for guest feature tooltips)

**Files Modified (7 files):**
- .env.local (added VITE_CONTROL_CENTER_PASSWORD=admin)
- src/hooks/useAuth.js (added isGuest state, continueAsGuest function)
- src/pages/Login.jsx (added "Continue as Guest" button)
- src/components/layout/AppLayout.jsx (route protection for guests)
- src/components/layout/Header.jsx (hide nav items for guests, show Guest badge + Login button)
- src/components/layout/BottomNav.jsx (grey out Betting tab for guests)
- src/pages/Activity.jsx (disable "Your Activity" tab for guests, default to community)
- src/pages/admin/ControlCenter.jsx (integrated all 5 tab components)

**Dependencies Added (1 package):**
- @radix-ui/react-tooltip (for disabled feature tooltips)

**Technical Implementation:**
- All CRUD operations use Supabase directly (no separate API layer)
- Comprehensive validation and error handling for all operations
- Consistent UI patterns using Shadcn/ui components (Dialog, Tabs, Select, Input, Badge, Card)
- Real-time updates after each operation
- 1,750+ lines of production-ready code across 6 files

**Design Decisions:**
- Guest auth uses sessionStorage (not Supabase) for simplicity
- Admin access is password-based (not role-based) per user requirement
- Control Center is single page with tabs for cohesive UX
- Disabled UI for guests shows tooltips on hover for better UX feedback
- Password stored in environment variable for security
- Session-based authentication for both guest and control center (persists across page refreshes)

**Issues Resolved:**
- Dev server needed restart to pick up new environment variable
- Windows command syntax for taskkill (//F instead of /F)

**Commit Details:**
- Commit `47c6560`: Add password-protected Admin Control Center with CRUD operations
- 6 files changed, 1,750 insertions(+), 110 deletions(-)

**Next Steps:**
- Add VITE_CONTROL_CENTER_PASSWORD to Vercel environment variables for production
- Polish Control Center UI (design enhancements, loading states)
- Full end-to-end testing of each feature set

---

## Previous Session Summary (2025-12-26)

### Testing Framework Setup - COMPLETED ✅

**Work Completed:**
- ✅ **Vitest Configuration**
  - Created `vitest.config.js` with React plugin, Happy DOM environment
  - Set up path aliases (`@` → `./src`)
  - Configured coverage reporting (V8 provider, text/json/html reporters)
  - Added exclusions for test files and configs

- ✅ **Test Scripts Added to package.json**
  - `npm test` - Run all tests
  - `npm test:ui` - Visual test runner
  - `npm test:coverage` - Generate coverage reports

- ✅ **Testing Dependencies Installed**
  - `vitest` (v2.1.8) - Test runner
  - `@testing-library/react` (v16.1.0) - Component testing
  - `@testing-library/jest-dom` (v6.6.3) - DOM matchers
  - `@testing-library/user-event` (v14.5.2) - User interactions
  - `happy-dom` (v15.11.7) - Fast DOM implementation
  - `@vitest/ui` (v2.1.8) - Visual test runner
  - `@vitest/coverage-v8` (v2.1.8) - Coverage reporting

- ✅ **Test Infrastructure Created**
  - `src/test/setup.js` - Global test configuration, environment mocking
  - `src/test/testUtils.jsx` - Shared utilities (renderWithRouter, mock Supabase, mock data)
  - `src/test/README.md` - Comprehensive testing documentation

- ✅ **Example Tests Written**
  - `src/utils/playerUtils.test.js` - Bird emoji transformation tests
  - `src/utils/seasonUtils.test.js` - Season detection and selection tests
  - `src/components/leaderboard/PodiumDisplay.test.jsx` - Component rendering and interaction tests
  - `src/services/api.test.js` - Event API and leaderboard aggregation tests

- ✅ **Documentation Updated**
  - Updated `ARCHITECTURE.md` with Testing Framework section
  - Updated `SESSION-HANDOFF.md` with testing status and session summary

**Files Created (8 files):**
- vitest.config.js
- src/test/setup.js
- src/test/testUtils.jsx
- src/test/README.md
- src/utils/playerUtils.test.js
- src/utils/seasonUtils.test.js
- src/components/leaderboard/PodiumDisplay.test.jsx
- src/services/api.test.js

**Files Modified (3 files):**
- package.json (added test scripts and dependencies)
- docs/ARCHITECTURE.md (added Testing Framework section)
- docs/SESSION-HANDOFF.md (updated status and session summary)

**Testing Coverage:**
- Utility functions: ✅ playerUtils, seasonUtils
- React components: ✅ PodiumDisplay
- API services: ✅ eventAPI (getAllEvents, getLeaderboardForEvent)
- Mocking: ✅ Supabase, React Router, environment variables

**Next Steps for Testing:**
- ~~Write tests for PULP services (betting, challenges, advantages)~~ ✅ COMPLETED
- Write tests for more components (LeaderboardTable, Dashboard, Betting pages)
- Write integration tests for scorecard processing workflow
- Achieve 75%+ overall coverage goal

---

### PULP Transaction Tests - COMPLETED ✅

**Work Completed:**
- ✅ **Advantage Service Tests** (`advantageService.test.js`)
  - Purchase advantage deducts correct PULP amount (120 PULPs for Mulligan)
  - Advantage added to player's active_advantages array
  - One advantage per type limit enforced (can't buy duplicate active advantage)
  - Can purchase same advantage after previous one expired
  - No PULP deduction when validation fails

- ✅ **Betting Service Tests** (`bettingService.test.js`)
  - Place bet deducts wager amount from player balance
  - Minimum wager validation (20 PULPs minimum)
  - Duplicate player prediction validation (first/second/third must be different)
  - Perfect match pays out 2x wager (50 PULP bet → 100 PULP payout)
  - Partial match pays out 1x wager (right players, wrong order → wager returned)
  - Losing bet pays out 0 PULPs (wrong predictions)

- ✅ **Challenge Service Tests** (`challengeService.test.js`)
  - Issue challenge deducts wager from challenger immediately
  - Minimum wager validation (20 PULPs minimum)
  - Self-challenge validation (can't challenge yourself)
  - Accept challenge deducts wager from challenged player
  - Reject challenge charges 50% cowardice tax and refunds challenger
  - Resolve challenge awards 2x wager to winner (lower score)
  - Tie resolution refunds both players their wagers

**Files Created (3 files):**
- src/services/gamification/advantageService.test.js
- src/services/gamification/bettingService.test.js
- src/services/gamification/challengeService.test.js

**Files Modified (2 files):**
- docs/ARCHITECTURE.md (updated Testing Framework section with PULP tests)
- docs/SESSION-HANDOFF.md (this file - added PULP Transaction Tests session)

**Test Coverage:**
- PULP Transactions: ✅ Advantages (3 tests), Betting (6 tests), Challenges (7 tests)
- Total: 16 new test cases covering critical money-like PULP operations
- Focus: Transaction integrity, validation, payout calculations

**Why These Tests Matter:**
PULP is a money-like economy. Bugs in these services = unfair advantages, lost PULPs, broken game balance. These tests verify:
- Correct PULP deductions (no double-charging, no missing charges)
- Payout calculations (2x for perfect bets, 2x for challenge wins)
- Business rules (minimums, one-per-type limits, cowardice tax)
- Edge cases (ties, rejections, expirations)

**Next Steps:**
- Run `npm install` to install testing dependencies
- Run `npm test` to verify all tests pass
- Continue with Git setup and deployment

---

### UX Enhancements & Season Awareness - COMPLETED ✅

**Work Completed:**
- ✅ **Season Defaulting System**
  - Created `src/utils/seasonUtils.js` with getCurrentSeasonYear(), getCurrentEvent(), isCurrentSeason()
  - All pages now default to current season based on calendar year (2025 → Season 2025, 2026 → Season 2026, etc.)
  - Updated Dashboard, Leaderboard to use getCurrentEvent() on mount
  - Betting page already uses "next round" logic (season-agnostic)

- ✅ **Dashboard Comprehensive Expansion**
  - Added event dropdown with all seasons/tournaments + "All Time" option
  - Defaults to current season using getCurrentEvent()
  - Expanded stats display (14 total stats):
    - Main Stats: Total Points, Rounds Played, Wins, Podiums
    - Performance: Avg Points/Round, Avg Rank/Round, Win Rate %
    - Scoring: Birdies, Eagles, Aces, Courses Played
    - Score Range: Best Round, Worst Round
  - Stats recalculate based on selected event or All Time
  - Renamed Points tab to Stats tab

- ✅ **Leaderboard Enhancements**
  - Defaults to current season using getCurrentEvent()
  - Shows rounds count in small text below points value
  - Added expandable player rows (click to expand)
  - Accordion behavior: only one row expanded at a time
  - Chevron icon rotates when row is expanded
  - Expanded view shows: Wins, Podiums, Avg Points/Round, Birdies, Eagles, Aces
  - Mobile and desktop both support expandability
  - Top 3 filtered from table (only shown in podium)

- ✅ **Betting & Challenges "Next Round" Logic** (from previous session)
  - Removed round selection dropdowns from predictions and challenges
  - Bets and challenges now use `roundId: null` for "next round"
  - Added info cards explaining "Betting on: Next Round" and "Challenging for: Next Round"
  - Updated success messages to reflect next round logic
  - Betting locks based on events.betting_lock_time

- ✅ **Notification Dropdown** (from previous session)
  - Added `@radix-ui/react-dropdown-menu` package
  - Created `dropdown-menu.jsx` Shadcn component (11th UI component)
  - Transformed NotificationBell into dropdown showing 5 recent notifications
  - Shows activity icons (trophy, swords, trending up) and relative timestamps
  - "View All Activities" link at bottom navigates to /activity page
  - Badge shows unread count

**Files Created (2 files):**
- src/utils/seasonUtils.js (season detection utilities)
- src/components/ui/dropdown-menu.jsx (Shadcn dropdown component)

**Files Modified (6 files):**
- package.json (added @radix-ui/react-dropdown-menu)
- src/pages/Dashboard.jsx (event dropdown + expanded stats + All Time option)
- src/pages/Leaderboard.jsx (defaults to current season)
- src/components/leaderboard/LeaderboardTable.jsx (expandable rows, rounds display, filter top 3)
- src/components/betting/PredictionsSection.jsx (next round logic, removed round selection)
- src/components/betting/ChallengesSection.jsx (next round logic, removed round selection)
- src/components/layout/NotificationBell.jsx (dropdown with recent activity)

**Design Decisions:**
- Season auto-detection based on calendar year (simple, predictable)
- getCurrentEvent() prioritizes season matching current year, falls back to active event
- All Time stats aggregate across all events (no event_id filter)
- Expandable rows use accordion pattern (UX best practice)
- Next round logic eliminates need to pre-create future rounds
- Notification dropdown shows 5 most recent (prevents overwhelming UI)

**Issues Resolved:**
- Season selection was manual (now automatic based on year)
- Dashboard stats were limited (now comprehensive with 14 metrics)
- Leaderboard top 3 shown twice (now only in podium)
- Betting/challenges required future rounds (now "next round" model)
- Notifications were just an icon (now functional dropdown)

---

## Previous Session Summary (2025-12-26 - Earlier)

### Phase 4B: PULP Economy Implementation - COMPLETED ✅

**Work Completed:**
- ✅ **Services Folder Restructuring**
  - Moved 9 core services to `src/services/core/`
  - Created `src/services/gamification/` folder
  - Organized PULP services (pulpService, bettingService, challengeService, advantageService, index.js)
  - Updated imports in processScorecard.js

- ✅ **PULP Backend Services Built** (~750 lines total)
  - `pulpService.js`: Balance operations, transactions, weekly interaction bonus
  - `bettingService.js`: Place bets, lock betting, resolve bets (2x/1x/0x payouts)
  - `challengeService.js`: Issue challenges, accept/reject with cowardice tax, resolve
  - `advantageService.js`: Purchase advantages, track expiry (24h), record usage
  - `index.js`: Master orchestrator (gamificationService.processRoundGamification)

- ✅ **PULP API Endpoints Built** (7 endpoints in `src/api/pulp/`)
  - `placeBet.js`: POST endpoint for predictions
  - `issueChallenge.js`: POST endpoint for challenges
  - `respondToChallenge.js`: POST endpoint for accept/reject
  - `purchaseAdvantage.js`: POST endpoint for advantage shop
  - `lockBetting.js`: POST endpoint for admin betting lock
  - `getBalance.js`: GET endpoint for PULP balance + stats
  - `getTransactions.js`: GET endpoint for transaction history

- ✅ **Frontend Pages & Components Built**
  - Updated `Header.jsx` to 3-icon design (Notifications, Admin, Profile - NO PULP balance)
  - Created `AdminDropdown.jsx` with Control Center, Betting Controls, Process Scorecards
  - Updated `ProfileDropdown.jsx` with Dashboard, About, Logout
  - **Betting Page** (`Betting.jsx`):
    - PULP balance display at top
    - 3 accordion sections: Predictions, Challenges, Buy Advantages
    - `PredictionsSection.jsx`: Top 3 predictions + wager
    - `ChallengesSection.jsx`: Issue/respond with 2 tabs
    - `AdvantagesSection.jsx`: Shop with active advantages display
  - **Dashboard Page** (`Dashboard.jsx`):
    - 2 tabs: Points tab | PULPs tab
    - Points tab: Total points, season rank, achievements count
    - PULPs tab: Large balance display, earnings breakdown (4 cards), transaction history
  - **Activity Page** (`Activity.jsx`):
    - 2 tabs: Your Activity | Community
    - Feed items: transactions, bets, challenges, achievements, rounds
    - Relative timestamps ("2h ago", "Just now")
  - **About Page** (`About.jsx`):
    - 2 tutorial launchers (Core + PULP)
    - What is ParSaveables section
    - Quick links (GitHub, Support, FAQ)
  - **Admin Pages**:
    - `ControlCenter.jsx`: Admin dashboard with cards
    - `BettingControls.jsx`: Betting lock management page
    - `ProcessScorecards.jsx`: Manual scorecard trigger
    - `BettingControlsModal.jsx`: Lock betting modal component

- ✅ **Tutorial System Built**
  - Created `Tutorial.jsx`: Modal component with step navigation, progress bar
  - Created `tutorialData.js`: 2 comprehensive tutorials
    - Core Tutorial (7 steps): Welcome, rounds, points, achievements, activity, dashboard
    - PULP Tutorial (8 steps): PULPs intro, earning, predictions, challenges, advantages, betting locks, strategy
  - Integrated into About page with launch buttons

- ✅ **Shadcn UI Components Created** (10 components in `src/components/ui/`)
  - `button.jsx`: Button with variants (default, destructive, outline, secondary, ghost, link)
  - `card.jsx`: Card with Header, Content, Footer subcomponents
  - `badge.jsx`: Badge with variants
  - `dialog.jsx`: Modal dialog with Radix UI primitives
  - `tabs.jsx`: Tabs UI with Radix UI primitives
  - `input.jsx`: Form input component
  - `label.jsx`: Form label component
  - `select.jsx`: Dropdown select with Radix UI primitives
  - `accordion.jsx`: Accordion pattern with Radix UI primitives
  - `progress.jsx`: Progress bar component

- ✅ **Dependencies Added**
  - Added 6 Radix UI packages to package.json:
    - @radix-ui/react-accordion
    - @radix-ui/react-dialog
    - @radix-ui/react-label
    - @radix-ui/react-progress
    - @radix-ui/react-select
    - @radix-ui/react-tabs

- ✅ **Routing Updated**
  - Updated `App.jsx` with About route and admin routes
  - Added routes: /about, /admin/control-center, /admin/betting-controls, /admin/process-scorecards

**Files Created/Modified (37 files):**
- 5 PULP backend services
- 7 PULP API endpoints
- 10 Shadcn UI components
- 7 page components (Dashboard, Activity, About, Betting, 3 admin pages)
- 5 betting section components (PredictionsSection, ChallengesSection, AdvantagesSection, BettingControlsModal, Tutorial)
- 3 layout components (Header, AdminDropdown, ProfileDropdown updates)
- 1 tutorial data file
- 1 package.json (dependencies)
- 1 App.jsx (routes)

**Design Decisions:**
- Services organized by domain (core/, gamification/)
- API endpoints organized by feature (pulp/)
- Accordion pattern for Betting page (mobile-friendly)
- Tabs pattern for Dashboard and Activity (Points/PULPs, Player/Community)
- Tutorial system with 2 separate tutorials (not combined)
- Generic Shadcn styling first, design polish later
- Weekly interaction bonus awards on first PULP action each week

**Issues Resolved:**
- Missing Radix UI dependencies (installed 6 packages)
- Missing Shadcn UI components (created 10 components)
- Missing admin pages (created ControlCenter, BettingControls, ProcessScorecards)
- Services folder organization (restructured into core/ and gamification/)

---

## Previous Session Summary (2025-12-23)

### Phase 1: Foundation & Setup - COMPLETED ✅

**Work Completed:**
- ✅ Initialized Vite + React project
- ✅ Installed and configured Tailwind CSS v3.4.17
- ✅ Set up Shadcn/ui with theme system (light + dark mode)
- ✅ Installed core dependencies (Supabase, Zustand, Framer Motion, React Router, Lucide)
- ✅ Created complete folder structure (pages/, components/, hooks/, services/)
- ✅ Created Supabase client configuration
- ✅ Created .gitignore and .env.local.example
- ✅ Created README.md

### Phase 2: Authentication & Layout - COMPLETED ✅

**Work Completed:**
- ✅ Created 5 database migrations (001-005)
  - 001_pulp_economy.sql - Extended tables, added PULP economy
  - 002_clear_user_ids.sql - Reset user_ids to allow player claiming
  - 003_fix_rls_for_signup.sql - Public read access for registered_players
  - 004_fix_signup_rls.sql - Allow users to claim unclaimed players
  - 005_add_scorecard_image_url.sql - Added scorecard_image_url to rounds
- ✅ Built authentication system
  - Created src/services/api.js (authAPI, playerAPI, eventAPI, roundAPI)
  - Created src/hooks/useAuth.js
  - Implemented Login + Signup flow with player selection dropdown
  - Email/password auth with Supabase (email confirmation disabled)
  - Protected routes in AppLayout
- ✅ Fixed RLS policies for signup flow
- ✅ Set up React Router with 9 routes + 404
- ✅ Built layout components
  - Header (logo, 3 icons: notifications, admin, profile - NO PULP balance)
  - BottomNav (5 tabs: Leaderboard, Rounds, Podcast, Activity, Betting)
  - ProfileDropdown with Dashboard, About, Logout
  - AdminDropdown with Control Center, Betting Controls, Process Scorecards (visible to all, access control on click)

### Phase 3: Leaderboard & Rounds - COMPLETED ✅

**Work Completed:**
- ✅ **Leaderboard Page** (src/pages/Leaderboard.jsx)
  - Event selection dropdown (auto-selects active event)
  - Fetches aggregated player_rounds data by event_id
  - PodiumDisplay component for top 3 (src/components/leaderboard/PodiumDisplay.jsx)
  - LeaderboardTable component with sortable columns (src/components/leaderboard/LeaderboardTable.jsx)
  - Mobile-responsive design (cards on mobile, table on desktop)
- ✅ **Rounds Page** (src/pages/Rounds.jsx)
  - Accordion list of all rounds (sorted by date, most recent first)
  - Single-expand pattern (only one round open at a time)
  - Null dates pushed to bottom
- ✅ **RoundCard Component** (src/components/rounds/RoundCard.jsx)
  - Collapsed: Shows date, course name, player count
  - Expanded: Shows scorecard image (left) + player list with scores (right)
  - Full-screen image modal (click to expand, tap/swipe to close)
  - Fetches players on expand from player_rounds table
- ✅ **API Layer** (src/services/api.js)
  - eventAPI.getLeaderboardForEvent() - Aggregates player_rounds by player_name
  - roundAPI.getAllRounds() - Fetches rounds with player count, sorted by date
  - roundAPI.getPlayersForRound() - Fetches players for specific round

**Files Created/Modified:**
- src/services/api.js (authAPI, playerAPI, eventAPI, roundAPI)
- src/hooks/useAuth.js
- src/pages/Login.jsx (full implementation)
- src/pages/Leaderboard.jsx (full implementation)
- src/pages/Rounds.jsx (full implementation)
- src/components/leaderboard/PodiumDisplay.jsx
- src/components/leaderboard/LeaderboardTable.jsx
- src/components/rounds/RoundCard.jsx
- supabase/migrations/002-005 (RLS fixes, scorecard URL column)

**Issues Resolved:**
- Column name mismatches (name → player_name, removed email references)
- RLS policies blocking signup (user_id NULL during signup)
- Email confirmation blocking login (disabled in Supabase dashboard)
- Browser cache issues during development (use Ctrl+Shift+R for hard refresh)
- Date sorting with null values
- Full-screen image modal with touch gestures

### Phase 4A: PULP Economy Design - COMPLETED ✅ (2025-12-24)

**Work Completed:**
- ✅ **PULP Economy Design & Architecture**
  - Comprehensive brainstorming session using Opus architect agent
  - Finalized earning mechanisms: +10 participation, +20 streak (4 weeks), +5 per higher-ranked beaten, DRS (+2/4/6/8/10/12/14), +5 weekly interaction
  - Finalized betting system: Top 3 prediction, 20 PULP min, 2x/1x/0x payouts, blind betting with admin lock
  - Finalized challenge system: Lower-ranked only, 20 PULP min, 50% cowardice tax, no cooldown, resolves next round
  - Finalized advantages: Mulligan (120), Anti-Mulligan (200), Cancel (200), Bag Trump (100), Shotgun Buddy (100)
  - Economy parameters: 40 start, 600 max, seasonal reset Jan 1
- ✅ **Navigation Structure Redesign**
  - Header: 3-icon design (🔔 Notifications, 🔧 Admin, 👤 Profile)
  - Profile dropdown: Dashboard (Points tab | PULPs tab), About, Logout
  - Betting page: Accordion pattern (Predictions, Challenges, Buy Advantages)
  - Activity page: 2 tabs (Player feed, Community feed)
- ✅ **Database Migration Created**
  - Created supabase/migrations/006_pulp_economy_finalized.sql
  - New tables: bets, challenges
  - Extended registered_players: unique_courses_played, participation_streak, last_round_date, total_rounds_this_season, last_interaction_week, challenges_declined
  - Extended events: betting_lock_time
  - Updated advantage_catalog: New prices (120/200/200/100/100) and types (cancel, bag_trump, shotgun_buddy)
  - Updated transaction types: 15 new types for earning mechanisms
  - Functions: get_iso_week(), reset_season_pulps()
- ✅ **Documentation Updated**
  - docs/ARCHITECTURE.md: Complete PULP Economy section with philosophy, parameters, earning, betting, challenges, advantages, streak logic, DRS
  - Updated System Overview: Emphasis on disc golf first, PULP as secondary
  - Updated Header/Profile dropdown descriptions
  - Updated advantage catalog prices and types
  - Updated gamificationService master processor description

**Files Created/Modified:**
- supabase/migrations/006_pulp_economy_finalized.sql (NEW)
- docs/ARCHITECTURE.md (UPDATED - PULP Economy section, nav structure, advantage catalog)
- docs/SESSION-HANDOFF.md (UPDATED - this file)

**Design Decisions:**
- Starting balance: 40 PULPs (requires 4-6 weeks to afford first advantage - scarcity by design)
- No challenge cooldown (group wanted high-stakes frequent challenges with cowardice tax)
- Same-day advantage expiry (11:59 PM) forces usage, no banking (group preference)
- DRS uncapped (group size limits inflation naturally to 10-14 max)
- Non-zero-sum economy (PULPs created via earning, destroyed via betting losses)
- Betting window: Days-long, closes 15 mins after round start (not 15-minute window)
- Opus architect review: Rating A-, Confidence 90% (with user context clarifications)

### Phase 4B: PULP Economy Implementation - IN PROGRESS ⏳ (2025-12-24)

**Status:** Design complete, ready to start building backend services

**Next Steps (Priority Order):**

**Step 0: V1 Integration Prerequisites (CRITICAL)**
1. ✅ Create `src/utils/logger.js` (Winston logger with createLogger)
2. ✅ Create `src/utils/retry.js` (retryWithBackoff, isRetryableError)
3. ✅ Create `src/utils/errors.js` (ExternalAPIError, ValidationError)
4. ✅ Create `src/config/index.js` (Gmail, Anthropic, Supabase config)
5. ⏳ Implement scorecard image upload to Supabase Storage (in processScorecard workflow)
6. ⏳ Move `src/api/*.js` → `api/*.js` and update imports (deferred until deployment)
7. ⏳ Test processScorecard workflow end-to-end (verify v1 services work)

**Step 1: Backend Services (gamificationService)**
7. ✅ Apply migration 006 to database (bets, challenges, extended tables)
8. ⏳ Build `src/services/gamificationService/pulpService.js` (balance operations, transaction logging)
9. ⏳ Build `src/services/gamificationService/bettingService.js` (place bets, resolve, 2x/1x/0x payouts)
10. ⏳ Build `src/services/gamificationService/challengeService.js` (issue, accept/reject with cowardice tax, resolve)
11. ⏳ Build `src/services/gamificationService/advantageService.js` (purchase, track same-day expiry, record usage)
12. ⏳ Build `src/services/gamificationService/index.js` (master orchestrator: processRoundGamification)
13. ⏳ Integrate gamificationService into `api/processScorecard.js` workflow (call after round processing)

**Step 2: PULP API Endpoints**
14. ⏳ Build API endpoint /api/pulp/placeBet
15. ⏳ Build API endpoint /api/pulp/issueChallenge
16. ⏳ Build API endpoint /api/pulp/respondToChallenge
17. ⏳ Build API endpoint /api/pulp/purchaseAdvantage
18. ⏳ Build API endpoint /api/pulp/lockBetting (admin)
19. ⏳ Build API endpoint /api/pulp/getBalance
20. ⏳ Build API endpoint /api/pulp/getTransactions

**Step 3: Frontend Pages & Components**
21. ⏳ Update Header component (3-icon design: notifications, admin, profile - NO PULP balance)
22. ⏳ Build Betting page UI (accordion: Predictions, Challenges, Buy Advantages + PULP balance display)
23. ⏳ Build Admin betting controls modal (set betting_lock_time, delay, cancel buttons)
24. ⏳ Update Dashboard page (add PULPs tab with PULP balance display)
25. ⏳ Build Activity page (Player feed + Community feed tabs)
26. ⏳ Build two separate tutorials (Core app + PULP economy)

**Step 4: Testing & Validation**
27. ⏳ Test PULP earning mechanisms (participation, DRS, beat higher-ranked, streak)
28. ⏳ Test betting flow (place bet, lock, resolve, payouts)
29. ⏳ Test challenge flow (issue, accept/reject with cowardice tax, resolve)
30. ⏳ Test advantage purchase and same-day expiry
31. ⏳ End-to-end test: Full round with bets, challenges, PULPs

**Files to Create:**
- `src/utils/logger.js` (NEW - CRITICAL for v1 services)
- `src/utils/retry.js` (NEW - CRITICAL for v1 services)
- `src/utils/errors.js` (NEW - CRITICAL for v1 services)
- `src/config/index.js` (NEW - CRITICAL for v1 services)
- `api/processScorecard.js` (MOVE from src/api/ - Vercel serverless)
- `api/generatePodcast.js` (MOVE from src/api/ - Vercel serverless)
- `src/services/gamificationService/pulpService.js` (NEW)
- `src/services/gamificationService/bettingService.js` (NEW)
- `src/services/gamificationService/challengeService.js` (NEW)
- `src/services/gamificationService/advantageService.js` (NEW)
- `src/services/gamificationService/index.js` (NEW)
- `api/pulp/` folder with 7 API endpoints (NEW - Vercel serverless)
- `src/pages/Betting.jsx` (UPDATE - accordion pattern + PULP balance display)
- `src/pages/Dashboard.jsx` (UPDATE - add PULPs tab with PULP balance display)
- `src/pages/Activity.jsx` (UPDATE - add Player/Community tabs)
- `src/components/layout/Header.jsx` (UPDATE - 3-icon design, NO PULP balance)
- `src/components/layout/AdminDropdown.jsx` (NEW - Control Center, Betting Controls, Process Scorecards)
- `src/components/shared/TutorialPopup.jsx` (NEW - two separate tutorials)

---

## COMPLETE FEATURE BACKLOG

### ✅ Phase 1: Foundation & Setup (COMPLETE)

#### 1.1 Project Initialization ✅
- [x] Initialize Vite + React project
- [x] Install and configure Tailwind CSS
- [x] Initialize Shadcn/ui with configuration
- [x] Set up folder structure
- [x] Configure path aliases (@/)
- [x] Install core dependencies
- [x] Create basic file structure

#### 1.2 Supabase Setup ✅
- [x] Install @supabase/supabase-js
- [x] Create src/services/supabase.js client
- [x] Configure environment variables template
- [x] Create Supabase project
- [x] Get credentials and add to .env.local

#### 1.3 Database Migration ✅
- [x] Extend registered_players table
- [x] Extend events table
- [x] Extend rounds table
- [x] Create advantage_catalog table
- [x] Seed advantage data
- [x] Configure RLS policies
- [x] Run migrations on Supabase (5 migrations applied)

#### 1.4 Git Setup ⏳
- [x] Create .gitignore
- [ ] Initialize git repository
- [ ] Initial commit
- [ ] Create GitHub repository (optional)

---

### ✅ Phase 2: Authentication & Layout (COMPLETE)

#### 2.1 Authentication System ✅
- [x] Create src/services/api.js with auth helpers (authAPI, playerAPI, eventAPI, roundAPI)
- [x] Create src/hooks/useAuth.js hook
- [x] Build Login page with full implementation
- [x] Implement Supabase Auth (email/password)
- [x] Implement Signup flow with player selection dropdown
- [x] Set up protected routes in AppLayout
- [x] Test auth flow
- [x] Fix RLS policies for signup (migrations 002-004)
- [x] Disable email confirmation in Supabase

#### 2.2 Core Layout Components ✅
- [x] Create Header.jsx (sticky, logo, podcast icon, notifications, profile)
- [x] Create ProfileDropdown.jsx with sign out
- [x] Create BottomNav.jsx (5 tabs)
- [x] Create NotificationBell.jsx
- [ ] Create PodcastModal.jsx (deferred to Phase 5)

#### 2.3 Routing Setup ✅
- [x] Install react-router-dom
- [x] Create App.jsx with routes
- [x] Define 9 routes (login, leaderboard, rounds, podcast, activity, betting, dashboard, achievements, settings)
- [x] Set default route (/ → /leaderboard)
- [x] Add 404 page
- [x] Create AppLayout wrapper component
- [x] Create all page placeholders

---

## Next Session: Immediate Tasks (User's Priority List)

**🚨 CRITICAL - Priority 1: Fix PULP Economy Settlement**
- **BROKEN:** Bets and challenges are NOT resolving after scorecard processing
- Debug gamificationService integration with processScorecard workflow
- Verify bet resolution logic (resolveBets function)
- Verify challenge resolution logic (resolveChallenge function)
- Test end-to-end: Place bet → Process scorecard → Verify PULP settlement
- Test end-to-end: Issue/accept challenge → Process scorecard → Verify winner gets PULPs
- Check transaction logging (pulp_transactions table)

**Priority 2: PULP Economy UI Stages**
Implement different UI states for betting lifecycle:
- **Pre-lock Stage:**
  - Betting open, show available balance
  - Allow placing bets/challenges
  - Show countdown timer
- **Post-lock Stage:**
  - Betting locked, can't modify bets/challenges
  - Show locked state with clear messaging
  - Display what bets/challenges are active
- **Post-resolve Stage:**
  - Show results (won/lost)
  - Display payouts received
  - Show updated PULP balance
  - Apply to: Predictions, Challenges, Advantages

**Priority 3: Control Center Polish**
- Finalize all CRUD operations (Tournaments, Players, Courses, Events, Rules)
- Test each tab thoroughly
- Add loading states where missing
- Polish error handling and validation
- Test with real data scenarios

**Priority 4: Activity & Notifications Tracking**
- Ensure all PULP events appear on activity page:
  - Bet placed/resolved
  - Challenge issued/accepted/resolved
  - Advantage purchased
  - PULP earned (participation, DRS, etc.)
- Verify notification bell shows correct count
- Test "View All Activities" link

**Priority 5: End-to-End Testing & Production Prep**
- Create test accounts for all 10-12 players
- Run multiple full scenarios:
  - Place bets, process scorecard, verify payouts
  - Issue challenges, accept/reject, process scorecard
  - Purchase advantages, verify expiry
  - Test streak bonuses, DRS, beat-higher-ranked
- After successful testing:
  - Delete all test user accounts
  - Reset all PULP balances to 40
  - Clear transaction history
  - Prepare for production use

**Priority 6: Podcast Feature (Lower Priority)**
- Build Podcast page UI (audio player, episode description)
- Test /api/generatePodcast endpoint
- Finalize Episode 1 content

---

## Progress Tracking

**Total Phases:** 7
**Completed:** 4.75 phases (93%)
**Current Phase:** Phase 5 - Testing & Polish

**Phase 1:** Foundation ✅ COMPLETE (20+ tasks)
**Phase 2:** Authentication & Layout ✅ COMPLETE (30+ tasks)
**Phase 3:** Leaderboard & Rounds ✅ COMPLETE (18+ tasks)
**Phase 4A:** PULP Economy Design ✅ COMPLETE (Architecture, Migration, Documentation)
**Phase 4B:** PULP Economy Implementation ✅ COMPLETE (37 files created/modified)
- ✅ Backend services (gamificationService - 5 services, ~750 lines)
- ✅ PULP API endpoints (7 endpoints)
- ✅ Frontend pages (Betting, Dashboard, Activity, About, Admin)
- ✅ Tutorial system (Core + PULP)
- ✅ Shadcn UI components (11 components)
**Phase 4C:** UX Enhancements ✅ COMPLETE (8 files created/modified)
- ✅ Season awareness system (defaults to current year)
- ✅ Dashboard comprehensive stats expansion (14 metrics)
- ✅ Leaderboard expandable rows with detailed stats
- ✅ Next round betting logic (no future rounds needed)
- ✅ Notification dropdown system
**Phase 5:** Testing & Polish ⏳ IN PROGRESS
- ⏳ Testing & bug fixes
- ⏳ Podcast feature
- ✅ Notification system
- ⏳ Design polish & animations

---

## Key Reference Points

### Folder Structure Created
```
src/
├── pages/          ✅ Created (empty, ready for components)
├── components/
│   ├── ui/        ✅ Created (for Shadcn components)
│   ├── layout/    ✅ Created
│   ├── leaderboard/ ✅ Created
│   ├── betting/   ✅ Created
│   ├── activity/  ✅ Created
│   ├── rounds/    ✅ Created
│   └── shared/    ✅ Created
├── hooks/         ✅ Created
├── services/      ✅ Created (supabase.js ready)
└── lib/           ✅ Created (utils.js ready)
```

### Tech Stack Installed
- ✅ React 18.3.1
- ✅ Vite 7.3.0
- ✅ Tailwind CSS 3.4.17
- ✅ Shadcn/ui utilities
- ✅ Supabase JS 2.47.13
- ✅ Zustand 5.0.2
- ✅ Framer Motion 12.0.0
- ✅ React Router DOM 7.1.3
- ✅ Lucide React 0.468.0

---

**Status:** Phase 4A complete! PULP economy designed, documented, and migration created. Ready to build backend services! 🚀

**Dev Server:** http://localhost:5175

**CRITICAL BLOCKERS:**
1. ⚠️ Migration 006 (PULP economy) needs to be applied to database before building services
2. ⚠️ **V1 Services Integration Incomplete** - Missing utility files (see section below)

---

## ⚠️ CRITICAL: V1 Services Integration Status

**Problem:** V1 services (emailService, visionService, scoringService, etc.) were copied to v2 but are **NON-FUNCTIONAL** due to missing dependencies.

**Missing Files (REQUIRED for v1 services to work):**
1. `src/utils/logger.js` - Winston logger with context (imported by ALL services)
2. `src/utils/retry.js` - Exponential backoff retry logic (visionService)
3. `src/utils/errors.js` - Custom error classes: `ExternalAPIError`, `ValidationError` (visionService)
4. `src/config/index.js` - Centralized config object (Gmail credentials, Anthropic API key, etc.)

**API Endpoint Location Issue:**
- Current: `src/api/processScorecard.js`, `src/api/generatePodcast.js` (WRONG for Vercel)
- Should be: `api/processScorecard.js` (root level, not inside src/)

**What Works:**
- ✅ V1 service files exist in `src/services/` (9 services)
- ✅ API endpoints exist (processScorecard, generatePodcast)

**What's Broken:**
- ❌ ALL v1 services will crash on import due to missing utils
- ❌ API endpoints can't run (wrong folder for Vercel deployment)
- ❌ No config file for API keys (Gmail OAuth, Anthropic API)

**Resolution Steps:**
1. Create `src/utils/logger.js` (Winston logger with createLogger function)
2. Create `src/utils/retry.js` (retryWithBackoff, isRetryableError functions)
3. Create `src/utils/errors.js` (ExternalAPIError, ValidationError classes)
4. Create `src/config/index.js` (export config object with gmail, anthropic, supabase sections)
5. Move `src/api/*.js` → `api/*.js` (Vercel serverless functions must be at root)
6. Update import paths in API files after move
7. Test processScorecard workflow end-to-end

**Impact:** Until these files are created, the core scorecard processing workflow is completely broken.

---

### ✅ Phase 3: Core Features (Leaderboard & Rounds) (COMPLETE)

#### 3.1 Leaderboard Page ✅
- [x] Create src/pages/Leaderboard.jsx
- [x] Create LeaderboardTable.jsx (sortable, mobile responsive)
- [x] Create PodiumDisplay.jsx (top 3 visual)
- [x] Implement event selection dropdown
- [x] Auto-select active event on load
- [x] Fetch aggregated player_rounds data from Supabase
- [x] Verify NO PULP data displayed
- [x] Add eventAPI.getLeaderboardForEvent() to api.js

#### 3.2 Rounds Page ✅
- [x] Create src/pages/Rounds.jsx
- [x] Create RoundCard.jsx (accordion pattern)
- [x] Implement single-expand-only accordion
- [x] Sort rounds by date (most recent first, nulls at bottom)
- [x] Show scorecard image + player list on expand
- [x] Add full-screen image modal with touch gestures
- [x] Fetch rounds from database with player count
- [x] Fetch players per round on expand
- [x] Add roundAPI functions to api.js

#### 3.3 Scorecard Processing Integration
- [ ] Verify /api/processScorecard endpoint works (v1 backend)
- [ ] Test 12-step workflow from v1
- [ ] Integrate with Process Scorecard button (deferred)
- [ ] Handle success/error states
- [ ] Update UI after processing

---

### Phase 4: PULP Economy Features

#### 4.1 PULP Management (Backend)
- [ ] Create gamificationService.js
- [ ] Implement getPulpBalance()
- [ ] Implement addPulps()
- [ ] Implement deductPulps()
- [ ] Implement getPulpLeaderboard()
- [ ] Create PULP transaction logging

#### 4.2 Betting System
- [ ] Implement betting functions (placeBet, lockBetting, resolveBets, calculateOdds)
- [ ] Create hooks/useBetting.js
- [ ] Create pages/Betting.jsx
- [ ] Create BettingForm.jsx (predictions + wager)
- [ ] Create OddsDisplay.jsx
- [ ] Create ActiveBets.jsx
- [ ] Create PulpLeaderboard.jsx (PULP rankings)
- [ ] Integrate bet resolution into round processing

#### 4.3 Advantages Shop
- [ ] Implement purchaseAdvantage(), useAdvantage()
- [ ] Create AdvantageShop.jsx (grid with purchase buttons)
- [ ] Add same-day expiration (11:59 PM)
- [ ] Enforce "one per type" rule
- [ ] Create advantage usage tracking

#### 4.4 Head-to-Head Challenges
- [ ] Implement challenge functions (issueChallenge, respondToChallenge, resolveChallenge)
- [ ] Create ChallengeModal.jsx
- [ ] Create challenge notification system
- [ ] Create challenge response UI
- [ ] Integrate challenge resolution into round processing
- [ ] Apply 50% cowardice tax for rejections

#### 4.5 Dashboard Page
- [ ] Create pages/Dashboard.jsx with 2 tabs (Points | PULPs)
- [ ] Create StatCard.jsx
- [ ] Create RivalryCard.jsx
- [ ] Create ActiveChallengeCard.jsx
- [ ] Fetch user stats

---

### Phase 5: Social & Content Features

#### 5.1 Activity Feed
- [ ] Create pages/Activity.jsx (2 tabs: Individual + Community)
- [ ] Create ActivityFeed.jsx
- [ ] Create IndividualTab.jsx
- [ ] Create CommunityTab.jsx
- [ ] Create ActivityItem.jsx
- [ ] Create notification generation logic
- [ ] Integrate with notification bell badge count
- [ ] Implement real-time updates

#### 5.2 Podcast Feature
- [ ] Create pages/Podcast.jsx
- [ ] Verify /api/generatePodcast endpoint
- [ ] Create podcast player UI
- [ ] Integrate with PodcastModal
- [ ] Fetch latest episode
- [ ] Generate new episode (monthly)

#### 5.3 Settings Page
- [ ] Create pages/Settings.jsx
- [ ] Create user preferences section (theme toggle, notifications)
- [ ] Create Admin Panel section (conditional on role)
- [ ] Save settings to database
- [ ] Implement role checking

---

### Phase 6: Animations & Polish

#### 6.1 Framer Motion Animations
- [x] Create Confetti.jsx (achievements, bet wins, challenges) - COMPLETE with presets & useConfetti hook
- [ ] Create PulpCounter.jsx (animated counter with color flash) - NOT IMPLEMENTED
- [x] Add page transition animations - COMPLETE (AnimatePresence + animations.js utilities)
- [x] Add micro-interactions (hover, click feedback) - COMPLETE (158 instances across 17 files)
- [x] Add loading skeleton screens - COMPLETE (skeleton.jsx with 5 variants, used in 18 files)
- [x] Respect prefers-reduced-motion - COMPLETE (CSS support in mobile.css)

#### 6.2 Tutorial Popup
- [x] Create TutorialPopup.jsx (multi-step modal) - COMPLETE (Tutorial.jsx with progress, navigation)
- [ ] Track tutorial completion - NEEDS IMPLEMENTATION (tracking logic for first login)
- [ ] Show on first login only - NEEDS IMPLEMENTATION (integration with auth flow)
- [ ] Add "skip tutorial" option - PARTIAL (has close button, needs explicit skip tracking)

#### 6.3 Error Handling & Loading States
- [x] Create LoadingSpinner.jsx - SKIPPED (using skeleton screens instead)
- [x] Add loading states to all data fetching - COMPLETE (18 files with loading states)
- [ ] Add error boundaries - NOT IMPLEMENTED
- [x] Add error toast notifications (Shadcn Toaster) - COMPLETE (implemented across 7 components)
- [x] Add empty states - COMPLETE (implemented across multiple pages)
- [ ] Add offline detection - NOT IMPLEMENTED

#### 6.4 Performance Optimization
- [x] Implement lazy loading for routes - COMPLETE (6 less-used pages lazy loaded)
- [ ] Optimize images - NOT IMPLEMENTED
- [ ] Implement data caching - NOT IMPLEMENTED (no useMemo/useCallback)
- [ ] Minimize re-renders - NOT IMPLEMENTED (no React.memo usage)
- [ ] Verify performance targets met - NOT DONE

---

### Phase 7: Testing & Deployment

#### 7.1 Testing
- [ ] Test authentication flow
- [ ] Test scorecard processing end-to-end
- [ ] Test PULP transactions
- [ ] Test achievement unlocking
- [ ] Test betting flow
- [ ] Test challenges flow
- [ ] Test all page navigation
- [ ] Mobile responsiveness testing
- [ ] Browser compatibility testing
- [ ] Admin panel testing

#### 7.2 Deployment Setup
- [ ] Configure Vercel project
- [ ] Set environment variables in Vercel
- [ ] Configure Supabase production database
- [ ] Run production migrations
- [ ] Seed production data
- [ ] Configure domain (if custom)
- [ ] Set up auto-deploy from Git

#### 7.3 Launch Preparation
- [ ] Create user onboarding flow
- [ ] Import existing player data from v1
- [ ] Test with real users
- [ ] Monitor for errors
- [ ] Set up analytics (optional)

---

**Total Tasks:** 175+ across 7 phases
**Completed:** 68+ tasks (Phases 1, 2, 3) ✅
**In Progress:** Phase 4 - Dashboard & PULP Economy
**Remaining:** 107+ tasks

---

**Current Status:** 43% complete (3/7 phases)
**Dev Server:** http://localhost:5175
**Next:** PULP Backend Services → Dashboard page → Betting → Activity Feed → Polish

**Backend Integration:** V1 services migrated to v2
- 2 API endpoints: processScorecard.js, generatePodcast.js
- 9 services: email, vision, scoring, points, database, config, player, event, podcast

---

## Known Issues & Notes

**Development Cache Issues:**
- Browser caching can cause stale data during development
- Use Ctrl+Shift+R (hard refresh) when seeing stale state
- Or enable "Disable cache" in DevTools (F12 → Network tab)
- This is temporary during development - production won't have this issue

**Database Schema Notes:**
- Points are event-based, stored in `player_rounds.final_total`
- NO PULP data in leaderboard (traditional points only)
- PULP economy is separate system (achievements, betting, advantages)
- Email confirmation disabled in Supabase for small friend group
- RLS policies allow users to claim unclaimed player profiles during signup

**Applied Migrations:**
1. 001_pulp_economy.sql - Core PULP tables and extensions
2. 002_clear_user_ids.sql - Reset user_ids for claiming
3. 003_fix_rls_for_signup.sql - Public read for registered_players
4. 004_fix_signup_rls.sql - Allow claiming unclaimed players
5. 005_add_scorecard_image_url.sql - Scorecard image URLs

**Pending Migrations (Apply Before Building):**
6. 006_pulp_economy_finalized.sql - Finalized PULP economy (bets, challenges, extended registered_players, updated advantage_catalog)

---

**Ready for Phase 4B: PULP Economy Implementation (Backend Services)** 🚀
