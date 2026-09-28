# ParSaveables v2 Development

@~/.claude/CLAUDE.md

## Framework Instructions

**IMPORTANT:** Follow the orchestrator workflow from `~/.claude/framework/agents/orchestrator.md` for all development tasks.

- Read orchestrator.md before starting features
- Use agents as specialized team members (spawn via Task tool)
- Run skills when orchestrator indicates
- Keep all documentation in plain language

## Project Overview

ParSaveables is a disc golf tournament and season tracking platform designed for friend groups and small leagues (10-20 players). The system automates scorecard processing using AI vision technology and transforms traditional scoring into an engaging social experience through gamification.

### Core Features
- **AI-Powered Scorecard Processing**: Players email UDisc screenshots → Claude Vision API extracts scores → automatic points calculation and leaderboard updates
- **Season-Aware System**: Automatically defaults to current season based on calendar year (2025 → Season 2025, 2026 → Season 2026)
- **Comprehensive Dashboard**: Event dropdown (All Time + seasons/tournaments), 14 detailed stats including win rate, avg points/round, scoring stats
- **Expandable Leaderboard**: Click players to see detailed stats (wins, podiums, avg points, birdies, eagles, aces)
- **PULPy Windows**: A player opens a 5-minute window; all PULP transactions (blessings, challenges, advantages) require an open window, and the next processed scorecard settles it
- **Blessings** (formerly "bets"): Predict the top 3 for the next round
- **Challenges**: Challenge higher-ranked players for the next round
- **Advantages Shop**: Spend PULPs on in-game advantages (Mulligan, Bag Trump, Shotgun Buddy)
- **Automated Podcast**: Monthly AI-generated podcast recapping highlights, rivalries, and drama
- **Notification Dropdown**: Shows 5 recent activities with icons, timestamps, and "View All" link
- **Admin Control Center**: Password-protected CRUD for events, players, courses, and points systems

### Design Philosophy
1. **Engagement-First**: Reward all skill levels to keep everyone playing and interacting
2. **Mobile-First**: Thumb-friendly UI, smooth animations, premium feel
3. **Cost-Effective**: Leverage free tiers (Vercel, Supabase, ElevenLabs) to stay under $5/month
4. **Data-Driven**: Advantages and economy rules stored in database for easy tuning

## Tech Stack
- Frontend: React 18 + Vite
- Backend: Vercel Serverless Functions (existing from v1)
- Database: Supabase PostgreSQL (extend existing schema)
- Auth: Supabase Auth (email/password)
- Styling: Tailwind CSS
- UI Components: Shadcn/ui
- Icons: Lucide React
- State: Zustand
- Animations: Framer Motion
- Dark Mode: next-themes

## UI Standards
@~/.claude/framework/references/ui-tools/beautiful-ui-setup.md

**Stack for this project:**
- **Shadcn/ui + Tailwind CSS** (golden stack - industry standard)
- **Framer Motion** (animations: confetti, PULP counters, page transitions)
- **Lucide React** (icons throughout the app)
- **Dark mode** with next-themes (system preference default)
- **Mobile-first** responsive design (primary use case is on phones)

**Component structure:**
```
src/components/
├── ui/              # Shadcn base components (12 total: button, card, dialog, tabs, input, label, select, accordion, progress, badge, dropdown-menu, checkbox)
├── layout/          # Header, BottomNav, NotificationBell (dropdown), AdminDropdown, ProfileDropdown
├── leaderboard/     # LeaderboardTable (expandable rows), PodiumDisplay
├── pulps/           # BlessingsSection, ChallengesSection, AdvantagesSection, PULPyWindowModal
├── betting/         # LEGACY — not imported anywhere; use pulps/
├── rounds/          # RoundCard (accordion)
├── tutorial/        # Tutorial modal, tutorialData
├── admin/           # EventsTab_new, PlayersTab, CoursesTab, RulesTab
└── shared/          # PulpCounter, Confetti, CelebrationModal, ErrorBoundary, OfflineDetector
```

**Design principles:**
- Use Shadcn components as base (don't reinvent the wheel)
- Tailwind classes only (no inline styles)
- Subtle animations (respect prefers-reduced-motion)
- Accessible by default (Shadcn/Radix handles this)
- Premium feel: smooth transitions, polished interactions

## Admin Control Center (4 Tabs)

The Control Center is a password-protected admin interface accessible via Admin dropdown → Control Center.

**Tab 1: Events**
- Create/edit/delete seasons and tournaments
- Select players via checkboxes when creating/editing
- Display player count with Users icon on event cards
- Year column auto-populated from start_date
- Uses `events` table + `event_players` junction table

**Tab 2: Players**
- Add/edit players (name only)
- Soft delete (set status='inactive')
- View all registered players with PULP balances
- Uses `registered_players` table

**Tab 3: Courses**
- Manage disc golf courses with difficulty tiers
- Auto-set multipliers based on tier
- Active/inactive status
- Uses `courses` table

**Tab 4: Rules**
- Grouped dropdown (Seasons/Tournaments/Other)
- Default selection is hardcoded to "Season 2025" (see Known Issues)
- Configure placement points, performance bonuses
- 4-priority tie-breaker system
- Toggle course difficulty multipliers
- Uses `points_systems` table (config JSONB)

## Project-Specific Rules
- **Season Awareness**: All pages default to current season based on calendar year (auto-rollover Jan 1st)
- **Window Logic**: Blessings and challenges carry a `window_id`; a window locks 5 minutes after opening, settles on the next processed scorecard, and expires (refunding wagers) after 15 days with no scorecard
- **PULP Economy**: Central feature - all interactions revolve around earning/spending PULPs
- **Starting Balance**: 40 PULPs for new players (DB default + Players tab). Migration 016 reset existing balances to 20 once.
- **Advantages**: One per type limit (no stacking), expire at 11:59 PM same day
- **Minimum 4 Players**: Scorecards with <4 players are skipped gracefully (no error email, labeled `ParSaveables/Skipped`). Skipped-only emails do not settle a PULPy window.
- **Most Birdies Bonus**: Paid only to the round's sole birdie leader (ties get nothing), stored in `player_rounds.most_birdies_points`
- **Points Breakdown Must Add Up**: `validatePointsBreakdown` fails scorecard processing if (rank + bonuses) × multiplier ≠ final_total
- **Tied Rank Point Averaging**: When players share a rank (all 4 tie-breakers fail), their rank points are averaged across the positions they span (e.g., 2 tied for 2nd → avg of 2nd+3rd place points)
- **Expandable UI**: Leaderboard rows expand to show detailed stats (accordion behavior)
- **Mobile-First**: Thumb-friendly design, smooth animations, premium feel
- **Cost Control**: Stay under $5/month operational cost

## Database Migrations (001-017; numbers 002-005 and 007 each have two files)
- 001-006: Core PULP economy tables, RLS/signup fixes, course aliases, scorecard image URL
- 007: Podcast system + points systems structure (tie-breakers, most_birdies config)
- 008: Standardize events columns
- 009: Create event_players junction table
- 010: Add event_players write policies
- 011: Clear PULP activity data (reset to 100)
- 012: Add activity_feed description
- 013: Add activity_feed update policy (mark notifications read)
- 014: Add tutorial tracking
- 015: Add player aliases
- 016: PULPy window rework (replaces admin betting lock)
- 017: Add player_rounds.most_birdies_points

## Coding Standards
- **No Hacks or Workarounds**: Always implement proper, scalable solutions instead of hard-coded fixes for specific cases
- **Universal Solutions**: Code should work for all scenarios, not just the current data (e.g., styling should work for any player at any rank)
- **Avoid Technical Debt**: If you find yourself adding rank-specific logic or player-specific conditions, refactor to a universal approach
- **DRY Principle**: Don't repeat yourself - extract common patterns into reusable utilities and components
- **Think Long-term**: Consider how the code will behave when data changes (new players, different rankings, edge cases)

## Documentation
- Current state: docs/SESSION-HANDOFF.md
- Architecture: docs/ARCHITECTURE.md
- API contracts: docs/API-CONTRACT.md
- Binding constraints (read before changing DB/economy code): docs/constraints.md

## Known Issues
- **PULP Settlement Unverified**: Never confirmed working end-to-end since the migration 016 rework. As of 2026-09-27 no blessings or challenges exist, and the only window (opened 2026-05-07) is stuck in `locked` — it was never settled or expired despite passing its 15-day expiry.
- **Prod RLS Hole (security)**: `activity_feed`, `event_players`, `player_rounds`, `registered_players`, `rounds` allow anon writes; admin tabs are protected only by a client-side password. See docs/SESSION-HANDOFF.md.
- **Rules Tab Default**: Hardcoded to "Season 2025" instead of the current season.
