# ParSaveables 2.0 - System Architecture

**Last Updated:** 2025-12-31
**Version:** 2.0 (PULP Economy Edition)
**Status:** Backend & Frontend Complete - Season Aware - Guest Login - Admin Control Center Complete - Testing Phase

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
10. **Admin Control Center**: Password-protected CRUD interface for managing events, players, courses, and scoring rules

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
│  │  │ [Logo]                        [Bell] [Gear] [User] │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  │                                                        │  │
│  │  Notifications Dropdown (Bell):                       │  │
│  │  - Notification history (read + unread)               │  │
│  │  - Click to navigate to relevant page                │  │
│  │  - "View All History" → Activity page                │  │
│  │  - Visible to all users                               │  │
│  │                                                        │  │
│  │  Admin Dropdown (Gear):                               │  │
│  │  - Control Center (page, password-protected)          │  │
│  │  - Betting Controls (modal)                           │  │
│  │  - Process Scorecards (modal)                         │  │
│  │  - Visible to all, access control on click            │  │
│  │                                                        │  │
│  │  Profile Dropdown (User):                             │  │
│  │  - Dashboard (Points tab | PULPs tab)                │  │
│  │  - About (How Points Work | How PULPs Work)          │  │
│  │  - Logout                                             │  │
│  │  - Visible to all users                               │  │
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
│  │  - Betting Controls (modal, visible to all)           │  │
│  │  - Process Scorecards (modal, visible to all)         │  │
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
│  - registered_players  + pulp_balance, unique_courses,      │
│                          participation_streak, last_round,  │
│                          total_rounds_this_season,          │
│                          last_interaction_week,             │
│                          challenges_declined                │
│  - events              + betting_lock_time                  │
│  - rounds              (no changes)                         │
│  - player_rounds       (no changes)                         │
│  - courses             (no changes)                         │
│  - points_systems      (no changes)                         │
│                                                              │
│  [NEW TABLES - PULP Economy]                                │
│  - bets                    - Structured betting data        │
│  - challenges              - Head-to-head challenges        │
│  - pulp_transactions       - Transaction log (audit trail)  │
│  - advantage_catalog       - Purchasable advantages         │
│  - event_players           - Player-event junction table    │
│                                                              │
│  [AUTH]                                                     │
│  - Supabase Auth (email/password)                           │
│                                                              │
│  [STORAGE]                                                  │
│  - Scorecard images (existing)                              │
│  - Player avatars (new)                                     │
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
- View Leaderboard (all events, expandable rows)
- View Rounds (scorecard viewer, player stats)
- Listen to Podcast
- View Community Activity feed

**Guest Restrictions:**
- Top nav: ProfileDropdown, NotificationBell, AdminDropdown completely hidden
- Bottom nav: Betting tab grayed out (opacity-50 + pointer-events-none)
- Activity page: "Your Activity" tab disabled (only Community tab accessible)
- Blocked routes: /betting, /admin/*, /dashboard (auto-redirects to /leaderboard)

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

**1. Bell - Notifications** (visible to all users)
- Dropdown showing 5 most recent notifications with icons and timestamps
- Shows activity type icons (trophy, swords, trending up)
- Relative timestamps ("2h ago", "Just now")
- "View All Activities" link → Navigate to Activity page
- Badge shows unread count

**2. Gear - Admin** (visible to all users, access control on click)
- **Control Center** (page): Password-protected CRUD interface with 4 tabs:
  - **Events**: Create/edit/delete seasons and tournaments with player selection
  - **Players**: Add/modify players, soft delete (set inactive)
  - **Courses**: Manage courses with tier/multiplier system
  - **Rules**: Configure scoring rules, bonuses, and point systems
  - Password stored in VITE_CONTROL_CENTER_PASSWORD environment variable
- **Betting Controls** (modal): Set betting_lock_time, delay, cancel betting window
- **Process Scorecards** (modal): One-click trigger to process all unprocessed scorecards

**3. User - Profile** (visible to all users)
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
- **Layout**: Single page with 4 tabs

**Tab 1: Events**
- View all seasons/tournaments grouped by type (Seasons / Tournaments)
- Create new events with:
  - Name, start/end dates
  - Type (season/tournament)
  - Status (upcoming/active/completed)
  - Points system selection
  - **Player selection via checkboxes** - select which players participate
- Edit existing events (all fields including player assignments)
- Delete events (with confirmation dialog, blocked if has rounds or participants)
- Display shows player count with Users icon on event cards
- Year column auto-populated from start_date
- Uses `events` table + `event_players` junction table

**Tab 2: Players**
- View all registered players with PULP balances and join dates
- Add new players (name only - removed email/user_id references)
- Edit player details (name)
- Soft delete (sets status='inactive', preserves historical data)
- Shows all active players (status='active')
- Uses `registered_players` table

**Tab 3: Courses**
- Manage disc golf courses with difficulty tiers (1: Beginner, 2: Intermediate, 3: Advanced)
- Auto-sets multipliers based on tier (1.0x, 1.5x, 2.0x)
- Active/inactive status (inactive courses don't appear in dropdowns)
- Prevents deletion of courses referenced by existing rounds
- Uses `courses` table

**Tab 4: Rules & Points System**
- **Grouped dropdown** with categories: Seasons / Tournaments / Other
- Default selection to "Season 2025" on load
- Edit placement points (1st, 2nd, 3rd, default) with add/remove rank buttons
- Set performance bonuses (birdie, eagle, ace, most_birdies points)
- Configure tie-breaking rules (4-priority dropdown system with options: aces, eagles, birdies, earliest_birdie)
- Toggle course difficulty multipliers (enabled/disabled)
- Duplicate existing points system or create new with defaults
- Delete points system (blocked if referenced by events)
- Save changes with toast feedback
- Uses `points_systems` table (config JSONB field)

**Technical Implementation:**
- All CRUD operations use Supabase directly (no separate API layer)
- Comprehensive validation and error handling
- Consistent UI patterns (Dialog, Tabs, Select, Input, Badge, Card from Shadcn/ui)
- Real-time updates after each operation
- Standardized button sizes across all tabs (text-sm)

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
- `playerUtils.test.js` - Bird emoji transformation
- `seasonUtils.test.js` - Season detection and selection
- `api.test.js` - Event fetching, leaderboard aggregation, top 10 scoring

**Components:**
- `PodiumDisplay.test.jsx` - Podium rendering, expansion, accordion behavior

**PULP Transaction Services:**
- `advantageService.test.js` - Purchase validation, one-per-type limit, expiration
- `bettingService.test.js` - Bet placement, wager deduction, payout calculations (2x perfect, 1x partial)
- `challengeService.test.js` - Challenge issuance, acceptance/rejection, resolution (2x payout to winner)

---

## Database Schema

### Schema Changes (Migrations Applied)

**Migration 001-006: Core PULP Economy**
- Extended `registered_players` with PULP fields
- Extended `events` with betting_lock_time
- Created `bets`, `challenges`, `pulp_transactions`, `advantage_catalog` tables

**Migration 007: Podcast System**
- Added podcast-related tables and functions

**Migration 008: Standardize Events Columns**
- Standardized column naming in events table

**Migration 009: Create event_players Table**
```sql
CREATE TABLE IF NOT EXISTS event_players (
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES registered_players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (event_id, player_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_players_event_id ON event_players(event_id);
CREATE INDEX IF NOT EXISTS idx_event_players_player_id ON event_players(player_id);
```

**Migration 010: Add event_players Write Policies**
```sql
-- RLS Policies for event_players (access controlled by password-protected Control Center)
CREATE POLICY "Event players are viewable by everyone" ON event_players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert event players" ON event_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update event players" ON event_players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete event players" ON event_players FOR DELETE USING (true);
```

**Migration 011: Clear PULP Activity Data**
```sql
-- Reset activity feed and PULP-related data to clean state
DELETE FROM activity_feed;
DELETE FROM pulp_transactions;
UPDATE registered_players SET
  pulp_balance = 100,
  achievements = '[]'::jsonb,
  active_advantages = '[]'::jsonb,
  last_challenge_date = NULL;
```

### Complete Table Schema

#### event_players (NEW)
```sql
CREATE TABLE event_players (
  event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES registered_players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (event_id, player_id)
);
```

#### advantage_catalog
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
('mulligan', 'Mulligan', 'Extra mulligan for the round', 120, 'repeat'),
('anti_mulligan', 'Anti-Mulligan', 'Force any player to re-shoot once', 200, 'ban'),
('cancel', 'Cancel', 'Cancel the last mulligan or anti-mulligan used', 200, 'x'),
('bag_trump', 'Bag Trump', 'Change bag-carry decision for one hole', 100, 'backpack'),
('shotgun_buddy', 'Shotgun Buddy', 'Make someone shotgun a beer with you once', 100, 'beer');
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

### PULP Services (4 Services + Master Orchestrator)

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

**Implementation Status:** Complete (~750 lines total)
- All 4 sub-services fully implemented
- Master orchestrator processRoundGamification() complete
- Weekly interaction bonus logic implemented
- Integrated into processScorecard workflow

---

## Frontend Structure

```
parsaveables-v2/
├── src/
│   ├── pages/
│   │   ├── Login.jsx                    # Supabase Auth login
│   │   ├── Dashboard.jsx                # Personal stats: Points tab + PULPs tab
│   │   ├── About.jsx                    # Tutorials + What is ParSaveables
│   │   ├── Leaderboard.jsx              # Points rankings (bottom nav)
│   │   ├── Rounds.jsx                   # Round history (bottom nav)
│   │   ├── Podcast.jsx                  # Podcast player (bottom nav)
│   │   ├── Activity.jsx                 # Player feed + Community feed tabs
│   │   ├── Betting.jsx                  # Predictions + Challenges + Advantages
│   │   ├── NotFound.jsx                 # 404 page
│   │   └── admin/
│   │       ├── ControlCenter.jsx        # Admin dashboard with 4 tabs
│   │       ├── BettingControls.jsx      # Betting lock management
│   │       └── ProcessScorecards.jsx    # Manual scorecard trigger
│   │
│   ├── components/
│   │   ├── ui/                          # Shadcn base components (12 total)
│   │   │   ├── button.jsx
│   │   │   ├── card.jsx
│   │   │   ├── badge.jsx
│   │   │   ├── dialog.jsx
│   │   │   ├── tabs.jsx
│   │   │   ├── input.jsx
│   │   │   ├── label.jsx
│   │   │   ├── select.jsx
│   │   │   ├── accordion.jsx
│   │   │   ├── progress.jsx
│   │   │   ├── dropdown-menu.jsx
│   │   │   └── checkbox.jsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Header.jsx               # 3-icon design (Notifications, Admin, Profile)
│   │   │   ├── BottomNav.jsx            # 5-tab navigation
│   │   │   ├── AdminDropdown.jsx        # Admin menu dropdown
│   │   │   ├── ProfileDropdown.jsx      # Profile menu dropdown
│   │   │   ├── NotificationBell.jsx     # Notification dropdown with recent activity
│   │   │   ├── AppLayout.jsx            # Layout wrapper with auth
│   │   │   └── PageContainer.jsx        # Page content wrapper
│   │   │
│   │   ├── admin/                       # Control Center tab components
│   │   │   ├── EventsTab_new.jsx        # Events CRUD with player selection
│   │   │   ├── PlayersTab.jsx           # Players CRUD
│   │   │   ├── CoursesTab.jsx           # Courses CRUD
│   │   │   ├── RulesTab.jsx             # Points system configuration
│   │   │   ├── EventsTab.jsx            # Legacy events tab (deprecated)
│   │   │   └── BettingControlsModal.jsx # Lock betting modal
│   │   │
│   │   ├── tutorial/
│   │   │   ├── Tutorial.jsx             # Tutorial modal component
│   │   │   └── tutorialData.js          # Core + PULP tutorial content
│   │   │
│   │   ├── leaderboard/
│   │   │   ├── LeaderboardTable.jsx     # Sortable table with expandable rows
│   │   │   └── PodiumDisplay.jsx        # Top 3 visual
│   │   │
│   │   ├── betting/
│   │   │   ├── PredictionsSection.jsx   # Top 3 prediction (next round)
│   │   │   ├── ChallengesSection.jsx    # Issue/respond to challenges (next round)
│   │   │   └── AdvantagesSection.jsx    # Purchase advantages shop
│   │   │
│   │   └── rounds/
│   │       └── RoundCard.jsx            # Accordion round card
│   │
│   ├── hooks/
│   │   ├── useAuth.js                   # Supabase auth helpers + guest mode
│   │   ├── use-toast.js                 # Toast notification hook
│   │   └── useStore.js                  # Zustand global state (future)
│   │
│   ├── utils/
│   │   ├── seasonUtils.js               # Season detection (getCurrentSeasonYear, getCurrentEvent)
│   │   └── playerUtils.js               # Player data utilities
│   │
│   ├── services/
│   │   ├── supabase.js                  # Supabase client
│   │   ├── api.js                       # Frontend API helpers
│   │   ├── podcastService.js            # Podcast generation
│   │   ├── core/                        # 9 core services
│   │   └── gamification/                # PULP services
│   │
│   ├── styles/
│   │   ├── index.css                    # Tailwind imports
│   │   └── animations.css               # Custom CSS animations
│   │
│   ├── App.jsx                          # Root component
│   └── main.jsx                         # Entry point
│
├── supabase/
│   └── migrations/                      # 11 migration files (001-011)
│
├── public/
│   └── assets/
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
│    - POST /api/pulp/placeBet                            │
│    - POST /api/pulp/issueChallenge                      │
│    - POST /api/pulp/respondToChallenge                  │
│    - POST /api/pulp/purchaseAdvantage                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Admin Sets Betting Lock Time                         │
│    Admin Dropdown → Betting Controls                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Betting Locks Automatically                          │
│    - System locks betting at scheduled time             │
│    - Prevents new bets/challenges                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Players Play Disc Golf Round                         │
│    - Physical round happens                             │
│    - Player emails UDisc screenshot to Gmail            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ PHASE 2: POST-ROUND (ONLY Trigger)                      │
│ Admin Dropdown → Process Scorecards Modal                │
│ - Admin clicks [Process Now] button                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Scorecard Processing API Call                        │
│    POST /api/processScorecard                           │
│    12-Step Core Workflow                                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. PULP Economy Processing                              │
│    gamificationService.processRoundGamification()       │
│    - Resolve challenges                                 │
│    - Resolve bets                                       │
│    - Award participation PULPs                          │
│    - Update player counters                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Frontend Updates                                     │
│    - Leaderboard refreshes                              │
│    - PULP balances update                               │
│    - Activity feed shows new notifications              │
└─────────────────────────────────────────────────────────┘
```

---

## PULP Economy Design

**Philosophy:** Equity-focused secondary economy that rewards participation and consistency over raw performance. PULPs (ParSaveables Ultimate Loyalty Points) complement the traditional points system, keeping all skill levels engaged.

### Economy Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **Starting Balance** | 100 PULPs | Enough for several bets and one advantage |
| **Maximum Balance** | 600 PULPs | Forces strategic spending, prevents hoarding |
| **Season Duration** | Jan 1 - Oct 31 (~40 rounds) | Aligns with disc golf season |
| **Season Reset** | All balances → 100 on Jan 1 | Fresh start each year |
| **Economy Type** | Non-zero-sum | PULPs can be created (earning) and destroyed (betting losses) |

### Earning Mechanisms

| Mechanism | Amount | Trigger | Notes |
|-----------|--------|---------|-------|
| **Round Participation** | +10 | Every round played | Base reward, ensures everyone earns |
| **Streak Bonus** | +20 | Every 4 consecutive weeks | Counter resets to 0 after 4 weeks or miss |
| **Beat Higher-Ranked** | +5 per player | Beat players ranked higher on season leaderboard | Scalable: Beat 5 higher-ranked = +25 PULPs |
| **DRS (Drag Reduction System)** | +2 to +14+ | Based on finishing position outside podium | 4th: +2, 5th: +4, 6th: +6, etc. (uncapped) |
| **Weekly Interaction** | +5 | First PULP action each week | Any bet, challenge, or advantage purchase counts |

### Betting System

**Prediction Type:** Top 3 finishers in exact order

**Wager Rules:**
- Minimum: 20 PULPs
- Maximum: Player's current balance
- Blind betting: Bets placed before round, revealed after

**Payouts:**
| Outcome | Payout | Notes |
|---------|--------|-------|
| Perfect prediction (right 3, right order) | 2x wager | e.g., Bet 20 → Win 40 |
| Right 3 players, wrong order | 1x wager | Break even |
| Any other result | Lose wager | PULPs disappear from economy |

### Challenge System

**Eligibility:**
- Only lower-ranked players can challenge higher-ranked (season leaderboard)
- No cooldown (can challenge repeatedly)

**Wager Rules:**
- Minimum: 20 PULPs
- Maximum: min(challenger balance, challengee balance)
- Both players wager equal amounts

**Challenge Flow:**
1. Challenger issues challenge
2. Challengee accepts or rejects
3. If rejected: Challengee pays 50% cowardice tax
4. If accepted: Challenge resolves in next round
5. Winner takes both wagers

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
- Control Center protected by password (VITE_CONTROL_CENTER_PASSWORD)

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

# Admin Access
VITE_CONTROL_CENTER_PASSWORD=xxx
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

### Completed (Phase 1-5)

1. Architecture approved & documented
2. React + Vite project setup
3. Shadcn/ui + Radix UI installed (12 components including checkbox)
4. Database migrations applied (001-011)
5. Authentication system (Supabase Auth + Guest Login)
6. Core services restructured (src/services/core/)
7. gamificationService implemented (5 files, ~750 lines)
8. PULP API endpoints built (7 endpoints in api/pulp/)
9. Frontend pages built (9 pages + 3 admin pages)
10. Tutorial system (2 tutorials: Core + PULP)
11. Utility files (logger, retry, errors, config, seasonUtils)
12. Leaderboard page (event selector, podium, expandable table rows)
13. Rounds page (accordion, scorecard viewer)
14. Betting page (next round logic, active bet/challenge display)
15. Dashboard (event dropdown, expanded stats, Points + PULPs tabs)
16. Activity feed (Player + Community tabs)
17. Admin Control Center (4 tabs: Events, Players, Courses, Rules)
18. Season defaulting (auto-selects current season based on year)
19. Notification dropdown (5 recent activities with "View All" link)
20. Toast notification system (success/error feedback)
21. Betting timer & auto-lock system
22. Guest login system (read-only access)
23. Testing framework (Vitest + React Testing Library)
24. Event player management (junction table, checkboxes in event creation)

### Known Issues

1. **PULP Settlement**: Bets and challenges may not be resolving correctly after scorecard processing - needs debugging

### Pending

1. Fix PULP economy settlement
2. End-to-end testing
3. Podcast feature completion
4. Framer Motion animations polish
5. Mobile testing & responsive refinements
6. Production deployment

---

**End of Architecture Document**
