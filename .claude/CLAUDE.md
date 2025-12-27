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
- **Next Round Betting**: Predict top 3 for next round (no need to pre-create future rounds)
- **Next Round Challenges**: Challenge higher-ranked players for next round
- **Advantages Shop**: Spend PULPs on in-game advantages (Mulligans, Anti-Mulligans, Cancel, Bag Trump, Shotgun Buddy)
- **Automated Podcast**: Monthly AI-generated podcast recapping highlights, rivalries, and drama
- **Notification Dropdown**: Shows 5 recent activities with icons, timestamps, and "View All" link

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
├── ui/              # Shadcn base components (11 total: button, card, dialog, tabs, input, label, select, accordion, progress, badge, dropdown-menu)
├── layout/          # Header, BottomNav, NotificationBell (dropdown), AdminDropdown, ProfileDropdown
├── dashboard/       # StatCard, RivalryCard
├── leaderboard/     # LeaderboardTable (expandable rows), PodiumDisplay
├── betting/         # PredictionsSection (next round), ChallengesSection (next round), AdvantagesSection
├── rounds/          # RoundCard (accordion)
├── tutorial/        # Tutorial modal, tutorialData
├── admin/           # BettingControlsModal
└── shared/          # PulpCounter, Confetti, LoadingSpinner (future)
```

**Design principles:**
- Use Shadcn components as base (don't reinvent the wheel)
- Tailwind classes only (no inline styles)
- Subtle animations (respect prefers-reduced-motion)
- Accessible by default (Shadcn/Radix handles this)
- Premium feel: smooth transitions, polished interactions

## Project-Specific Rules
- **Season Awareness**: All pages default to current season based on calendar year (auto-rollover Jan 1st)
- **Next Round Logic**: Bets and challenges use `roundId: null` and resolve when next scorecard is processed
- **PULP Economy**: Central feature - all interactions revolve around earning/spending PULPs
- **Advantages**: One per type limit (no stacking), expire at 11:59 PM same day
- **Betting Lock**: Admin sets `events.betting_lock_time`, system prevents new bets after lock
- **Expandable UI**: Leaderboard rows expand to show detailed stats (accordion behavior)
- **Mobile-First**: Thumb-friendly design, smooth animations, premium feel
- **Cost Control**: Stay under $5/month operational cost

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
