# Void Tactics: Blockchain → Traditional Backend Migration Plan

## The Core Swap

Every blockchain primitive has a direct traditional equivalent:

| Blockchain role | Traditional replacement |
|---|---|
| Wallet address as user ID | Auth system (email/OAuth/username) with JWT sessions |
| Smart contract state | PostgreSQL database |
| `writeContract()` | `POST /api/...` with server-side validation |
| `useWaitForTransactionReceipt()` | Polling or WebSocket confirmation |
| `useWatchContractEvent()` | WebSocket push from server |
| ERC-20 credits | Virtual currency table in DB (or remove entirely) |
| Contract randomness | `crypto.randomBytes()` server-side |
| Multi-chain support | Single server (or multi-region if needed later) |

The frontend is in good shape for this. React Query already abstracts all data fetching — only the *source* of the data changes, not the component code.

---

## Phase 0 — Decisions

### 1. Auth model
**Google OAuth.** NextAuth.js handles the OAuth flow; sessions stored server-side with a JWT. User identity is the Google account — no wallet required.

### 2. Backend location
**Next.js API routes.** All server logic lives in `app/api/` in this same repo. No separate service to deploy or maintain.

### 3. Real-time strategy
**Polling to start, WebSockets later.** Poll `/api/games/:id` and `/api/lobbies` every 3–5s for now — sufficient for a small player population and matches how the blockchain version already works. Migrate to WebSockets when concurrency demands it; the React Query invalidation logic won't need to change, only the trigger mechanism.

### 4. Economy
**Keep the economy, simulate purchases for now.** Credits, ship costs, and purchase flows stay in the game. Payment calls (`POST /api/ships/purchase`) succeed immediately on the server and credit the user's balance without real money moving — a simulated Stripe integration. Real payment processing gets wired in later without changing the API contract.

---

## Phase 1 — Auth & Identity (~1 week)

The entire codebase keys on wallet `address`. Replace this with a `userId` string that comes from a session.

### Server work
- User table: `id`, `username`, `email`, `passwordHash` (or OAuth tokens), `createdAt`
- Auth routes: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- JWT middleware applied to all game routes

### Frontend work
- Create `useCurrentUser()` hook — returns `{ userId, username, isLoggedIn }` — replaces `useAccount()`
- Add `AuthProvider` to `/app/providers.tsx`, remove `WagmiProvider` and `RainbowKitProvider`
- Add login/register UI (can be a simple modal to start)
- Find/replace all `address` usages that mean "current user" with `userId` from the new hook

### Files to touch
- `/app/providers.tsx` — swap providers
- All hooks that call `useAccount()` — swap identity source
- `/app/components/` — anywhere that renders the wallet address or connect button

---

## Phase 2 — Database Schema (~3 days)

Model everything the contracts currently store.

```sql
users           id, username, credits_balance
ships           id, owner_id, hull_type, construction_state, equipment (jsonb), traits (jsonb)
fleets          id, owner_id, ship_ids (int[]), positions (jsonb)
lobbies         id, creator_id, joiner_id, map_id, status, cost_limit, turn_time_seconds, created_at
games           id, lobby_id, player1_id, player2_id, state (jsonb), current_turn, phase, winner_id
game_turns      id, game_id, player_id, actions (jsonb), submitted_at
maps            id, name, grid (jsonb), scoring_tiles (jsonb), blocked_tiles (jsonb)
player_stats    user_id, wins, losses, total_games
```

The `state (jsonb)` column on `games` is important — the full `GameDataView` the frontend already consumes can be stored as-is and served directly. This avoids rewriting game-state serialization.

---

## Phase 3 — Replace Reads (~1–2 weeks)

All `useXyzRead()` hooks become React Query `useQuery` calls hitting REST endpoints. The query interface is **identical** — only the fetcher function changes.

### Endpoints to build

```
GET  /api/ships                       # owned ships (replaces useOwnedShips)
GET  /api/ships/:id                   # single ship + attributes
GET  /api/ships/attributes/:id        # replaces useShipAttributesContract
GET  /api/games                       # player's active games
GET  /api/games/:id                   # full game state (replaces useGameContract)
GET  /api/games/:id/map               # map state for a game
GET  /api/lobbies                     # lobbies player is in/can join
GET  /api/lobbies/:id                 # single lobby detail
GET  /api/fleets/:id                  # fleet composition
GET  /api/maps                        # preset maps
GET  /api/maps/:id
GET  /api/user/stats                  # wins/losses
GET  /api/ships/free-claim/eligibility
```

### Hook refactoring pattern

```typescript
// BEFORE (wagmi)
export function useOwnedShips() {
  const { address } = useAccount();
  return useReadContract({
    address: SHIPS_ADDRESS,
    abi: SHIPS_ABI,
    functionName: 'getShipsByIds',
    // ...
  });
}

// AFTER
export function useOwnedShips() {
  return useQuery({
    queryKey: ['ships', 'owned'],
    queryFn: () => fetch('/api/ships').then(r => r.json()),
  });
}
```

The components that consume these hooks change **zero lines**.

---

## Phase 4 — Replace Writes (~1 week)

All `writeContract()` calls become `fetch(POST/PUT/DELETE)`. The `TransactionContext` pattern survives — keep `isPending`/`error` state, just driven by HTTP instead of tx receipt polling.

### Endpoints to build

```
POST   /api/ships/claim-free          # replaces claimFreeShips
POST   /api/ships/:id/construct       # replaces constructShip
DELETE /api/ships/:id                 # replaces shipBreaker (recycle)
POST   /api/lobbies                   # createLobby
POST   /api/lobbies/:id/join          # joinLobby
DELETE /api/lobbies/:id/leave         # leaveLobby
POST   /api/lobbies/:id/fleet         # createFleet
POST   /api/lobbies/:id/accept        # acceptGame
POST   /api/games/:id/action          # submit a game action (movement, attack, flee)
POST   /api/games/:id/timeout         # endGameOnTimeout
```

### Revised TransactionContext flow

```typescript
// Replace:
const hash = await writeContract({ ... });

// With:
const res = await fetch('/api/lobbies', {
  method: 'POST',
  body: JSON.stringify(args),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
// No receipt-waiting needed — server responds when action is committed
completeTransaction(id, true);
```

The existing 90-second timeout fallback can stay as-is.

---

## Phase 5 — Game Logic Server Port (~2–3 weeks, largest effort)

The contracts currently enforce game rules. A traditional server must do the same — otherwise the game is trivially cheatable.

### What to port to the server

- **Ship attribute calculation** (`ShipAttributes` contract) — partially exists already in `app/utils/shipAttributesCalculator.ts`; make this the authoritative server-side version
- **Turn validation** — is this move legal? Is the ship in range? Does it have AP?
- **Damage calculation** — weapon damage, armor mitigation, shield absorption
- **Game phase transitions** — when does a round end, when does the game end?
- **Map scoring** — which tiles score, how many points

### What stays client-side

- `useSimulatedGameState.ts` — local turn simulation for preview/undo UX stays exactly as-is; it just can't be the source of truth
- Ship rendering, image cache — unchanged

### Server validation pattern

Server receives an action → validates it against current game state → applies it → persists the new state → returns the updated `GameDataView`. Client-side simulation is a preview only.

---

## Phase 6 — Real-time Updates (~3–5 days)

Currently `useContractEvents.ts` watches `Ships.Transfer` and `Game.GameUpdate` events and triggers refetches. Replace with one of:

### Option A — Simple polling (fastest to ship)
Keep the existing poll pattern but hit `/api/ping` every 5s instead of `useBlockNumber`. Response includes a version/sequence number; if it changed, invalidate queries.

### Option B — Server-Sent Events (recommended)
```
GET /api/games/:id/events  →  SSE stream
```
Server pushes `{"type":"game_updated","version":42}` when state changes. Client invalidates the game query on receipt. Simpler than WebSockets for one-directional server → client pushes.

---

## Phase 7 — Cleanup (~2–3 days)

### Delete
- `/app/contracts/` — all 88 ABI JSON files
- `/app/config/contracts.ts`
- `/app/config/networks.ts` (or gut it; keep region config if relevant)
- `wagmi`, `viem`, `@rainbow-me/rainbowkit`, `@wagmi/core` from `package.json`
- `/app/hooks/useSwitchToSelectedChainIfNeeded.ts`
- `/app/hooks/useSelectedChainId.ts`
- All `useXxxContract.ts` base hooks
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` env var

### Keep entirely unchanged
- All weapon animations, game grid rendering, ship renderer
- `useSimulatedGameState.ts`, `useOnboardingTutorial.ts`
- All component `.tsx` files (they only see React Query interfaces)
- Most of `app/utils/`
- `app/types/types.ts`

---

## Summary Timeline

| Phase | What | Effort |
|---|---|---|
| 0 | Decisions | 1–2 days |
| 1 | Auth & identity | ~1 week |
| 2 | DB schema | ~3 days |
| 3 | Read endpoints + hook swap | ~1–2 weeks |
| 4 | Write endpoints + TX context | ~1 week |
| 5 | Game logic server port | ~2–3 weeks |
| 6 | Real-time updates | ~3–5 days |
| 7 | Cleanup | ~2–3 days |
| **Total** | | **~7–10 weeks solo** |

The frontend survives mostly intact. The bulk of the work is building the server (auth, DB, game logic validation, API routes) — essentially writing a game server from scratch while the client stays in place.
