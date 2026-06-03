# Security Audit — Void Tactics API

**Date:** 2026-05-27  
**Scope:** All Next.js API routes and server-side code in `app/api/` and `app/lib/`

---

## Fixed

### High — Timeout route accepted claims before timer expired
**File:** `app/api/games/[id]/timeout/route.ts`  
**Issue:** Any authenticated player could call `POST /api/games/[id]/timeout` immediately after a game started, awarding themselves a win before the opponent's turn timer actually expired.  
**Fix:** Route now loads `lobby.turnTimeSeconds` and reads `state.turnState.turnStartTime` from game state. Returns `409` if `Date.now() - turnStartTime < turnTimeSeconds * 1000`.

---

### High — EMP could target own ships
**File:** `app/api/games/[id]/action/route.ts` — `specialType === 1` branch  
**Issue:** No ownership check on the EMP target. A player could fire EMP at their own ships, which increments their ship's `reactorCriticalTimer` and can self-destroy.  
**Fix:** Added guard: target must be in the opponent's active ship list.

---

### High — Repair could target enemy ships
**File:** `app/api/games/[id]/action/route.ts` — `specialType === 2` branch  
**Issue:** No ownership check on the Repair target. A player could heal an opponent's ship.  
**Fix:** Added guard: target must be in the acting player's own active ship list.

---

### High — Assist could target enemy ships
**File:** `app/api/games/[id]/action/route.ts` — `ActionType.Assist` case  
**Issue:** No ownership check on the Assist target. A player could heal an opponent's ship with the Assist action.  
**Fix:** Added guard: target must be in the acting player's own active ship list.

---

### Medium — Action body fields not validated
**File:** `app/api/games/[id]/action/route.ts`  
**Issue:** `shipId`, `row`, `col`, `actionType`, `targetShipId`, and `specialType` were cast directly from the request body with no type checks. A caller could send `NaN`, floats, or out-of-range enum values.  
**Fix:** Added `Number.isInteger` guards and range checks for all numeric fields immediately after body parsing. `actionType` is clamped to 0–6 (the `ActionType` enum range); `specialType` to 0–3.

---

### Low — Kill credit `ship.update` lacked `ownerId` filter
**File:** `app/api/games/[id]/action/route.ts` — kill reward block  
**Issue:** `prisma.ship.update({ where: { id: shipId } })` updated `shipsDestroyed` on any ship matching `shipId` without confirming the caller owns it. In normal game flow this can't be exploited (the ship is already validated as active), but it's a defense-in-depth gap.  
**Fix:** Added `ownerId: userId!` to the `where` clause.

---

### Medium — Leaderboard exposed email prefix for users without a username
**File:** `app/api/leaderboard/route.ts`  
**Issue:** `displayName` fell back to `email.split("@")[0]`, leaking the local part of a user's Google OAuth email address to all visitors of the public leaderboard.  
**Fix:** Fallback is now `Player_${id.slice(0, 6)}` — opaque, deterministic, and not personally identifiable.

---

## Open — Requires Design Decision

### Critical — Purchase routes grant items without payment verification
**Files:** `app/api/user/utc/purchase/route.ts`, `app/api/ships/purchase/usd/route.ts`  
**Issue:** Both endpoints grant in-game currency or ships to any authenticated user on request, with no payment provider verification. The `PayButton` component already has a `// TODO: Implement payment functionality` comment indicating these are intentional stubs.  
**Action required:** Integrate a payment provider (e.g. Stripe webhook + idempotency key) before enabling real-money purchases. Until then, these routes should either be removed or gated behind an admin/dev flag so they cannot be called from the production UI.

---

### ~~Medium — Lobby creation fields have no range validation~~
**Fixed.** `turnTimeSeconds` must be 60–86400, `maxScore` 50–200, `costLimit` 500–3000. Route returns `400` for values outside these bounds.

---

### ~~Medium — Admin ship costs endpoint has no array length validation~~
**Fixed.** Each cost array is now validated against the exact length from `DEFAULT_COSTS` (3 entries for `accuracy`/`hull`/`speed`; 4 entries for `mainWeapon`/`armor`/`shields`/`special`). A mismatched or oversized payload returns `400` with a descriptive message before any DB write occurs.

---

### ~~Info — `validateCustomization` does not check equipment enum values~~
**Fixed.** `app/lib/customizeCost.ts` now checks all four equipment fields (`mainWeapon`, `armor`, `shields`, `special`) for integer values in 0–3, and all three trait fields for integer values in 0–2, rejecting anything out of range before it reaches the DB.

---

### ~~Info — NextAuth `signIn` callback returns `true` on error~~
**Fixed.** `app/api/auth/[...nextauth]/route.ts` now wraps the `prisma.user.upsert` in a try/catch. On failure the error is logged and the callback returns `false`, causing NextAuth to block the session rather than proceeding with a partially-created user record.

---

### Medium — No rate limiting on API endpoints
**Deferred — pre-launch task.**  
Any authenticated user can hit any endpoint in a tight loop. The blockchain version had implicit rate limiting via gas costs; the DB-backed version has none.  
**Options (pick one before public launch):**
- **Vercel Pro** — configure rate limiting in `vercel.json`; no code or dependencies required.
- **Upstash Redis + `@upstash/ratelimit`** — sliding-window limiter keyed by `userId`; works on any serverless host; ~20 lines of middleware.
- **In-memory (`lru-cache`)** — simple, no infrastructure, but resets on every cold start so ineffective on serverless.

The recommended approach is Upstash if not on Vercel Pro, or Vercel's built-in otherwise. Priority endpoints are the action route, fleet submission, and lobby creation.

---

### Info — CSRF relies on SameSite=Lax; verify if app is ever embedded
**No code change required.**  
NextAuth sets `SameSite=Lax` by default. All state-changing routes additionally require a JSON body (browsers won't send `Content-Type: application/json` cross-origin without a CORS preflight, which the server does not permit) and a valid session via `requireAuth()`. These three layers together make traditional CSRF attacks impractical.  
The residual risk is same-site cross-frame requests (e.g. the app embedded in an iframe on the same domain). If that ever becomes a use case, upgrade NextAuth cookies to `SameSite=Strict` or add an explicit `Origin` header check in middleware.
