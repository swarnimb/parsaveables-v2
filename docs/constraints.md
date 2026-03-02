# ParSaveables v2 - Binding Technical Constraints

Decisions made during development that must be respected in future sessions.
Add entries here when a hard-won fix or architectural decision should never be undone.

---

## Database

### `bets` table no longer exists
**Decision:** Renamed to `blessings` in migration 016 (2026-02-26).
**Impact:** Any code querying `.from('bets')` will get `null` back from Supabase — silent failure.
**Rule:** Always use `.from('blessings')`. If you see `bets` anywhere in the codebase, it's stale.

### `betting_lock_time` removed from `events`
**Decision:** Dropped in migration 016. Admin-controlled betting lock replaced by player-opened 5-minute PULPy windows.
**Rule:** Do not add `betting_lock_time` back. Betting timing is controlled by `pulpy_windows` table.

### `pulp_balance` is the correct column (not `total_pulps`)
**Decision:** Column in `registered_players` is `pulp_balance`.
**Rule:** Never query `total_pulps` — that column does not exist. Use `pulp_balance`.

---

## Supabase Query Safety

### Always guard against null query results
**Decision:** Supabase returns `null` (not `[]`) when a query fails or the table doesn't exist. Calling `.length` or `.map()` on `null` crashes.
**Rule:** Always add `|| []` guards at the call site before passing results to functions:
```js
// CORRECT
const stats = calculateStats(rounds || [], challenges || [], blessings || []);

// WRONG — crashes if any query returns null
const stats = calculateStats(rounds, challenges, blessings);
```
Adding `|| []` only on the return value of a function is too late if the crash happens inside.

---

## Course Matching

### Claude Vision appends "DGC" suffix to course names
**Decision:** Claude Vision sometimes extracts full UDisc course names including the "DGC" suffix (e.g., `"Roy G. Guerrero DGC"`). The PostgreSQL RPC `find_course_by_name_or_alias` uses exact → alias → partial matching. A period + DGC suffix can break all 3 steps.
**Rule:** When adding a new course, also add defensive aliases:
- `"[Course Name] DGC"` (with DGC suffix)
- `"[Course Name]. DGC"` (if name includes an abbreviated middle initial)
**Current aliases added:** Roy G Guerrero has `"Roy G. Guerrero DGC"` and `"Roy G Guerrero DGC"`.

### `detectSessionInUrl` must be `true` in supabase.js
**Decision:** Set during Google OAuth implementation (2026-02-26). If `false`, OAuth callback tokens in the URL are not picked up and authentication fails silently.
**Rule:** `detectSessionInUrl: true` in `createClient()` options. Do not change this.

---

## Feature Flags

### Feature flags removed — PULP always live
**Decision:** `src/config/features.js` deleted in migration 016. No `pulpEconomy` toggle.
**Rule:** Do not re-introduce feature flags for PULP features. Everything in the PULP economy is permanently enabled.

---

## Scorecard Processing

### Minimum 4 players — skip gracefully
**Decision:** Scorecards with <4 players are skipped (not errored). Email labeled `ParSaveables/Skipped`. No error email sent. Betting lock NOT reset for skipped-only emails.

### Tied rank point averaging
**Decision:** When players share all 4 tie-breakers, rank points are averaged across the positions they span. This is wired into `calculatePoints()` in `pointsService.js`.

---

## PULPy Window Lifecycle

### `getActiveWindow` auto-locks expired open windows
**Decision:** Added 2026-03-01. `lockExpiredWindows()` is only called during scorecard processing — no scorecard = window stays `open` in DB forever. `getActiveWindow` now checks if an open window's `closes_at` is in the past and locks it before returning.
**Rule:** Do not remove this auto-lock behavior. It is the only reliable mechanism that transitions `open → locked` outside of scorecard processing.

### `openWindow` auto-locks stale windows before checking
**Decision:** Added 2026-03-01. If `openWindow` finds an existing `open` window whose `closes_at` is in the past, it locks it and proceeds rather than throwing a false "already open" error.
**Rule:** The check must remain: `if (secondsLeft > 0) throw` — the `> 0` condition is intentional.

### Frontend timer: snap to base state immediately, don't wait for server
**Decision:** When `secondsLeft` hits 0, the frontend immediately sets local window status to `locked` and clears the timer. `fetchWindow()` runs in background to sync DB. Do NOT call `fetchUnresolvedWindows()` at this point — the DB hasn't locked yet.
**Rule:** `fetchUnresolvedWindows()` must only be triggered after `fetchWindow()` returns `status: locked` from the server.

---

## Git / Branch Hygiene

### Work directly on `main` for this project
**Decision:** `feature/pulp-economy` was the long-running feature branch — it's merged and deleted. For this project, commit directly to `main` or use short-lived branches that merge cleanly (no cherry-pick divergence).
