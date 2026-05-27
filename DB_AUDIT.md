# Database Audit — Void Tactics

**Date:** 2026-05-27  
**Scope:** `prisma/schema.prisma`, all `app/api/` DB access patterns, `app/lib/prisma.ts`

---

## ~~High — Missing Indexes~~

The most-queried columns in the app have no explicit indexes. PostgreSQL will sequential-scan those tables as they grow.

| Column(s) | Where queried | Suggested index |
|---|---|---|
| `Ship.ownerId` | Every `/api/ships` call, fleet submission, recycle, attributes | `@@index([ownerId])` |
| `Ship.ownerId` + `destroyed` | `/api/ships`, `/api/lobbies/[id]/fleet` | `@@index([ownerId, destroyed])` |
| `Fleet.lobbyId` | Game creation, timeout, flee, quit-with-penalty | `@@index([lobbyId])` |
| `Fleet.lobbyId` + `ownerId` | Fleet lookup by player within a lobby | `@@index([lobbyId, ownerId])` |
| `Game.player1Id` | `/api/games` — every active-games poll | `@@index([player1Id])` |
| `Game.player2Id` | `/api/games` — every active-games poll | `@@index([player2Id])` |
| `Lobby.creatorId` / `Lobby.joinerId` | Lobby listing, lobby membership checks | `@@index([creatorId])`, `@@index([joinerId])` |
| `Lobby.status` | Lobby listing filters by status | `@@index([status])` |
| `PlayerStats.wins` | Leaderboard `ORDER BY wins DESC` | `@@index([wins])` |

**Fixed.** Migration `20260527215237_add_missing_indexes` applied.

---

## ~~High — `recalculate-costs` Loads All Ships Into Memory~~

`app/api/admin/recalculate-costs/route.ts` and the recalculate step in `app/api/admin/ship-costs/route.ts` both do:

```typescript
const ships = await prisma.ship.findMany({ select: { id, equipment, traits } });
const updates = ships.map((ship) => prisma.ship.update({ where: { id } ... }));
await prisma.$transaction(updates);
```

This is O(N) memory + N individual SQL round-trips inside one transaction. At a few thousand ships it will exceed serverless memory limits and/or hit the Prisma transaction timeout. Fix with chunked batches:

```typescript
const BATCH = 500;
for (let i = 0; i < ships.length; i += BATCH) {
  await prisma.$transaction(
    ships.slice(i, i + BATCH).map((ship) => prisma.ship.update(...))
  );
}
```

---

## ~~High — No Pagination on `/api/ships`~~

**Fixed.** API now returns `{ ships, nextCursor }` with a default page size of 100 (max 200), using cursor-based pagination on `id DESC`. `useOwnedShips` walks all pages and returns the full accumulated `Ship[]`, so no UI changes were needed.

---

## ~~Medium — `GameTurn` Table Is Never Written To~~

**Fully fixed.** The action route writes one `GameTurn` row per ship action (inside the existing `$transaction`), recording `gameId`, `playerId`, `round`, `actions`, and `snapshot` (full `GameDataView` after the action). `Game.initialState` is saved at game creation. Migration `20260527225559_add_replay_fields` applied.

**Replay feature implemented:**

- `GET /api/games/[id]/replay` — returns `{ initialState, turns: [{id, round, playerId, actions, snapshot, submittedAt}] }`, restricted to game participants.
- `GameDisplay.tsx` — "Replay" button appears next to the result label (VICTORY / DEFEAT / DRAW) once the game is complete. Clicking it fetches the replay data and enters replay mode, displaying the board state from each snapshot with Prev / Next / Play / Pause / Exit controls, plus a floating "Replay · Move N/M" indicator on the board.

---

## Medium — `inFleet` Denormalization Maintained in Six Places

`Ship.inFleet` is a derived fact (a ship is in a fleet if it appears in `Fleet.shipIds`). It is manually set/cleared in:

- `lobbies/[id]/fleet` (set to true)
- `lobbies/[id]/route` (clear on lobby delete)
- `lobbies/[id]/timeout-joiner` (clear)
- `lobbies/[id]/quit-with-penalty` (clear)
- `games/[id]/timeout` (clear)
- `games/[id]/flee` (clear)
- `games/[id]/action` (clear on game complete)

Every new code path that ends a game or lobby must remember to clear `inFleet`, or ships get permanently stuck. Consider replacing with a computed check (`Fleet.shipIds @> ARRAY[id]`) or making ship-freeing a single shared function called from all terminal paths.

---

## Medium — No Connection Pooling for Serverless

`app/lib/prisma.ts` opens a direct `pg` connection. On Vercel, each cold start opens a new connection to the database. Under load (many concurrent cold starts) this exhausts the Postgres max_connections limit.

**Fix:** Use a pooled connection string (Neon pooler, Supabase PgBouncer, or a dedicated PgBouncer instance). Point `DATABASE_URL` at the pooled endpoint and keep the direct URL in `DIRECT_DATABASE_URL` for migrations only.

---

## Medium — Fleet Size Is Unbounded

`POST /api/lobbies/[id]/fleet` accepts any number of `shipIds`. A player could submit a fleet of 100 ships, which then causes the game state JSON, all turn processing, and all "free ships on game end" `updateMany` calls to scale with that count. Add a fleet size cap (e.g., 10 ships max) matching whatever the game rules intend.

---

## Low — `GameTurn` Aside: `Game.state` JSON Has No Size Management

The `Game.state` JSON blob is overwritten on every action with the full current state. It does not grow per-action (it's always the current snapshot), which is fine. But there is no archival of old game states. Once a game completes, the full state is retained forever. For completed games, consider stripping `shipAttributes` arrays down to final values only, or archiving to cold storage.

---

## Low — `PlayerStats` as a Separate 1:1 Table

`PlayerStats` has the same primary key as `User` and is always queried together with it (leaderboard joins, stats endpoint). There is no case where stats are queried without a `User` context. Merging the columns into `User` would eliminate the join and the `stats: { create: {} }` ceremony in the NextAuth sign-in callback.

---

## Low — `destroyed` + `destroyedAt` Redundancy on Ship

`Ship` has both `destroyed: Boolean @default(false)` and `destroyedAt: DateTime?`. Non-null `destroyedAt` implies `destroyed = true`. These must be kept in sync everywhere. The cleaner model is to drop `destroyed` and treat `destroyedAt IS NULL` as the live-ship condition. All `where: { destroyed: false }` queries become `where: { destroyedAt: null }`.

---

## Low — `tutorialPath` Should Be a DB Enum

`tutorialPath String?` stores `"win" | "loss"`. An unconstrained string allows any value. Add a Prisma enum:

```prisma
enum TutorialPath {
  win
  loss
}
```

---

## Info — `@updatedAt` Missing on `Ship` and `Lobby`

`Game` and `Config` have `updatedAt DateTime @updatedAt`, but `Ship` and `Lobby` do not. Without `updatedAt`, there is no cheap way to audit recent changes, detect stuck records, or implement cache invalidation based on modification time.

---

## Info — `ships/[id]/construct` Race Condition

`POST /api/ships/[id]/construct` does a `findFirst` then a separate `update`:

```typescript
const ship = await prisma.ship.findFirst({ where: { id, ownerId } });
if (ship.constructed) return 409;
await prisma.ship.update({ where: { id }, data: { constructed: true } });
```

Two concurrent requests for the same ship will both pass the `constructed` check and both issue the update. This is harmless (idempotent), but it should use an atomic `updateMany` with the `constructed: false` guard in the `where` clause and check the count, eliminating the preliminary read entirely.

---

## What Does NOT Need Changing

- **Prisma singleton pattern** (`app/lib/prisma.ts`) — correct; global reuse in dev hot-reload, new instance per cold start in prod.
- **`$transaction` usage** — consistently used for multi-table mutations. Good.
- **`select:` field projection** — used appropriately on leaderboard and recycle routes to avoid over-fetching.
- **`ownerId` filters on all write paths** — consistent. No IDOR gaps found beyond what the security audit already noted.
- **`Game.lobbyId @unique`** — correctly prevents duplicate games from concurrent fleet submissions.
