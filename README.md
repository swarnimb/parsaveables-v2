# ParSaveables v2 - PULP Economy Edition

Gamified disc golf tournament tracking platform with achievements, betting, and social features.

## Project Status ✅

**93% Complete - Phase 5 (Testing & Polish)**

### Completed Phases

- ✅ **Phase 1:** Foundation & Setup (Vite, React, Tailwind, Shadcn/ui, Supabase)
- ✅ **Phase 2:** Authentication & Layout (Login, Signup, Header, BottomNav, Routes)
- ✅ **Phase 3:** Leaderboard & Rounds (Podium, Expandable rows, Scorecard images)
- ✅ **Phase 4A:** PULP Economy Design (Architecture, Migration, Documentation)
- ✅ **Phase 4B:** PULP Economy Implementation (Backend services, API endpoints, Frontend UI)
- ✅ **Phase 4C:** UX Enhancements (Season awareness, Dashboard expansion, Next round logic)
- ⏳ **Phase 5:** Testing & Polish (Testing framework, Guest login, Admin tools, Betting timer)

### Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/ui
- **State:** Zustand
- **Animations:** Framer Motion
- **Routing:** React Router
- **Icons:** Lucide React
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth

## Quick Start

### Development Server

```bash
npm run dev
```

### Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── pages/              # Route pages (Login, Leaderboard, etc.)
├── components/
│   ├── ui/            # Shadcn base components
│   ├── layout/        # Header, BottomNav, etc.
│   ├── leaderboard/   # Leaderboard components
│   ├── betting/       # Betting & PULP economy
│   ├── achievements/  # Achievement system
│   ├── activity/      # Activity feed
│   ├── rounds/        # Round history
│   └── shared/        # Shared components
├── hooks/             # Custom React hooks
├── services/          # API clients (Supabase)
└── lib/               # Utilities (Shadcn utils)
```

## Next Steps

### Phase 2: Authentication & Layout

See `docs/SESSION-HANDOFF.md` for complete backlog and roadmap.

**Immediate Next Tasks:**
1. Create Supabase project and run database migrations
2. Build Login page with Supabase Auth
3. Create layout components (Header, BottomNav)
4. Set up routing with React Router

## Documentation

- **Architecture:** `docs/ARCHITECTURE.md` (883 lines - complete system design)
- **Project Dashboard:** `docs/SESSION-HANDOFF.md` (708 lines - backlog & status)
- **Claude Context:** `.claude/CLAUDE.md` (project context for AI)

## Features

- 🎯 **Dual Leaderboard System** - Points-based + PULP economy
- 🏆 **Achievement System** - Unlock badges, earn PULPs
- 💰 **Betting System** - Predict outcomes, win PULPs
- ⚔️ **Head-to-Head Challenges** - 1v1 PULP battles
- 🛒 **Advantages Shop** - Mulligans, score boosts, etc.
- 🎙️ **AI Podcast** - Monthly recaps
- 📱 **Mobile-First Design** - Premium UX

---

**Status:** Foundation complete. Ready for Phase 2! 🚀
