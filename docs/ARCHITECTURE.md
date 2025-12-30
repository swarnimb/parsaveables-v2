# ParSaveables 2.0 - System Architecture

**Last Updated:** 2025-12-30
**Version:** 2.0 (PULP Economy Edition)
**Status:** Backend & Frontend Complete - Season Aware - Guest Login - Admin Control Center - Testing Phase

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Navigation Structure](#navigation-structure)
4. [Tech Stack](#tech-stack)
5. [Database Schema](#database-schema)
6. [Backend Services](#backend-services)
7. [Frontend Structure](#frontend-structure)
8. [Process Flow](#process-flow)
9. [PULP Economy Design](#pulp-economy-design)
10. [Security Model](#security-model)
11. [Deployment](#deployment)

---

## System Overview

ParSaveables 2.0 is a disc golf tournament tracking platform for small friend groups (10-12 players). It automates scorecard processing using Claude Vision AI and transforms traditional scoring into an engaging social experience through a secondary PULP Economy system.

**Primary System:** Traditional disc golf scoring with custom events (seasons, tournaments) and points-based leaderboards

**Secondary System:** PULP Economy (ParSaveables Ultimate Loyalty Points) - a fun engagement layer for betting, challenges, and advantages

### Core Philosophy
- **Disc Golf First**: Track rounds, points, and leaderboards for custom seasons and tournaments
- **AI-Powered Automation**: Email UDisc screenshots → automatic scorecard processing
- **Equity-Focused PULP Economy**: Reward participation and consistency, not just winning
- **Mobile-First UX**: Thumb-friendly design, smooth animations, premium feel
- **Cost-Conscious**: Stay under $5/month operational cost

### Key Features
1. **Automated Scorecard Processing**: Email UDisc screenshot → Claude Vision API → automatic points calculation
2. **Points-Based Leaderboard**: Traditional rankings by points (primary system)
3. **PULP Economy (Secondary)**: Earn PULPs through participation, DRS catch-up bonuses, beating higher-ranked players
4. **Betting System**: Predict top 3 finishers, blind betting with admin-controlled lock
5. **Head-to-Head Challenges**: Lower-ranked can challenge higher-ranked (no cooldown)
6. **Advantages Shop**: Mulligans, Anti-Mulligans, Cancel, Bag Trump, Shotgun Buddy
7. **Automated Monthly Podcast**: AI-generated recap of highlights and rivalries
8. **Group Activity Feed**: Real-time notifications for rounds, challenges, betting results
9. **Guest Login**: Anonymous users can browse leaderboards, rounds, podcast, and community activity (read-only)
10. **Admin Control Center**: Password-protected CRUD interface for managing tournaments, players, courses, events, and scoring rules

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (React SPA)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sticky Header                                        │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │ [Logo]                        [🔔] [🔧] [👤]  │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                        │  │
│  │  Notifications Dropdown (🔔):                         │  │
│  │  • Notification history (read + unread)               │  │
│  │  • Click to navigate to relevant page                │  │
│  │  • "View All History" → Activity page                │  │
│  │  • Visible to all users                               │  │
│  │                                                        │  │
│  │  Admin Dropdown (🔧):                                 │  │
│  │  • Control Center (page, password-protected)          │  │
│  │  • Betting Controls (modal)                           │  │
│  │  • Process Scorecards (modal)                         │  │
│  │  • Visible to all, access control on click            │  │
│  │                                                        │  │
│  │  Profile Dropdown (👤):                               │  │
│  │  • Dashboard (Points tab | PULPs tab)                │  │
│  │  • About (How Points Work | How PULPs Work)          │  │
│  │  • Logout                                             │  │
│  │  • Visible to all users                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  9 Pages + 2 Modals                                   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Bottom Nav (5 pages):                                │  │
│  │  1. Leaderboard - Points rankings (NO PULPs shown)   │  │
│  │  2. Rounds      - Round history + scorecard viewer    │  │
│  │  3. Podcast     - Latest episode player               │  │
│  │  4. Activity    - Player feed + Community feed tabs   │  │
│  │  5. Betting     - Predictions, Challenges, Advantages │  │
│  │                   (PULP balance shown here)           │  │
│  │                                                        │  │
│  │  Profile Dropdown (2 pages):                          │  │
│  │  6. Dashboard   - Points tab | PULPs tab              │  │
│  │                   (PULP balance shown in PULPs tab)   │  │
│  │  7. About       - How Points Work | How PULPs Work    │  │
│  │                                                        │  │
│  │  Admin Dropdown (1 page + 2 modals):                  │  │
│  │  8. Control Center - CRUD (password-protected)        │  │
│  │  • Betting Controls (modal, visible to all)           │  │
│  │  • Process Scorecards (modal, visible to all)         │  │
│  │                                                        │  │
│  │  Public:                                              │  │
│  │  9. Login       - Email/password auth + signup        │  │
│  │                   + "Continue as Guest" button        │  │
│  │  (404 NotFound page as catch-all route)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼ Supabase JS SDK + API calls
┌─────────────────────────────────────────────────────────────┐
│              VERCEL SERVERLESS FUNCTIONS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   API Routes (2 existing)                            │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  /api/processScorecard - 12-step workflow            │  │
│  │  /api/generatePodcast  - Monthly podcast             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │   14 Backend Services (Organized in 2 Folders)       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  [src/services/core/] - 9 Core Services              │  │
│  │  1. emailService       - Gmail API integration       │  │
│  │  2. visionService      - Claude Vision API           │  │
│  │  3. scoringService     - Stats & ranking engine      │  │
│  │  4. eventService       - Season/tournament matching  │  │
│  │  5. playerService      - Fuzzy name matching         │  │
│  │  6. configService      - Configuration loader        │  │
│  │  7. pointsService      - Points calculation          │  │
│  │  8. databaseService    - Supabase CRUD operations    │  │
│  │  9. storageService     - Supabase Storage uploads    │  │
│  │                                                        │  │
│  │  [src/services/gamification/] - PULP System          │  │
│  │  10. pulpService       - Balance & transactions      │  │
│  │  11. bettingService    - Place/lock/resolve bets     │  │
│  │  12. challengeService  - Issue/accept/resolve        │  │
│  │  13. advantageService  - Purchase/track/expire       │  │
│  │  14. index.js          - Master orchestrator         │  │
│  │                          (gamificationService)       │  │
│  │                                                        │  │
│  │  [src/services/] - Standalone Services               │  │
│  │  - podcastService.js   - Episode generation          │  │
│  │  - supabase.js         - Supabase client             │  │
│  │  - api.js              - Frontend API helpers        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         SUPABASE (PostgreSQL + Auth + Storage)               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [EXISTING TABLES - Extended]                               │
│  • registered_players  + pulp_balance, unique_courses,      │
│                          participation_streak, last_round,  │
│                          total_rounds_this_season,          │
│                          last_interaction_week,             │
│                          challenges_declined                │
│  • events              + betting_lock_time                  │
│  • rounds              (no changes)                         │
│  • player_rounds       (no changes)                         │
│  • courses             (no changes)                         │
│  • points_systems      (no changes)                         │
│                                                              │
│  [NEW TABLES - PULP Economy]                                │
│  • bets                    - Structured betting data        │
│  • challenges              - Head-to-head challenges        │
│  • pulp_transactions       - Transaction log (audit trail)  │
│  • advantage_catalog       - Purchasable advantages         │
│                                                              │
│  [AUTH]                                                     │
│  • Supabase Auth (email/password)                           │
│                                                              │
│  [STORAGE]                                                  │
│  • Scorecard images (existing)                              │
│  • Player avatars (new)                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Navigation Structure

### Overview: 9 Pages + 2 Modals

**Page Structure:**
- 5 Bottom Navigation Pages (always visible)
- 2 Profile Dropdown Pages
- 1 Admin Dropdown Page (password-protected on access)
- 1 Login Page

**Modal Structure:**
- Admin Betting Controls (modal from admin dropdown, visible to all)
- Process Scorecards (modal from admin dropdown, visible to all)

---

### Bottom Navigation (5 Pages)

**1. Leaderboard**
- **Purpose**: Display traditional game performance stats ONLY (NO PULP rankings)
- **Event Selector**: Dropdown with all seasons/tournaments (defaults to current season)
- **Content**:
  - **Podium Display**: Visual top 3 (gold/silver/bronze)
  - **Leaderboard Table**: Players ranked 4+
    - Expandable rows (click to see detailed stats, accordion behavior)
    - Shows: Rank, Player Name, Points (with rounds count in small text), Birdies, Best Score
    - Expanded view: Wins, Podiums, Avg Points/Round, Birdies, Eagles, Aces
  - Sortable columns (player name, points, birdies)
  - Mobile-responsive (cards on mobile, table on desktop)
- **Note**: PULP content is intentionally separated to Betting page

**2. Rounds**
- **Purpose**: View round history and scorecard details
- **Content**:
  - Chronological list of all rounds
  - Click round → modal with full scorecard viewer
  - Player stats table (points, aces, birdies per round)

**3. Podcast**
- **Purpose**: Latest AI-generated podcast episode
- **Content**:
  - Audio player for current episode
  - Episode description
  - Highlights from recent rounds

**4. Activity**
- **Purpose**: Personal and group notifications
- **Content**:
  - **Two tabs:**
    - **Individual Feed**: Personal notifications (challenges issued to you, bet results)
    - **Community Feed**: Group-wide notifications (new rounds, podcast episodes)
- **Note**: Notification bell in header navigates directly to Activity page (Individual tab)

**5. Betting**
- **Purpose**: PULP economy hub - all PULP-related interactions in one place
- **Layout**: Accordion pattern (expand one section at a time)
- **Content**:
  - **PULP Balance** prominently displayed at top (animated counter)
  - **Section 1 - Predictions**:
    - Predict top 3 finishers in exact order for **next round**
    - Info card explains "Betting on: Next Round" (no round selection)
    - Wager amount (20 to balance)
    - Betting lock indicator (shows if locked)
  - **Section 2 - Challenges**:
    - Challenge higher-ranked player for **next round**
    - Info card explains "Challenging for: Next Round" (no round selection)
    - Two tabs: Issue Challenge | Respond to Challenges
    - Wager amount (20 to min of both balances)
    - Pending challenges show challenger name, wager, with Accept/Reject buttons
  - **Section 3 - Buy Advantages**: Select and purchase advantages (expire same day at 11:59 PM)
- **Note**: First-time access triggers PULP economy tutorial
- **Next Round Logic**: Bets and challenges resolve when next scorecard is processed (roundId: null)

---

### Guest Login System

**Purpose**: Allow anonymous users to browse app content without creating an account

**Access:**
- Login page features "Continue as Guest" button below email/password form
- Session-based guest mode using sessionStorage ('guestMode' flag)
- No Supabase authentication required

**Guest Capabilities:**
- ✅ View Leaderboard (all events, expandable rows)
- ✅ View Rounds (scorecard viewer, player stats)
- ✅ Listen to Podcast
- ✅ View Community Activity feed

**Guest Restrictions:**
- ❌ Top nav: ProfileDropdown, NotificationBell, AdminDropdown completely hidden
- ❌ Bottom nav: Betting tab grayed out (opacity-50 + pointer-events-none)
- ❌ Activity page: "Your Activity" tab disabled (only Community tab accessible)
- ❌ Blocked routes: /betting, /admin/*, /dashboard (auto-redirects to /leaderboard)

**Guest UI:**
- Shows "Guest" badge in header
- "Login" button next to Guest badge for conversion to registered player
- Disabled features show tooltips on hover explaining login requirement
- Route protection via useEffect in AppLayout component

**Technical Implementation:**
- sessionStorage used for guest state (not Supabase)
- `useAuth` hook exposes `isGuest` boolean
- `continueAsGuest()` function sets guest mode
- `signOut()` function clears guest mode when converting to registered player

---

### Header (Sticky, Always Visible)

**Left Side:**
- ParSaveables logo + title

**Right Side (3 Icons):**

**1. 🔔 Notifications** (visible to all users)
- Dropdown showing 5 most recent notifications with icons and timestamps
- Shows activity type icons (trophy, swords, trending up)
- Relative timestamps ("2h ago", "Just now")
- "View All Activities" link → Navigate to Activity page
- Badge shows unread count

**2. 🔧 Admin** (visible to all users, access control on click)
- **Control Center** (page): Password-protected CRUD interface with 5 tabs:
  - **Tournaments**: Create/edit/delete seasons and tournaments
  - **Players**: Add/modify players, soft delete (set inactive)
  - **Courses**: Manage courses with tier/multiplier system
  - **Events**: Add/remove players from tournaments and seasons
  - **Rules**: Configure scoring rules, bonuses, and point systems
  - Password stored in VITE_CONTROL_CENTER_PASSWORD environment variable
- **Betting Controls** (modal): Set betting_lock_time, delay, cancel betting window
- **Process Scorecards** (modal): One-click trigger to process all unprocessed scorecards

**3. 👤 Profile** (visible to all users)
- **Dashboard** (page): Two tabs (Points stats | PULP stats - PULP balance shown here)
- **About** (page): Project description + 2 buttons (How Points Work | How PULPs Work)
- **Logout**

---

### Profile Dropdown Pages (2 Pages)

**6. Dashboard** (accessed via Profile dropdown → Dashboard)
- **Event Selector**: Dropdown with all seasons/tournaments + "All Time" option (defaults to current season)
- **Stats Tab** (formerly Points Tab):
  - **Main Stats (4 cards)**: Total Points, Rounds Played, Wins, Podiums (Top 3)
  - **Performance Card**: Avg Points/Round, Avg Rank/Round, Win Rate %
  - **Scoring Card**: Birdies, Eagles, Aces, Courses Played
  - **Score Range Card**: Best Round, Worst Round
  - Stats update based on selected event/All Time
- **PULPs Tab**:
  - **PULP Balance** prominently displayed (animated counter)
  - Earned this season, spent, transaction history
  - Bet history, challenge history, advantages purchased
  - **Note**: First-time access triggers PULP economy tutorial

**7. About** (accessed via Profile dropdown → About)
- Project description explaining ParSaveables
- **Button 1**: "How Points Work" → Explains custom events, points systems, tournaments
- **Button 2**: "How PULPs Work" → Explains PULP economy, earning, spending, DRS, challenges

---

### Admin Dropdown (1 Page + 2 Modals, Visible to All)

**8. Admin Control Center** (accessed via Admin dropdown → Control Center)
- **Purpose**: Full CRUD operations for system configuration
- **Access Control**: Password-protected modal on page load (password: VITE_CONTROL_CENTER_PASSWORD)
- **Session Auth**: Uses sessionStorage ('controlCenterAuth') - persists across page refreshes
- **Layout**: Single page with 5 tabs

**Tab 1: Tournaments**
- View all seasons/tournaments with status and type badges
- Create new tournaments (name, start/end dates, type: season/tournament, status: upcoming/active/completed)
- Edit existing tournaments
- Delete tournaments (with confirmation dialog)
- Uses `events` table

**Tab 2: Players**
- View all registered players with PULP balances and join dates
- Add new players (name, email, optional user_id link for auth integration)
- Edit player details (name, email)
- Soft delete (sets status='inactive', preserves historical data)
- Uses `registered_players` table

**Tab 3: Courses**
- Manage disc golf courses with difficulty tiers (1: Beginner, 2: Intermediate, 3: Advanced)
- Auto-sets multipliers based on tier (1.0x, 1.5x, 2.0x)
- Active/inactive status (inactive courses don't appear in dropdowns)
- Prevents deletion of courses referenced by existing rounds
- Uses `courses` table

**Tab 4: Events**
- Select any event/tournament to manage participants
- Add players to events via dropdown (filtered to show only non-participants)
- Remove players from events
- Shows participant count, join dates, and PULP balances
- Uses `event_players` table

**Tab 5: Rules & Points System**
- Select points system to configure (Season 2025, Portlandia 2025, etc.)
- Edit placement points (1st, 2nd, 3rd, default) with add/remove rank buttons
- Set performance bonuses (birdie, eagle, ace points)
- Configure tie-breaking rules (enabled/disabled, method: average/split)
- Toggle course difficulty multipliers (enabled/disabled, source: course_tier/manual)
- Save changes with success/error feedback
- Uses `points_systems` table (config JSONB field)

**Technical Implementation:**
- All CRUD operations use Supabase directly (no separate API layer)
- Comprehensive validation and error handling
- Consistent UI patterns (Dialog, Tabs, Select, Input, Badge, Card from Shadcn/ui)
- Real-time updates after each operation
- 1,750+ lines of production code across 6 files

---

### Modals (2)

**Betting Controls Modal** (accessed via Admin dropdown → Betting Controls)
- **Purpose**: Manage betting window timing for current event
- **Access Control**: Visible to all users in dropdown
- **Content**:
  - Set betting_lock_time (date + time picker)
  - [Delay Lock] button (extend lock time by X minutes)
  - [Cancel Betting] button (cancel all bets for current round)
  - Current lock time display

**Process Scorecards Modal** (accessed via Admin dropdown → Process Scorecards)
- **Purpose**: One-click trigger to process all unprocessed scorecards from Gmail
- **Access Control**: Visible to all users in dropdown
- **Content**:
  - [Process Now] button
  - Processing status indicator
  - Results display (success/failures)
  - Manual refresh button

---

### First-Time User Experience

**Two Separate Tutorials:**

**1. Core App Tutorial** (triggered on first signup/login)
- Welcome to ParSaveables
- How the points system works (events, seasons, tournaments)
- Navigation overview (bottom nav, dropdowns)
- How to view leaderboards, rounds, and podcast
- How scorecard processing works

**2. PULP Economy Tutorial** (triggered on first access to Betting page OR Dashboard PULPs tab)
- What are PULPs and why they exist
- How to earn PULPs (participation, DRS, streaks, beat higher-ranked)
- How to spend PULPs (betting, challenges, advantages)
- Where to view PULP balance (Betting page, Dashboard PULPs tab)
- Betting predictions, challenges, and advantages shop overview

**Note**: Tutorial design and implementation details to be decided later

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 18 + Vite | Fast dev, familiar, component model |
| **Routing** | React Router v6 | Standard SPA routing |
| **Styling** | Tailwind CSS | Utility-first, rapid development |
| **UI Components** | Shadcn/ui | Copy-paste components, Radix UI primitives |
| **State** | Zustand | Lightweight (vs Redux), perfect for this scale |
| **Animations** | Framer Motion | Confetti, PULP counters, page transitions |
| **Auth** | Supabase Auth | Built-in, free tier, email/password |
| **Backend** | Vercel Serverless Functions | Existing, proven, free tier |
| **Database** | Supabase PostgreSQL | Existing, free tier, RLS policies |
| **Storage** | Supabase Storage | Player avatars, scorecard images |
| **AI** | Claude Vision API (Anthropic) | Scorecard parsing |
| **Podcast** | ElevenLabs TTS | Voice generation (existing) |
| **Deployment** | Vercel | Auto-deploy from Git, free tier |

**Monthly Cost Estimate:** $3-5 (Claude API only)

---

## Testing Framework

### Overview
ParSaveables v2 uses **Vitest** + **React Testing Library** for comprehensive unit and component testing.

### Tech Stack
| Tool | Purpose |
|------|---------|
| **Vitest** | Test runner (Vite-native, faster than Jest) |
| **React Testing Library** | Component testing (user-centric) |
| **@testing-library/jest-dom** | DOM matchers (toBeInTheDocument, etc.) |
| **@testing-library/user-event** | User interaction simulation |
| **Happy DOM** | Fast DOM implementation for tests |
| **@vitest/ui** | Visual test runner |
| **@vitest/coverage-v8** | Code coverage reporting |

### Test Commands
```bash
npm test                  # Run all tests
npm test -- --watch       # Watch mode
npm run test:ui           # Visual test runner
npm run test:coverage     # Generate coverage report
```

### Test Structure
```
src/
├── test/
│   ├── setup.js              # Global test configuration
│   ├── testUtils.jsx         # Shared utilities and mocks
│   └── README.md             # Testing documentation
├── utils/
│   ├── playerUtils.js
│   ├── playerUtils.test.js
│   └── seasonUtils.test.js
├── components/
│   └── leaderboard/
│       ├── PodiumDisplay.jsx
│       └── PodiumDisplay.test.jsx
└── services/
    ├── api.js
    ├── api.test.js
    └── gamification/
        ├── advantageService.js
        ├── advantageService.test.js
        ├── bettingService.js
        ├── bettingService.test.js
        ├── challengeService.js
        └── challengeService.test.js
```

### What We Test
1. **Utility Functions**: `playerUtils`, `seasonUtils` - pure logic, transformations
2. **React Components**: `PodiumDisplay`, `LeaderboardTable` - rendering, user interactions
3. **API Services**: `eventAPI`, `playerAPI` - data fetching, aggregations
4. **PULP Services**: Betting, challenges, advantages - business logic
5. **Integration**: Scorecard processing workflow, season rollover

### Coverage Goals
- **Critical paths** (auth, scoring, PULP): 90%+
- **Utilities**: 80%+
- **Components**: 70%+
- **Overall**: 75%+

### Mocking Strategy
- **Supabase**: Mocked via `createMockSupabaseClient()` utility
- **React Router**: Wrapped via `renderWithRouter()` utility
- **Environment Variables**: Stubbed in `setup.js`
- **External APIs**: Claude Vision, ElevenLabs mocked in integration tests

### Example Tests

**Utilities & API:**
- ✅ `playerUtils.test.js` - Bird emoji transformation
- ✅ `seasonUtils.test.js` - Season detection and selection
- ✅ `api.test.js` - Event fetching, leaderboard aggregation, top 10 scoring

**Components:**
- ✅ `PodiumDisplay.test.jsx` - Podium rendering, expansion, accordion behavior

**PULP Transaction Services:**
- ✅ `advantageService.test.js` - Purchase validation, one-per-type limit, expiration
- ✅ `bettingService.test.js` - Bet placement, wager deduction, payout calculations (2x perfect, 1x partial)
- ✅ `challengeService.test.js` - Challenge issuance, acceptance/rejection, resolution (2x payout to winner)

---

## Database Schema

### Schema Changes (Migrations)

#### Extend `registered_players`
```sql
-- Note: Comprehensive extension completed in migration 006
-- See: supabase/migrations/006_pulp_economy_finalized.sql
-- Key additions:
-- - pulp_balance (default 40)
-- - unique_courses_played (JSONB array)
-- - participation_streak (INTEGER)
-- - last_round_date (DATE)
-- - total_rounds_this_season (INTEGER)
-- - last_interaction_week (INTEGER)
-- - challenges_declined (INTEGER)
```

#### Extend `events`
```sql
ALTER TABLE events
ADD COLUMN betting_status TEXT DEFAULT 'open';
-- Values: 'open', 'locked', 'resolved'
```

#### Extend `rounds`
```sql
ALTER TABLE rounds
ADD COLUMN bets JSONB DEFAULT '[]',
ADD COLUMN head_to_head_challenge JSONB DEFAULT '{}',
ADD COLUMN advantages_used JSONB DEFAULT '{}';

-- bets format:
-- [{
--   player_id: 1,
--   predictions: { winner: "Dave", top_3: [...], most_birdies: "Sue", any_ace: true },
--   pulps_wagered: 20,
--   pulps_won: 40,
--   submitted_at: "2025-01-15T10:00:00Z"
-- }]

-- head_to_head_challenge format:
-- {
--   challenger_id: 1,
--   challenged_id: 2,
--   pulps_wagered_by_challenger: 150,
--   pulps_wagered_by_challenged: 150,
--   wager_type: "all",  // or "half"
--   status: "accepted",  // pending, declined, resolved
--   winner_id: null,
--   issued_at: "2025-01-20T10:00:00Z"
-- }

-- advantages_used format:
-- {
--   "player_id_1": [{ type: "mulligan", hole: 7, timestamp: "..." }],
--   "player_id_2": [{ type: "anti_mulligan", target_player_id: 1, hole: 12 }]
-- }
```

#### New Table: `advantage_catalog`
```sql
CREATE TABLE advantage_catalog (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  pulp_cost INTEGER NOT NULL,
  icon TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed data (finalized prices and types):
INSERT INTO advantage_catalog (key, name, description, pulp_cost, icon) VALUES
('mulligan', 'Mulligan', 'Extra mulligan for the round', 120, '🔄'),
('anti_mulligan', 'Anti-Mulligan', 'Force any player to re-shoot once', 200, '⛔'),
('cancel', 'Cancel', 'Cancel the last mulligan or anti-mulligan used', 200, '❌'),
('bag_trump', 'Bag Trump', 'Change bag-carry decision for one hole', 100, '🎒'),
('shotgun_buddy', 'Shotgun Buddy', 'Make someone shotgun a beer with you once', 100, '🍺');
```

---

## Backend Services

### Core Services (Keep - No Changes)

Located in `src/services/core/`:

1. **emailService.js** (478 lines) - Gmail API integration
2. **visionService.js** (214 lines) - Claude Vision API
3. **scoringService.js** (229 lines) - Stats & ranking engine
4. **eventService.js** (82 lines) - Season/tournament assignment
5. **playerService.js** (250 lines) - Fuzzy name matching
6. **configService.js** (164 lines) - Config loader
7. **pointsService.js** (167 lines) - Points calculation
8. **databaseService.js** (227 lines) - Supabase CRUD

### PULP Services (4 Services + Master Orchestrator) ✅ IMPLEMENTED

Located in `src/services/gamification/`:

**Structure:**
```
src/services/gamification/
├── pulpService.js        - Balance operations & transactions
├── bettingService.js     - Place/lock/resolve bets
├── challengeService.js   - Issue/accept/reject/resolve challenges
├── advantageService.js   - Purchase/track expiry/record usage
└── index.js              - Master orchestrator (gamificationService)
```

**Implementation Status:** ✅ Complete (~750 lines total)
- All 4 sub-services fully implemented
- Master orchestrator processRoundGamification() complete
- Weekly interaction bonus logic implemented
- Integrated into processScorecard workflow

### pulpService.js (~150 lines)

```javascript
/**
 * PULP Management Service
 * Handles PULP balance operations and transaction logging
 */

// Balance operations
export async function getPulpBalance(playerId) { ... }
export async function addPulps(playerId, amount, transactionType, metadata) { ... }
export async function deductPulps(playerId, amount, transactionType, metadata) { ... }
export async function getPulpLeaderboard() { ... }

// Transaction logging (audit trail)
export async function logTransaction(playerId, amount, transactionType, metadata) { ... }
export async function getPlayerTransactions(playerId, limit = 50) { ... }
```

### bettingService.js (~150 lines)

```javascript
/**
 * Betting Service
 * Handles bet placement, locking, and resolution
 */

export async function placeBet(playerId, eventId, predictions, pulpsWagered) {
  // Validate betting_status is 'open'
  // Validate PULP balance
  // Deduct pulps_wagered from balance
  // Store bet in bets table
}

export async function lockBetting(eventId) {
  // Update events.betting_lock_time to NOW
}

export async function resolveBets(roundId, actualResults) {
  // Fetch all bets for this round
  // Compare predictions to actual results
  // Calculate payouts (2x perfect, 1x partial, 0x wrong)
  // Award PULPs to winners via pulpService.addPulps()
  // Mark bets as resolved
}

export async function calculateOdds(eventId) {
  // Based on last 5 rounds performance
  // Return probability rankings
}

export async function getBetsForEvent(eventId) { ... }
export async function getPlayerBets(playerId) { ... }
```

### challengeService.js (~150 lines)

```javascript
/**
 * Challenge Service
 * Handles head-to-head challenge creation, response, and resolution
 */

export async function issueChallenge(challengerId, challengedId, wagerAmount, eventId) {
  // Validate challenger is ranked lower than challengee (season leaderboard)
  // Validate both players have sufficient PULP balance
  // Wager amount must be >= 20 and <= min(both balances)
  // Create pending challenge in challenges table
  // Create notification for challenged player
}

export async function respondToChallenge(challengeId, accept) {
  // Update challenge status (accepted/rejected)
  // If rejected: Apply 50% cowardice tax to challengee via pulpService.deductPulps()
  // If accepted: Deduct wager_amount from both players
  // Challenge applies to immediate next round only
}

export async function resolveChallenge(roundId) {
  // Fetch active challenge for this round
  // Determine winner based on round placement (higher finisher wins)
  // Transfer both wagers to winner via pulpService.addPulps()
  // Mark challenge as resolved
  // Create notifications for both players
}

export async function getActiveChallenges(playerId) { ... }
export async function getChallengeHistory(playerId) { ... }
```

### advantageService.js (~100 lines)

```javascript
/**
 * Advantage Service
 * Handles advantage purchases and same-day expiry tracking
 */

export async function purchaseAdvantage(playerId, advantageKey) {
  // Fetch cost from advantage_catalog
  // Validate PULP balance
  // Validate player doesn't already own this type
  // Deduct cost via pulpService.deductPulps()
  // Add to registered_players.active_advantages JSONB
  // Set expiry to 11:59 PM same day
}

export async function useAdvantage(playerId, roundId, advantageKey, details) {
  // Mark advantage as used in active_advantages
  // Record in rounds.advantages_used JSONB
  // Remove from active_advantages
}

export async function expireAdvantages() {
  // Cron job: Remove advantages past 11:59 PM
  // Called daily at midnight
}

export async function getAvailableAdvantages() { ... }
export async function getPlayerAdvantages(playerId) { ... }
```

### index.js - Master Orchestrator (~200 lines)

```javascript
/**
 * PULP Economy Orchestrator
 * Master service that coordinates all PULP operations after round processing
 */

import * as pulpService from './pulpService.js';
import * as bettingService from './bettingService.js';
import * as challengeService from './challengeService.js';
import * as advantageService from './advantageService.js';

export async function processRoundGamification(roundId, roundData, allPlayers) {
  // Called after scorecard processing completes in /api/processScorecard

  // Step 1: Resolve head-to-head challenge (if exists)
  await challengeService.resolveChallenge(roundId);

  // Step 2: Resolve bets (2x perfect, 1x partial, 0x wrong)
  const actualResults = {
    winner: roundData.players[0].name,
    top3: roundData.players.slice(0, 3).map(p => p.name),
    mostBirdies: /* ... */,
    anyAce: /* ... */
  };
  await bettingService.resolveBets(roundId, actualResults);

  // Step 3: Award PULP earnings for ALL players
  for (const player of allPlayers) {
    let totalEarned = 0;

    // +10 round participation
    await pulpService.addPulps(player.id, 10, 'round_participation', { roundId });
    totalEarned += 10;

    // +20 streak bonus (if 4 consecutive weeks completed)
    if (player.participation_streak >= 4) {
      await pulpService.addPulps(player.id, 20, 'streak_bonus', { roundId });
      totalEarned += 20;
      // Reset streak counter to 0
    }

    // +5 per higher-ranked player beaten
    const higherRankedBeaten = /* calculate */;
    if (higherRankedBeaten > 0) {
      await pulpService.addPulps(player.id, higherRankedBeaten * 5, 'beat_higher_ranked', { count: higherRankedBeaten });
      totalEarned += higherRankedBeaten * 5;
    }

    // +2/4/6/8/10/12/14 DRS bonus (based on position outside podium)
    const position = player.position;
    if (position > 3) {
      const drsBonus = (position - 3) * 2;
      await pulpService.addPulps(player.id, drsBonus, 'drs_bonus', { position });
      totalEarned += drsBonus;
    }

    // +5 weekly interaction (if first PULP action this week)
    const currentWeek = /* calculate ISO week */;
    if (player.last_interaction_week !== currentWeek) {
      await pulpService.addPulps(player.id, 5, 'weekly_interaction', { week: currentWeek });
      totalEarned += 5;
      // Update last_interaction_week
    }
  }

  // Step 4: Update participation streak counters
  // Step 5: Calculate total_rounds_this_season
  // Step 6: Return summary of all PULP transactions

  return {
    challengeResolved: /* ... */,
    betsResolved: /* ... */,
    pulpsAwarded: /* ... */,
    totalTransactions: /* ... */
  };
}

// Re-export all sub-services for convenience
export { pulpService, bettingService, challengeService, advantageService };
```

---

## Frontend Structure ✅ IMPLEMENTED

```
parsaveables-v2/
├── src/
│   ├── pages/
│   │   ├── Login.jsx                    # ✅ Supabase Auth login
│   │   ├── Dashboard.jsx                # ✅ Personal stats: Points tab + PULPs tab
│   │   ├── About.jsx                    # ✅ Tutorials + What is ParSaveables
│   │   ├── Leaderboard.jsx              # ✅ Points rankings (bottom nav)
│   │   ├── Rounds.jsx                   # ✅ Round history (bottom nav)
│   │   ├── Podcast.jsx                  # Podcast player (bottom nav)
│   │   ├── Activity.jsx                 # ✅ Player feed + Community feed tabs
│   │   ├── Betting.jsx                  # ✅ Predictions + Challenges + Advantages
│   │   ├── NotFound.jsx                 # ✅ 404 page
│   │   └── admin/
│   │       ├── ControlCenter.jsx        # ✅ Admin dashboard
│   │       ├── BettingControls.jsx      # ✅ Betting lock management
│   │       └── ProcessScorecards.jsx    # ✅ Manual scorecard trigger
│   │
│   ├── components/
│   │   ├── ui/                          # ✅ Shadcn base components (11 total)
│   │   │   ├── button.jsx               # ✅ Button variants
│   │   │   ├── card.jsx                 # ✅ Card + Header/Content/Footer
│   │   │   ├── badge.jsx                # ✅ Badge variants
│   │   │   ├── dialog.jsx               # ✅ Modal dialog
│   │   │   ├── tabs.jsx                 # ✅ Tabs UI
│   │   │   ├── input.jsx                # ✅ Form input
│   │   │   ├── label.jsx                # ✅ Form label
│   │   │   ├── select.jsx               # ✅ Dropdown select
│   │   │   ├── accordion.jsx            # ✅ Accordion pattern
│   │   │   ├── progress.jsx             # ✅ Progress bar
│   │   │   └── dropdown-menu.jsx        # ✅ Dropdown menu (notifications)
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.jsx               # ✅ 3-icon design (Notifications, Admin, Profile)
│   │   │   ├── BottomNav.jsx            # ✅ 5-tab navigation
│   │   │   ├── AdminDropdown.jsx        # ✅ Admin menu dropdown
│   │   │   ├── ProfileDropdown.jsx      # ✅ Profile menu dropdown
│   │   │   ├── NotificationBell.jsx     # ✅ Notification dropdown with recent activity
│   │   │   ├── AppLayout.jsx            # ✅ Layout wrapper with auth
│   │   │   └── PodcastModal.jsx         # Podcast player (future)
│   │   │
│   │   ├── admin/
│   │   │   └── BettingControlsModal.jsx # ✅ Lock betting modal
│   │   │
│   │   ├── tutorial/
│   │   │   ├── Tutorial.jsx             # ✅ Tutorial modal component
│   │   │   └── tutorialData.js          # ✅ Core + PULP tutorial content
│   │   │
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardTable.jsx     # ✅ Sortable table with expandable rows
│   │   │   └── PodiumDisplay.jsx        # ✅ Top 3 visual
│   │   │
│   │   ├── betting/
│   │   │   ├── PredictionsSection.jsx   # ✅ Top 3 prediction (next round)
│   │   │   ├── ChallengesSection.jsx    # ✅ Issue/respond to challenges (next round)
│   │   │   └── AdvantagesSection.jsx    # ✅ Purchase advantages shop
│   │   │
│   │   └── rounds/
│   │       └── RoundCard.jsx            # ✅ Accordion round card
│   │
│   ├── hooks/
│   │   ├── useAuth.js                   # ✅ Supabase auth helpers
│   │   ├── useStore.js                  # Zustand global state (future)
│   │   ├── usePulps.js                  # PULP balance (future)
│   │   └── useNotifications.js          # Activity feed (future)
│   │
│   ├── utils/
│   │   └── seasonUtils.js               # ✅ Season detection (getCurrentSeasonYear, getCurrentEvent)
│   │
│   ├── services/
│   │   ├── supabase.js                  # ✅ Supabase client
│   │   ├── api.js                       # ✅ Frontend API helpers
│   │   ├── podcastService.js            # ✅ Podcast generation
│   │   ├── core/                        # ✅ 9 core services
│   │   │   ├── emailService.js
│   │   │   ├── visionService.js
│   │   │   ├── scoringService.js
│   │   │   ├── eventService.js
│   │   │   ├── playerService.js
│   │   │   ├── configService.js
│   │   │   ├── pointsService.js
│   │   │   ├── databaseService.js
│   │   │   └── storageService.js
│   │   └── gamification/                # ✅ PULP services
│   │       ├── index.js
│   │       ├── pulpService.js
│   │       ├── bettingService.js
│   │       ├── challengeService.js
│   │       └── advantageService.js
│   │
│   ├── styles/
│   │   ├── index.css                    # Tailwind imports
│   │   └── animations.css               # Custom CSS animations
│   │
│   ├── App.jsx                          # Root component
│   └── main.jsx                         # Entry point
│
├── public/
│   └── assets/
│       ├── logo.svg
│       └── sounds/
│           └── confetti.mp3
│
└── index.html
```

---

## Process Flow

### Complete Scorecard Processing Workflow

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: PRE-ROUND                                      │
│ Event Created → Betting Window Opens                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 1. Players Place Bets & Challenges (Via API)            │
│    Frontend → API Endpoints:                            │
│    • POST /api/pulp/placeBet                            │
│      - Predict top 3, wager 20-balance PULPs            │
│      - Deduct wager immediately from balance            │
│      - Store in bets table                              │
│    • POST /api/pulp/issueChallenge                      │
│      - Lower-ranked challenges higher-ranked            │
│      - Wager 20 to min(both balances)                   │
│      - Store in challenges table as 'pending'           │
│    • POST /api/pulp/respondToChallenge                  │
│      - Accept: Deduct wager from challengee             │
│      - Reject: Pay 50% cowardice tax                    │
│    • POST /api/pulp/purchaseAdvantage                   │
│      - Buy advantages (expire same day 11:59 PM)        │
│                                                          │
│    Timing: Days or hours before round                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Admin Sets Betting Lock Time                         │
│    Admin Dropdown → Betting Controls Modal:             │
│    • Admin enters round start time (e.g., 9:00 AM)      │
│    • Modal auto-suggests lock time (9:15 AM)            │
│    • Admin clicks "Lock Betting" button                 │
│    • POST /api/pulp/setBettingLockTime                  │
│      - Sets events.betting_lock_time to 9:15 AM         │
│    • If round delayed, admin can click "Delay Lock"     │
│      - Extends lock time by 15 mins                     │
│                                                          │
│    Timing: Before round starts                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Betting Locks Automatically                          │
│    • System locks betting at scheduled time (9:15 AM)   │
│    • Updates all bets to status='locked'                │
│    • Prevents new bets/challenges                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Players Play Disc Golf Round                         │
│    🏌️ Physical round happens                            │
│    📧 Player emails UDisc screenshot to Gmail           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: POST-ROUND (ONLY Trigger)                      │
│ Admin Dropdown → Process Scorecards Modal                │
│ • Admin clicks [Process Now] button                     │
│ • This is the ONLY way to trigger processing            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Scorecard Processing API Call                        │
│    POST /api/processScorecard                           │
│    12-Step Core Workflow (Existing V1 System):          │
│    ├─ Step 1-2:  Email polling + image extraction       │
│    ├─ Step 3-4:  Claude Vision API + validation         │
│    ├─ Step 5-6:  Stats calculation + ranking            │
│    ├─ Step 7-8:  Event assignment + player matching     │
│    ├─ Step 9-10: Config load + points calculation       │
│    └─ Step 11-12: Database insert + notification email  │
│                                                          │
│    Result: Round and player_rounds created in database  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. PULP Economy Processing (NEW)                        │
│    gamificationService.processRoundGamification(roundId)│
│                                                          │
│    ┌───────────────────────────────────────────────┐   │
│    │ Step 1: Resolve Head-to-Head Challenge        │   │
│    │ • Fetch active challenge for this round       │   │
│    │ • Compare challenger vs challengee scores     │   │
│    │ • Higher finisher wins both wagers            │   │
│    │ • pulpService.addPulps(winner, total_wager)   │   │
│    │ • Update challenges.status = 'resolved'       │   │
│    │ • Create win/loss notifications               │   │
│    └───────────────────────────────────────────────┘   │
│                                                          │
│    ┌───────────────────────────────────────────────┐   │
│    │ Step 2: Resolve Bets                          │   │
│    │ • Fetch all locked bets for this event        │   │
│    │ • Compare predictions to actual top 3         │   │
│    │ • Perfect match (right 3, right order):       │   │
│    │   → pulpService.addPulps(player, wager * 2)   │   │
│    │ • Partial match (right 3, wrong order):       │   │
│    │   → pulpService.addPulps(player, wager * 1)   │   │
│    │ • No match: No payout (wager already lost)    │   │
│    │ • Update bets.status and payout_amount        │   │
│    │ • Create win/loss notifications               │   │
│    └───────────────────────────────────────────────┘   │
│                                                          │
│    ┌───────────────────────────────────────────────┐   │
│    │ Step 3: Award Participation PULPs (ALL)       │   │
│    │ For each player in round:                     │   │
│    │ • +10 round participation (everyone)          │   │
│    │ • +20 streak bonus (if 4 consecutive weeks)   │   │
│    │ • +5 per higher-ranked player beaten          │   │
│    │ • +2/4/6/8/10/12/14 DRS (position-based)      │   │
│    │ • +5 weekly interaction (first action)        │   │
│    │ pulpService.addPulps() for each type          │   │
│    └───────────────────────────────────────────────┘   │
│                                                          │
│    ┌───────────────────────────────────────────────┐   │
│    │ Step 4: Update Player Counters                │   │
│    │ • participation_streak (increment or reset)   │   │
│    │ • total_rounds_this_season (increment)        │   │
│    │ • last_round_date (update to today)           │   │
│    │ • last_interaction_week (ISO week number)     │   │
│    └───────────────────────────────────────────────┘   │
│                                                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Database State After Processing                      │
│    ✅ rounds + player_rounds inserted (points system)   │
│    ✅ All PULP balances updated                         │
│    ✅ Challenges marked 'resolved' with winner_id       │
│    ✅ Bets marked with status + payout_amount           │
│    ✅ pulp_transactions logged (audit trail)            │
│    ✅ Participation counters updated                    │
│    ✅ Notifications queued                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 8. Frontend Updates (User Sees Changes)                 │
│    • Leaderboard: Points rankings refresh               │
│    • Betting page: PULP balance updates                 │
│    • Dashboard PULPs tab: Transaction history refreshes │
│    • Activity feed: New notifications appear            │
│    • Animations:                                        │
│      - Confetti for bet winners                         │
│      - PULP counter animations (+10, +20, etc.)         │
│      - Challenge result modals                          │
│    • Notification badge count increments                │
└─────────────────────────────────────────────────────────┘
```

---

## PULP Economy Design

**Philosophy:** Equity-focused secondary economy that rewards participation and consistency over raw performance. PULPs (ParSaveables Ultimate Loyalty Points) complement the traditional points system, keeping all skill levels engaged.

### Economy Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Starting Balance** | 40 PULPs | Enough for 2 bets, but requires 4-6 weeks to afford advantages (scarcity by design) |
| **Maximum Balance** | 600 PULPs | Forces strategic spending, prevents hoarding |
| **Season Duration** | Jan 1 - Oct 31 (~40 rounds) | Aligns with disc golf season |
| **Season Reset** | All balances → 40 on Jan 1 | Fresh start each year |
| **Economy Type** | Non-zero-sum | PULPs can be created (earning) and destroyed (betting losses) |

### Earning Mechanisms

| Mechanism | Amount | Trigger | Notes |
|-----------|--------|---------|-------|
| **Round Participation** | +10 | Every round played | Base reward, ensures everyone earns |
| **Streak Bonus** | +20 | Every 4 consecutive weeks | Counter resets to 0 after 4 weeks or miss |
| **Beat Higher-Ranked** | +5 per player | Beat players ranked higher on season leaderboard | Scalable: Beat 5 higher-ranked = +25 PULPs |
| **DRS (Drag Reduction System)** | +2 to +14+ | Based on finishing position outside podium | 4th: +2, 5th: +4, 6th: +6, 7th: +8, 8th: +10, 9th: +12, 10th: +14, etc (uncapped) |
| **Weekly Interaction** | +5 | First PULP action each week | Any bet, challenge, or advantage purchase counts |

**Example Earnings (Mid-Pack Player, 6th place):**
- Participation: +10
- DRS (6th place): +6
- Beat higher-ranked (3 players): +15
- Weekly interaction: +5
- **Total: 36 PULPs per round**

### Betting System

**Prediction Type:** Top 3 finishers in exact order

**Wager Rules:**
- Minimum: 20 PULPs
- Maximum: Player's current balance
- Blind betting: Bets placed before round, revealed after

**Betting Window:**
- Opens: Days before round (when round is created)
- Closes: 15 minutes after scheduled round start time
- **Timer Display:** Animated countdown showing hours/minutes until lock on Betting page
- **Locked State:** Pulsating "Betting Locked / Round in progress" message after lock time
- **Admin Controls:** Set, extend (15 min), or cancel lock via Betting Controls page
- **Auto-Reset:** Lock automatically clears when scorecard is processed for locked round

**Payouts (Non-Zero-Sum):**
| Outcome | Payout | Notes |
|---------|--------|-------|
| Perfect prediction (right 3, right order) | 2x wager | e.g., Bet 20 → Win 40 |
| Right 3 players, wrong order | 1x wager | Break even |
| Any other result | Lose wager | PULPs disappear from economy |

**Multiple winners:** Each correct bettor gets their own payout independently

### Challenge System

**Eligibility:**
- Only lower-ranked players can challenge higher-ranked (season leaderboard)
- No cooldown (can challenge repeatedly)

**Wager Rules:**
- Minimum: 20 PULPs
- Maximum: min(challenger balance, challengee balance)
- Both players wager equal amounts

**Challenge Flow:**
1. Challenger issues challenge (visible, not blind)
2. Challengee accepts or rejects (before betting locks)
3. If rejected: Challengee pays 50% of challenged wager as cowardice tax
4. If accepted: Challenge resolves in immediate next round
5. Winner determined by round placement (higher finisher wins)
6. Winner takes both wagers

**Does NOT carry over** beyond immediate next round

### Advantages (Purchasable Power-Ups)

| Advantage | Cost | Effect | Constraints |
|-----------|------|--------|-------------|
| **Mulligan** | 120 PULPs | Extra mulligan for the round | Honor system |
| **Anti-Mulligan** | 200 PULPs | Force any player to re-shoot once | Honor system |
| **Cancel** | 200 PULPs | Cancel the last mulligan or anti-mulligan used | Defensive counter |
| **Bag Trump** | 100 PULPs | Change bag-carry decision for one hole | Extends existing house rule |
| **Shotgun Buddy** | 100 PULPs | Make someone shotgun a beer with you once | Extends existing house rule |

**Purchase Constraints:**
- Max 1 per type in inventory (max 5 total)
- Expire at 11:59 PM same day purchased
- Pressure to use same day is by design (group preference)

### Streak Counter Logic

**How it works:**
- Counter tracks consecutive weeks played
- Counter resets to 0 when:
  - Player completes 4 consecutive weeks (+20 PULPs awarded, counter → 0)
  - Player misses a week (counter → 0, no bonus)

**Examples:**
- Play 4 weeks → +20, reset → Play 4 more → +20, reset (Total: +40)
- Play 3 weeks, miss 1, play 4 weeks → +20 once (only the 4-streak counts)

### DRS (Drag Reduction System)

**Purpose:** Catch-up mechanism for lower-ranked players

**Formula:** Position outside podium determines bonus
- 4th place: +2 PULPs
- 5th place: +4 PULPs
- 6th place: +6 PULPs
- Pattern: +2 PULPs per position below 3rd

**No cap:** If 15 players show up, 15th gets +26 PULPs (by design, group size limits this)

### Economy Balance Analysis

**Inflation Sources (PULPs created):**
- Round participation: +10 per player
- Streaks, DRS, beat higher-ranked: +20-40 per player avg
- Betting wins: Variable (can create PULPs)

**Deflation Sinks (PULPs destroyed):**
- Betting losses: Disappear from economy
- Advantage purchases: Disappear from economy

**Target:** Slight net inflation (~10 PULPs per round created) to reward participation

---

## Security Model

### Authentication
- **Supabase Auth** with email/password
- Row-Level Security (RLS) policies on all tables
- Session tokens stored in httpOnly cookies
- Password reset via email

### Authorization
- Players can only modify their own data
- Admin role for bet locking, scorecard processing
- RLS ensures players can't manipulate PULP balances directly

### Data Validation
- All inputs sanitized on backend
- PULP transactions logged for audit trail
- Bet validation ensures sufficient balance before deduction
- Challenge validation enforces constraints

### API Security
- Vercel functions require authentication
- Rate limiting on Supabase (free tier: 500 requests/sec)
- CORS configured for production domain only

---

## Deployment

### Production Environment
- **Frontend:** Vercel (auto-deploy from `main` branch)
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase (hosted PostgreSQL)
- **Domain:** par-saveables.vercel.app

### Environment Variables
```
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Claude API
ANTHROPIC_API_KEY=xxx

# Gmail API
GMAIL_CLIENT_ID=xxx
GMAIL_CLIENT_SECRET=xxx
GMAIL_REFRESH_TOKEN=xxx

# ElevenLabs (Podcast)
ELEVENLABS_API_KEY=xxx
```

### Build Command
```bash
npm run build
```

### Deployment Steps
1. Push to `main` branch
2. Vercel auto-builds and deploys
3. Run database migrations via Supabase dashboard
4. Seed advantage_catalog
5. Test authentication flow
6. Verify PULP transactions work

---

## Performance Targets

- **Page Load:** <2 seconds
- **Scorecard Processing:** 5-10 seconds (existing)
- **Bet Placement:** <500ms
- **Challenge Resolution:** <500ms per round
- **PULP Balance Update:** <200ms

---

## Implementation Status

### ✅ Completed (Phase 1-4 + Enhancements)

1. ✅ Architecture approved & documented
2. ✅ React + Vite project setup
3. ✅ Shadcn/ui + Radix UI installed (11 components including dropdown-menu)
4. ✅ Database migrations applied (006 PULP economy)
5. ✅ Authentication system (Supabase Auth)
6. ✅ Core services restructured (src/services/core/)
7. ✅ gamificationService implemented (5 files, ~750 lines)
8. ✅ PULP API endpoints built (7 endpoints in src/api/pulp/)
9. ✅ Frontend pages built (9 pages + 3 admin pages)
10. ✅ Tutorial system (2 tutorials: Core + PULP)
11. ✅ Utility files (logger, retry, errors, config, seasonUtils)
12. ✅ Leaderboard page (event selector, podium, expandable table rows)
13. ✅ Rounds page (accordion, scorecard viewer)
14. ✅ Betting page (next round logic, 3 accordion sections)
15. ✅ Dashboard (event dropdown, expanded stats, Points + PULPs tabs)
16. ✅ Activity feed (Player + Community tabs)
17. ✅ Admin tools (ControlCenter, BettingControls, ProcessScorecards)
18. ✅ Season defaulting (auto-selects current season based on year)
19. ✅ Notification dropdown (5 recent activities with "View All" link)

### ⏳ Pending (Phase 5-6)

1. ⏳ End-to-end testing (scorecard processing + PULP economy)
2. ⏳ Podcast feature implementation
3. ⏳ Notification system (bell icon + real-time updates)
4. ⏳ Framer Motion animations (confetti, PULP counters)
5. ⏳ Design system pass (colors, branding, polish)
6. ⏳ Mobile testing & responsive refinements
7. ⏳ Performance optimization
8. ⏳ Production deployment

### 📊 Progress Summary

**Backend:** ~90% complete
- ✅ Core services (9 files)
- ✅ PULP services (5 files)
- ✅ API endpoints (7 PULP endpoints + 2 core)
- ✅ Season utilities (getCurrentSeasonYear, getCurrentEvent)
- ⏳ End-to-end testing needed

**Frontend:** ~92% complete
- ✅ All pages built (12 total) with season awareness
- ✅ All UI components (11 Shadcn components)
- ✅ Tutorial system
- ✅ Notification dropdown system
- ✅ Dashboard with comprehensive stats
- ✅ Leaderboard with expandable rows
- ✅ Next round betting logic
- ⏳ Podcast page pending
- ⏳ Design polish needed

**Database:** ✅ 100% complete
- ✅ All migrations applied
- ✅ PULP economy tables ready
- ✅ RLS policies configured

**UX Enhancements:** ✅ 100% complete
- ✅ Season defaulting (current year-based)
- ✅ Expandable player stats in leaderboard
- ✅ Next round betting (no future rounds needed)
- ✅ Notification dropdown with recent activity
- ✅ Event/All Time filtering on Dashboard

---

**End of Architecture Document**
