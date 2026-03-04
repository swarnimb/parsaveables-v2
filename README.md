# ParSaveables

Gamified disc golf tracking platform for friend groups and small leagues. Players email UDisc screenshots — AI extracts scores, updates the leaderboard, and runs the PULP economy automatically.

## Features

- **AI Scorecard Processing** — Email a UDisc screenshot, Claude Vision extracts every score and updates the leaderboard
- **Season & Tournament Tracking** — Points-based leaderboard with expandable player stats (wins, podiums, avg points, scoring)
- **PULP Economy** — Earn PULPs by playing (participation, beat-higher-ranked, DRS bonus), spend on Advantages
- **PULPy Windows** — 5-minute windows before a round where players place Blessings and issue Challenges
- **Blessings** — Bless 3 players to finish on a podium; get 2x back if the blessing works
- **Challenges** — Head-to-head PULP duels; lower strokes wins both sides
- **Advantages Shop** — Buy Mulligan, Anti-Mulligan, Bag Trump, and Shotgun Buddy with PULPs
- **AI Podcast** — Monthly AI-generated recap with ElevenLabs voice narration
- **Admin Control Center** — Manage events, players, courses, and points systems
- **Mobile-First** — Built for phones, smooth animations, premium feel

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS |
| UI Components | Shadcn/ui (Radix primitives) |
| State | Zustand |
| Animations | Framer Motion |
| Routing | React Router v7 |
| Icons | Lucide React |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Backend | Vercel Serverless Functions |
| AI — Scorecards & Podcast | Claude (Anthropic) |
| AI — Podcast Voice | ElevenLabs |
| Email Ingestion | Gmail API |

## Quick Start

```bash
npm install
npm run dev
```

### Environment Setup

Copy `.env.local.example` to `.env.local` and fill in your credentials:

```bash
cp .env.local.example .env.local
```

See `.env.local.example` for all required variables.

### Build for Production

```bash
npm run build
npm run preview
```

### Tests

```bash
npm test
npm run test:coverage
```

## Project Structure

```
src/
├── pages/                  # Route-level pages
│   ├── admin/              # ControlCenter, ProcessScorecards
│   ├── Dashboard.jsx
│   ├── Leaderboard.jsx
│   ├── Rounds.jsx
│   ├── Pulps.jsx           # PULP economy hub
│   ├── Podcast.jsx
│   ├── Activity.jsx
│   ├── About.jsx
│   └── Faq.jsx
├── components/
│   ├── ui/                 # Shadcn base components
│   ├── layout/             # Header, BottomNav, AppLayout, AdminDropdown
│   ├── leaderboard/        # LeaderboardTable, PodiumDisplay
│   ├── pulps/              # BlessingsSection, ChallengesSection, AdvantagesSection
│   ├── tutorial/           # Onboarding and PULP economy tutorial modals
│   ├── admin/              # Control center tab components
│   ├── rounds/             # RoundCard
│   └── shared/             # ErrorBoundary, OfflineDetector
├── hooks/                  # Custom React hooks
├── services/
│   ├── core/               # Scorecard processing pipeline (vision, scoring, email)
│   ├── gamification/       # PULP economy (pulp, blessing, challenge, window, advantage)
│   └── supabase.js         # Frontend Supabase client
└── lib/                    # Utilities (cn, etc.)

api/                        # Vercel serverless functions
├── processScorecard.js     # Email ingestion → AI vision → leaderboard update
├── generatePodcast.js      # Monthly AI podcast generation
└── pulp/                   # PULP economy endpoints (window, blessings, challenges, advantages)
```

## Environment Variables

```bash
# Frontend (Vite — must be prefixed VITE_)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_CONTROL_CENTER_PASSWORD=

# Backend (Vercel serverless functions)
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
ELEVENLABS_API_KEY=
ELEVENLABS_HOST_VOICE_ID=
ELEVENLABS_COHOST_VOICE_ID=
GITHUB_TOKEN=
```

## Documentation

- **Architecture:** `docs/ARCHITECTURE.md`
- **Session Notes:** `docs/SESSION-HANDOFF.md`
- **Binding Constraints:** `docs/constraints.md` — hard rules that must not be undone
