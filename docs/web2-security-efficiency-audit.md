# Web2 Backend — Security & Efficiency Audit

Date: 2026-07-13
Scope: all `app/api/**` web2 routes, `app/lib/gameEngineWeb2.ts`, `app/lib/createGameFromLobby.ts`, and the web2-suffixed client hooks (polling/query behavior). Read-only audit — no code changes made as part of this document.

Two areas were reviewed independently: security (authN/authZ, IDOR, currency integrity, game-engine cheat surface) and efficiency (N+1 queries, missing indexes, polling cadence, client-side caching). The two most severe/surprising security findings (#2 and #3 below) were independently re-verified by reading the actual source, not just taken on the reviewing agent's word.

---

## Security findings (most severe first)

### 1. CRITICAL — Free ship minting, no payment gate
**File:** `app/api/ships/purchase/usd/route.ts`

The route requires only `requireAuth()`, reads a client-supplied `tier`, and immediately increments `purchasedShipCount` and creates `tierConfig.shipCount` ships in a `$transaction` — there is no payment/webhook/session verification anywhere in the file (contrast with the real payment-gated `app/api/flow/fulfill/route.ts`, which verifies settlement via Dynamic/Fireblocks before minting).

**Impact:** any authenticated user can call this endpoint repeatedly to mint unlimited high-tier ships for free.

**Status:** known, pre-existing placeholder — already flagged in `ShipPurchaseInterfaceWeb2.tsx`'s own doc comment ("currently a placeholder with no payment gate"). Not introduced by recent work, but the single most exploitable thing in the stack today.

### 2. HIGH — Tournament creator can rig their own tournament — **FIXED**
**Files:** `app/api/tournaments/[id]/register/route.ts`, `app/api/tournaments/[id]/matches/[matchId]/resolve/route.ts`

**Verified directly.** `register/route.ts` never checked `userId !== tournament.creatorId` — the creator could register themselves as a player. `resolve/route.ts` let the creator declare either `match.player1Id` or `match.player2Id` the winner of *any* unresolved match, with no check that a game was actually played; its only guard was "caller is the tournament creator." The route's own comment describes it as a "creator-only fallback... for a stuck match," but nothing in the code restricted it to that case.

**Exploit chain (pre-fix):** create tournament → self-register → call `/resolve` on every own match declaring self the winner → advance through the bracket → `finalize` → collect `championShare` of the prize pool, without playing a single real game.

**Fix applied:**
- `register/route.ts` now rejects registration with 403 if `userId === tournament.creatorId` ("The tournament creator cannot register as a player"). This alone breaks the exploit chain — the creator's resolve powers can no longer be pointed at their own match.
- `resolve/route.ts` now also requires `match.lobbyId` to be set (i.e. a real lobby/game was actually created for the match, via `matches/[matchId]/create-lobby`) before allowing a manual resolve — closing the secondary gap where a match could be resolved before any game existed. This doesn't affect the documented legitimate use (resolving a real game that ended in a tie — see `gameEngineWeb2.ts`'s handling of `WEB2_TIE_SENTINEL`, which deliberately leaves ties for manual resolution — since by the time a game can tie it has already completed, `lobbyId` is already set).
- The client's registration UI (`TournamentRegisterWeb2.tsx`) needed no change — it already surfaces API errors inline, so a creator attempting to register now sees a clear rejection message rather than a silent failure or crash.
- Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 3. HIGH — Ram (and other special actions) bypass range/proximity entirely — **FIXED**
**File:** `app/lib/gameEngineWeb2.ts` (`validateDestinationAndTarget`, ~line 107; `Ram` case, ~line 360; `Special` case, ~line 277)

**Verified directly.** `validateDestinationAndTarget` only checked weapon range/line-of-sight for `ActionType.Shoot`. For `Ram` and `Special` (EMP/Repair/Flak) it only confirmed the acting ship's *own* destination tile was within its movement stat — it never checked that the target ship was anywhere near that destination.

**Impact (pre-fix):** a player could Ram-destroy any disabled enemy ship anywhere on the board, or EMP-stun/Repair any ship anywhere on the board, regardless of position.

**Note:** the code's own comment at the top of `validateDestinationAndTarget` acknowledged this was a deliberate scope deferral carried over from the original port ("the source branch's Special/Assist/Ram handlers only ever validated ownership/team constraints, never range... this port preserves that... to avoid guessing at semantics it doesn't already define"), not an accidental gap. It was, however, live and exploitable.

**Fix applied:**
- `validateDestinationAndTarget` now takes `specialType` and enforces: for `Ram`, the destination must literally be the target ship's own tile (matching the design intent already described in a neighboring comment — "the contract infers the ram from moved onto a disabled enemy's tile"); for `Special` with `specialType` 1 (EMP) or 2 (Repair), the target must be within `SPECIAL_CONFIG[specialType].range` of the destination (the same range table the client already uses for range highlighting). Flak (`specialType` 3) needed no separate check — its blast radius is already self-contained, computed from the ship's own destination tile.
- While verifying this fix, found and fixed a related **correctness bug**: the server's general movement-reachability check (shared by all action types) never allowed moving onto an occupied tile, but the client's ram flow relies on moving onto the disabled enemy ship's own tile (`canEnterOccupiedCell` on the client explicitly allows this). Without a matching server-side allowance, every legitimate Ram would have been rejected with "Destination out of movement range" before ever reaching the ram-specific logic — meaning Ram may not have actually been functional server-side prior to this fix. Added the same `canEnterOccupiedCell` rule server-side (enter allowed only when the occupant is a disabled ship on the opponent's team), so Ram is both correctly restricted *and* actually usable now.
- Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 4. HIGH — Currency TOCTOU races (four call sites, same shape) — **FIXED**
**Files:**
- `app/api/lobbies/route.ts` (balance check ~line 129 vs. decrement ~line 138)
- `app/api/ships/purchase/utc/route.ts` (balance check ~line 24 vs. decrement ~line 34)
- `app/api/ships/[id]/customize/route.ts` (balance check ~line 111 vs. decrement ~line 142)
- `app/api/tournaments/[id]/register/route.ts` (balance check ~line 35 vs. decrement ~line 49)

Each read `creditBalance` in a plain `await prisma.*.findUnique`, then later mutated with `decrement`/`increment` — no conditional `WHERE creditBalance >= cost` guard and no `$transaction` re-check between read and write. Two concurrent requests could both pass the pre-check before either committed, letting a user pay once but get two purchases/lobbies/registrations, potentially driving `creditBalance` negative.

**Confidence:** plausible (real race window identified by code inspection), not confirmed under an actual concurrency test.

**Fix applied:** the pre-checks stay (fast, clear error for the common case), but the actual debit in each route is now an atomic conditional update — `tx.user.updateMany({ where: { id: userId, creditBalance: { gte: cost } }, data: { creditBalance: { decrement: cost } } })` inside an interactive `prisma.$transaction(async (tx) => ...)`. Postgres locks the row for the statement and re-evaluates the `WHERE` clause after acquiring the lock, so two concurrent requests against the same row can no longer both pass — the loser's `updateMany` returns `{ count: 0 }`, which throws a shared `InsufficientBalanceError` (`app/lib/InsufficientBalanceError.ts`) and rolls back the whole transaction (no ships/lobby/registration created without a successful debit). Each route catches that specific error and returns a clean 402.

All four routes were converted from Prisma's batch-array `$transaction([...])` form to the interactive callback form — batch-array transactions run every operation and commit unless one throws a real error, so a `{ count: 0 }` result alone wouldn't have rolled anything back; the interactive form was required to make the check-and-abort actually work.

As a bonus, `tournaments/[id]/register/route.ts` also now catches a concurrent double-registration (two requests both passing the pre-check `existing` lookup) via the `tournamentId_userId` unique constraint — previously this would have surfaced as a generic 500 for the losing request; it now cleanly returns 409 `AlreadyRegistered` and its balance debit is rolled back along with it.

**Deliberately out of scope:** `lobbies/route.ts`'s `lobbiesCreatedCount < freeGamesPerAddress` free-tier check has a similar (lower-stakes) read-then-write race, not covered here since finding #4 was specifically about `creditBalance`.

Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 5. MEDIUM-HIGH — Special actions have no range validation
Same root cause as #3 — folded in above since it's the same code path (EMP/Repair/Flak all skip range checks that Shoot has). Fixed alongside #3.

### 6. MEDIUM — Turn-action race allows double-move/turn-order corruption — **FIXED**
**File:** `app/lib/gameEngineWeb2.ts` (state read ~line 178, commit `$transaction` ~line 593)

Game state was read via `findFirst` with no lock; the whole new state was computed in JS and only written atomically at the very end. Two concurrent `POST /api/games/[id]/action` requests from the same player, both reading state before either committed, could both pass the "already moved"/"not your turn" checks against the same stale snapshot.

**Confidence:** plausible, not runtime-verified (pre-fix).

**Fix applied:** optimistic concurrency control using `Game.updatedAt` (already an `@updatedAt`-managed column) as a compare-and-swap token. The final commit now uses `tx.game.updateMany({ where: { id: gameId, updatedAt: game.updatedAt }, data: {...} })` instead of a plain `update`. If another request already committed a change to this game between the initial read and this write, `updatedAt` has moved and the conditional update matches zero rows; that's caught and turned into a `GameActionError(409, "Game state changed — please retry")`, rolling back the whole transaction (no turn log, no reward, no state write) instead of silently overwriting a concurrent commit. The route already forwards `GameActionError`'s status/message as-is (`app/api/games/[id]/action/route.ts`), so no client-side change was needed — a 409 here surfaces through the same error-toast path as every other action-validation error (e.g. "Not your turn").

Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 7. MEDIUM — Free-ship claim cooldown race — **FIXED**
**File:** `app/api/ships/claim-free/route.ts` (cooldown check ~lines 38-48, ship-creation transaction ~lines 52-71)

The cooldown check was a plain read; the transaction that grants ships wasn't conditioned on the cooldown still holding at commit time. Two concurrent requests fired before either committed could both pass, yielding double the intended free ships per cooldown window.

**Fix applied:** rather than a schema change (there's no dedicated "last claimed at" column — eligibility is derived from the owner's newest `Ship.createdAt`, so there's no single row to atomically condition an `updateMany` on the way the currency fixes did), the cooldown re-check and the 10 ship inserts now run inside one `prisma.$transaction` under **Serializable isolation** (`Prisma.TransactionIsolationLevel.Serializable`). Postgres's serializable snapshot isolation detects the read-write conflict when a concurrent claim (same `ownerId`) commits new `Ship` rows between this transaction's eligibility read and its own inserts (both transactions touch the `ownerId` index range), and aborts one side with Prisma's dedicated write-conflict error code (`P2034`) rather than letting both succeed. The route catches `P2034` and returns a clean 409 ("please try again"), and still returns its own 409 for the ordinary case where the re-checked cooldown genuinely hasn't expired. The original outer pre-check (before the transaction) stays as a fast, cheap path for the common case — the transaction only needs to re-verify once eligibility looked plausible.

Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 8. LOW — Ram can target the player's own disabled ships — **FIXED**
**File:** `app/lib/gameEngineWeb2.ts` (Ram case, ~line 395)

The Ram target check only required `hullPoints === 0`, not that the target belonged to the opponent. Low-impact (a player could only deny themselves a future reactor-tick kill credit on their own ship).

**Fix applied:** added an explicit team check in the Ram case (`opponentActiveIds.some(id => id === targetShipId)`, mirroring the pattern EMP already used) before the existing disabled-hull check. In practice this was already unreachable after the #3 fix — the shared `canEnterOccupiedCell` rule in `validateDestinationAndTarget` only allows entering a tile occupied by a ship on the *opponent's* active list, so a ramming ship could never actually reach its own disabled ship's tile to begin with. The explicit check here is kept anyway as self-documenting defense-in-depth at the point the effect is applied, rather than relying on a reader tracing through the movement-reachability logic to understand why it can't happen.

Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### Verified sound (no action needed)
- `requireAuth`/`requireWeb2Admin` (`app/lib/auth.ts`) are applied correctly on essentially every mutating/admin route reviewed.
- `WEB2_ADMIN_EMAILS.includes(email)` is an exact-match array check — no substring/prefix risk.
- IDOR checks are consistently solid elsewhere: ship/lobby/fleet/game ownership is scoped via `ownerId`/`player1Id`/`player2Id`/`creatorId`/`joinerId` in nearly every `where` clause reviewed.
- No raw `$queryRaw`/`$executeRaw` usage anywhere in scope — Prisma's parameterized queries throughout, no SQL injection surface found.
- Admin config write routes (`admin/ship-costs`, `admin/ship-attribute-tables`, `ships/purchase-tiers` PUT, `maps` POST/PATCH) all validate payload shape before persisting and are correctly gated by `requireWeb2Admin`.

---

## Efficiency findings (most impactful first)

### 1. HIGH — SSE game stream does per-connection DB polling — **FIXED**
**File:** `app/api/games/[id]/stream/route.ts` (~lines 55-76)

Each SSE connection ran its own `setInterval` that called `prisma.game.findUnique` every 2s for the life of the connection. This wasn't a real push mechanism — it was polling multiplied by connected clients. At ~200 concurrent live games (400 connections), that was ~200 SELECTs/sec sustained from this endpoint alone, scaling linearly with concurrent players.

**Fix applied:** DB polling is now coalesced per game rather than per connection. A module-level `Map<gameId, { intervalId, subscribers, lastUpdatedAt }>` registry (`subscribeToGamePoll`) runs at most one `setInterval` per actively-viewed game — every SSE connection for that game just subscribes to the shared result instead of running its own poll. The interval is created lazily on first subscriber and torn down when the last one disconnects. This drops load from O(connections) to O(distinct actively-viewed games), roughly halving it in the common case (two players per game) and capping it correctly as spectator counts or reconnects grow. A true DB-level push (LISTEN/NOTIFY) was considered but rejected: Neon's pooled connections don't support `LISTEN` well, and holding one dedicated non-pooled connection open per viewer would itself risk exhausting the connection limit — the coalescing fix gets most of the benefit with no infrastructure risk.

Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 2. HIGH — `recalcStaleShips` issues one UPDATE per ship instead of a batch — **FIXED**
**File:** `app/lib/recalcStaleShips.ts` (~lines 29-33)

Wrapped a `.map()` into `prisma.$transaction([...])`, producing one `UPDATE` statement per stale ship instead of a single batched write. Runs on hot, frequently-polled paths (`GET /api/ships`, `GET /api/ships?ids=`, lobby fleet submission). After any admin cost-table version bump, a user's next ship-list load could fire up to 200 sequential UPDATE round trips in one request.

**Fix applied:** replaced the per-ship `$transaction` array with a single parameterized `UPDATE "Ship" AS s SET cost = v.cost, "costsVersion" = ... FROM (VALUES ...) AS v(id, cost) WHERE s.id = v.id` via `prisma.$executeRaw` (using `Prisma.sql`/`Prisma.join` for parameterization — no string interpolation, no injection risk). N round trips become 1 regardless of how many ships are stale.

**Smoke-tested against the live database and a real bug was caught and fixed.** A throwaway test user + 3 ships (varied equipment/traits, `costsVersion` set behind the live config version) were created, run through the real `recalcStaleShips`, verified against independently-computed expected costs, then deleted. First run failed: `operator does not exist: integer = text` — Postgres was inferring the parameterized `VALUES` columns as `text` rather than `integer`, so `WHERE s.id = v.id` never matched anything (silent no-op, not even an obviously-broken error until you looked at the result). Fixed by adding explicit `::int` casts inside the `VALUES` tuples (`(${id}::int, ${cost}::int)`). Re-ran the same test after the fix — all 3 ships' `cost`/`costsVersion` updated correctly in the database, matching the independently-computed expected values exactly. This is a good example of why "type-checks and lints clean" isn't the same as "actually works" for raw SQL — Prisma's TS types can't catch a Postgres-side type-inference mismatch.

Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), `npm run build`, and a live-database smoke test — all clean.

### 3. HIGH — Four redundant/stacked polling mechanisms for game state — **FIXED**
**Files:** `app/hooks/useGamesWeb2.ts` (5s + 15s polls), `app/hooks/useGameStreamWeb2.ts` (SSE), `app/hooks/useGamePollingWeb2.ts` (adaptive 30s–5min)

All four independently answered "did the game change" when a game view was open alongside the games list — cache fragmentation plus redundant network/DB load.

**Fix applied:** traced actual usage first — `useGetGame` (the single-game query) is *only* ever called from `GameDisplayWeb2.tsx`, always alongside both `useGameStreamWeb2` (SSE push, which also invalidates the query) and `useGamePollingWeb2` (an adaptive scheduler that already calls this same query's `refetch`). Its own flat `refetchInterval: 15000` was pure redundant DB load, not extra coverage, so it's removed — `useGamePollingWeb2`'s 30s/5min/1hr adaptive schedule (plus fast polling right after your own move) already provides the fallback-safety-net role. The games-*list* query (`useGetGamesForPlayer`, a genuinely distinct concern — it's what keeps the list itself fresh while you're *not* inside a specific game's SSE-connected view) keeps its own interval but relaxed from 5s to 20s.

Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 4. MEDIUM-HIGH — `GET /api/games` unbounded, full state payload, polled every 5s — **FIXED**
**File:** `app/api/games/route.ts` (~lines 11-17)

No `take`/cursor; returned full `state` for every game the user has ever played. Combined with #3's original 5s poll, a long-tenured player's entire history was re-fetched in full every 5 seconds.

**Fix applied:** added `take: 100` (bounds the worst case; no behavior change for the vast majority of users). The 5s poll interval was addressed as part of #3 above (now 20s). Payload trimming (returning a lighter shape for list display vs. full detail) was considered but not done — it would need verifying nothing downstream relies on the full blob when a game is selected from the list, which wasn't in scope for this pass.

Verified with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 5. MEDIUM — Tournament detail polled every 3s with full bracket + registrants — **FIXED**
**File:** `app/hooks/useTournamentWeb2.ts` (~line 16), backed by `app/api/tournaments/[id]/route.ts` (~lines 20-24)

Tournament state only changes on discrete events (registration, match resolution) — 3s was far tighter than needed.

**Fix applied:** `refetchInterval` raised from 3000 to 15000.

### 6. MEDIUM — `useOwnedShipsWeb2` polls every 5s, re-walks the entire paginated ship list — **FIXED**
**File:** `app/hooks/useOwnedShipsWeb2.ts` (~lines 13-34)

A player with 500+ ships triggered 5 round trips every 5 seconds for data that only changes on purchase/construct/recycle actions — all of which already call `refetch()` explicitly on success (see `ManageNavyWeb2.tsx`), so the interval only needs to catch changes from elsewhere (another tab/device).

**Fix applied:** `refetchInterval` raised from 5000 to 20000.

Verified (#5-#6) with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### 7. MEDIUM — Missing index on `Lobby.reservedJoinerId` — **FIXED**
**Files:** `prisma/schema.prisma` (`Lobby` model), `app/api/lobbies/route.ts` (~line 71), polled every 5s by `useLobbyListWeb2.ts`

`Lobby` had `@@index([creatorId])`, `@@index([joinerId])`, `@@index([status])` but no index covering `reservedJoinerId`, filtered in the lobby-list OR clause.

**Fix applied:** added `@@index([reservedJoinerId])` to the `Lobby` model. The initial `prisma migrate dev` attempt failed in this sandbox because `.env.local` didn't exist (it had existed earlier in this project's history but was gone — not committed, since it's gitignored), so `prisma.config.ts`'s hardcoded `.env.local`-only dotenv load found nothing and no datasource URL resolved. Root cause found and fixed at `prisma.config.ts` (it now loads `.env.local` *and* falls back to `.env`, matching where the DB credentials actually ended up: `config({ path: [".env.local", ".env"] })`). Migration `20260714120000_add_efficiency_indexes` (hand-written to match this repo's format, containing both this index and #11's) was then applied for real via `npm run db:migrate` against the live Neon database — confirmed by Prisma's own "Your database is now in sync with your schema" output. The index exists in Postgres now, not just in the schema file.

### 8. LOW-MEDIUM — `GET /api/maps/[id]` over-fetches tile data just to show a name — **FIXED**
**Files:** `app/api/maps/[id]/route.ts`, `app/hooks/useMapNameWeb2.ts`

Always returned `blockedTiles`/`scoringTiles` even when the only thing the caller (`GamesWeb2.tsx`'s map-name display, via `useMapNameWeb2`) needed was `name`.

**Fix applied:** the route now accepts `?fields=name`, returning `{ name }` via a `select`-scoped query instead of the full row; `useMapNameWeb2` passes it. Full-detail callers (`MapsWeb2.tsx`, game loading) are unaffected — they omit the param and get the same response as before.

### 9. LOW-MEDIUM — `GET /api/tournaments` unbounded, no `select` — **FIXED**
**File:** `app/api/tournaments/route.ts` (~lines 12-15), polled every 5s

**Fix applied:** added `take: 100`; also relaxed `useTournamentListWeb2.ts`'s poll interval from 5s to 20s (same reasoning as #5/#6 — discrete-event-driven data doesn't need a sub-5s cadence).

### 10. LOW — `GET /api/maps` unbounded — **FIXED**
**File:** `app/api/maps/route.ts` (~line 11)

**Fix applied:** added `take: 200`.

### 11. LOW — `ships/claim-free` sorts by `createdAt` with no supporting index — **FIXED**
**File:** `app/api/ships/claim-free/route.ts` (~lines 20-23, 41-44)

Schema only had `@@index([ownerId])`/`@@index([ownerId, destroyed])`, neither covering the `createdAt` ordering used here.

**Fix applied:** added `@@index([ownerId, createdAt])` to the `Ship` model, applied in the same migration as #7 — see that entry for the `prisma.config.ts` root-cause fix that unblocked applying it.

Verified #7-#11 with `tsc --noEmit`, `eslint`, `vitest run` (70/70), `npm run build`, and a real `npm run db:migrate` against the live database — all clean, migration applied.

### 12. LOW — Config-table lookups hit the DB on every request, no in-process caching — **FIXED**
**Files:** `app/lib/getCurrentCosts.ts`, `app/lib/getShipAttributeTables.ts`, `app/lib/getPurchaseTiers.ts`, `app/lib/economyConfig.ts`

These values change rarely (admin-edited) but were re-fetched via `prisma.config.findUnique` on every call, including hot paths like `applyGameAction` (once per ship move).

**Fix applied:** a small shared in-process TTL cache (`app/lib/ttlCache.ts` — 30s TTL, de-duplicates concurrent misses into one fetch) now backs all four getters. The three that have admin write paths (`ship_costs`, `ship_attribute_tables`, `purchase_tiers`) also get an `invalidate()` call wired into their respective `PUT` routes, so an admin sees their own change reflected immediately in the same panel's `GET` re-fetch rather than waiting up to 30s — this mattered because those admin panels I built earlier already call `refetch()` right after a successful save. `economy_config` has no write route yet, so it's just cached with no invalidation hook (nothing to wire up). Per-process only — acceptable for admin-tunable config, not used anywhere requiring strong consistency.

### 13. LOW — Every game action re-fetches the map's full tile data — **FIXED**
**File:** `app/lib/gameEngineWeb2.ts` (~lines 177-183)

`applyGameAction` re-pulled `blockedTiles`/`scoringTiles` via a nested `include` on every single action submission, even though map tiles never change mid-game.

**Fix applied:** new `app/lib/getMapTiles.ts` — a per-mapId TTL cache (60s) wrapping a `select`-scoped `prisma.map.findUnique`. `gameEngineWeb2.ts`'s initial query dropped the nested `include: { map: true }` (now just `include: { lobby: true }`, which already had `mapId` as a scalar column) and looks up tiles via the cache instead. Invalidated from the map-editing `PATCH /api/maps/[id]` route so an admin's map edit takes effect on the next action rather than waiting out the TTL.

Verified #12-#13 with `tsc --noEmit`, `eslint`, `vitest run` (70/70), and `npm run build` — all clean.

### Verified sound (no action needed)
- `gameEngineWeb2.ts`'s core state-commit transaction (single `$transaction` for game update + turn log + reward) is properly batched.
- `ships/route.ts`'s cursor pagination is correctly bounded.
- `createGameFromLobby.ts` uses a single batched `findMany({ id: { in: allShipIds } })` — no N+1.
- `tournamentBracket.ts`'s `maybeAdvanceRound`/`generateBracket` have no N+1 pattern.
- `Fleet`/`TournamentMatch` index coverage matches their actual query shapes (`lobbyId`, `[lobbyId, ownerId]`, `[tournamentId, round]`).
- NextAuth uses JWT sessions — no DB round trip per `requireAuth()` call.

---

## Recommended priority

Security findings **#2, #3, #4, #6, #7, and #8 are all now fixed** (see above) — every identified security issue except #1 is closed. Only #1 (unpaid USD purchase) remains open — a known, previously-flagged placeholder, left as-is per instruction rather than a new discovery.

Efficiency findings **#1 through #13 are all fixed, applied, and verified** — including #7/#11's migration (live against the real Neon database, after fixing `prisma.config.ts`'s env-loading, which had been silently finding zero variables because `.env.local` didn't exist in this checkout and the DB credentials had ended up in `.env` instead) and #2's raw-SQL batch update, which was smoke-tested end-to-end against the live database and had a real Postgres type-inference bug (`integer = text`) caught and fixed in the process — see #2 above for details. Nothing on this list is still a "trust me, it type-checks" fix; everything with a live-DB dependency has now actually touched the live DB.

## Post-audit follow-up: comparing against `explore-traditional`'s prior admin cost tooling

While discussing finding #2, it turned out `explore-traditional` (the original web2 source branch) once had its own `POST /api/admin/recalculate-costs` endpoint — an unconditional `prisma.ship.findMany()` (no `where`) loading every ship in the database into memory, then one write per ship. This is exactly the antipattern finding #2 guards against; it predates this repo's history (added at commit `2579f28e`, 2026-05-26) and was already deleted from `explore-traditional`'s current HEAD in favor of the same lazy per-fetch `recalcStaleShips` pattern this repo already had — confirming neither branch currently has the "load everything" bug.

Comparing `explore-traditional`'s surviving `admin/ship-costs/route.ts` against the version built in this repo's session surfaced two real improvements, now ported into both `admin/ship-costs/route.ts` and `admin/ship-attribute-tables/route.ts` (for consistency, even though only costs have a per-ship staleness concept):

1. **Server-authoritative version incrementing.** `PUT` no longer trusts a client-supplied `version` field — it reads the existing Config row, computes `prevVersion + 1` itself, and ignores whatever the client sent. Prevents a client bug from desyncing or colliding the version counter that `recalcStaleShips` depends on for correctness.
2. **Stale-ship stats on `GET`.** `admin/ship-costs` now also returns `stats: { total, staleCount }` via two cheap `prisma.ship.count()` calls (not a full load), surfaced in `ShipAttributesWeb2.tsx`'s UI so an admin can see how many ships still need recalculating after a cost change, before it happens lazily as owners load their ship lists.

Both were smoke-tested against the live database using a throwaway Config key (never touching the real `ship_costs` row): version incrementing is monotonic and ignores a deliberately-bogus client-sent version, the JSON round-trip preserves edited values correctly, and the stats query was verified against the real `Ship` table (3,149 real ships at test time, 0 stale). Verified with `tsc --noEmit`, `eslint` (zero warnings), `vitest run` (70/70), and `npm run build` — all clean.
