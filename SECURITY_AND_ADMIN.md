# Security Model & Admin Panel

## Security Model

### Authentication

All mutating API routes call `requireAuth()` (`app/lib/auth.ts`), which reads the
NextAuth session cookie and returns the authenticated `userId` (Google OAuth sub).
If no session exists the route returns 401. There are no unprotected write endpoints.

### Authorization — what prevents spoofing?

The DB query itself enforces ownership. Routes never trust user-supplied IDs for
ownership; they pass `userId` as a filter into Prisma so the query simply returns
nothing if the caller doesn't own the resource.

| Route | Ownership check |
|---|---|
| `GET /api/ships` | `ownerId: userId` in query |
| `POST /api/ships/*/purchase` | ships created with `ownerId: userId` |
| `POST /api/ships/[id]/construct` | `findFirst({ id, ownerId: userId })` |
| `POST /api/lobbies/[id]/fleet` | checks `lobby.creatorId/joinerId === userId`; fetches ships with `ownerId: userId` (can't submit someone else's ships) |
| `POST /api/games/[id]/action` | game queried with `OR: [player1Id, player2Id]` → 404 if not a player; then `state.turnState.currentTurn === userId` → 403 if not your turn |
| `POST /api/games/[id]/timeout` | game queried with `OR: [player1Id, player2Id]` |
| Admin routes | email must be in `MAP_ADMIN_EMAILS` (see Admin section) |

This mirrors the smart contract pattern: the contract checked `msg.sender`; here the
DB query filters on `userId`. A caller can hit any endpoint but gets 404/403 if the
data doesn't belong to them.

### Known gaps

- **No rate limiting.** The blockchain had implicit rate limiting via gas costs. Here
  any authenticated user can hit endpoints in a tight loop. Add `next-rate-limit` or
  Vercel rate limiting before public launch.
- **No CSRF protection beyond SameSite cookies.** NextAuth sets SameSite=lax by
  default, which covers most cases, but verify this if the app is ever embedded.

---

## Admin Panel

### Access

The **[SHIP ATTRIBUTES]** tab appears in the main nav only for accounts whose email
is listed in `MAP_ADMIN_EMAILS` (`app/config/alpha.ts`):

```ts
export const MAP_ADMIN_EMAILS: string[] = ["briandoyle81@gmail.com"];
```

Add more emails to the array as needed. The admin API routes check the same list
server-side, so spoofing the UI is not sufficient.

### Ship Cost Config

Ship cost (threat) is calculated from equipment + traits using tables stored in the
DB (`Config` table, key `"ship_costs"`). When no DB config exists yet, the code
defaults in `app/lib/shipCosts.ts` are used (mirrors the `ShipAttributes` contract
constructor v1 values).

#### Current default tables (v1)

| Field | Values |
|---|---|
| baseCost | 50 |
| accuracy (T0–T2) | 0, 10, 25 |
| hull (T0–T2) | 0, 10, 25 |
| speed (T0–T2) | 0, 10, 25 |
| mainWeapon (laser/railgun/missile/plasma) | 25, 30, 40, 40 |
| armor (none/light/medium/heavy) | 0, 5, 10, 15 |
| shields (none/light/medium/heavy) | 0, 10, 20, 30 |
| special (none/EMP/repair/flak) | 0, 10, 20, 15 |

#### Workflow when the contract's `setCosts` changes

1. Open the **[SHIP ATTRIBUTES]** tab (admin only).
2. Edit the cost table values to match the new contract values.
3. Click **SAVE & RECALCULATE ALL SHIPS** — this:
   - Increments `costsVersion` in the DB config.
   - Recalculates and updates `cost` + `costsVersion` on every ship in the DB.
4. The "Stale" counter in the panel should drop to 0.

New ships generated after the save automatically use the updated costs.

#### Recalculate without changing costs

If ships somehow got stale costs without a cost change (e.g. a migration went wrong),
click **RECALCULATE ONLY** — uses the current DB config, no version bump.

#### Reset to defaults

**RESET TO DEFAULTS** restores the UI fields to the `DEFAULT_COSTS` constants in
`app/lib/shipCosts.ts`. It does not save — you still need to click Save.

### Admin API endpoints

| Method | Route | What it does |
|---|---|---|
| `GET` | `/api/admin/ship-costs` | Returns current cost config + ship stats (total / stale count) |
| `POST` | `/api/admin/ship-costs` | Saves new cost config (bumps version) and recalculates all ships |
| `POST` | `/api/admin/recalculate-costs` | Recalculates all ships using current DB config (no version bump) |

All three return 403 for non-admin sessions.

### costsVersion tracking

Every ship row has a `costsVersion Int` column. When costs are updated, all ships
get the new version stamped. Ships with `costsVersion < currentConfig.version` are
considered stale and shown in the admin panel counter. The `ShipCard` component
already has `costsVersionStale` prop wiring for displaying a warning badge.
