# Void Tactics — Game Recording: Walrus Plan

> **Scope:** ALL completed games, not just tournament matches.
> **Chain:** Base Sepolia (EVM, 84532) for game contracts; Walrus for blob storage.
> **No encryption.** All game data is public.

---

## Architecture

### The event-log problem

Every `moveShip` call emits an EVM event. In principle the full move history lives
on-chain. In practice, querying historical events from a browser is unreliable: RPC
providers cap `eth_getLogs` to 2,000–10,000 blocks per request, requiring many
paginated calls for a game that started hours ago, and rate limits compound the problem.

This means reconstructing game history from events on a fresh device or tab is not a
dependable foundation for replay or multi-device live viewing.

### Two-tier Walrus strategy

| Tier | Trigger | TTL | Purpose |
|---|---|---|---|
| **Live snapshot** | After each `moveShip` confirms | 2× turn time (min 1 epoch) | Multi-device mid-game access |
| **Archive** | Game ends | 1 month (15 epochs testnet) | Permanent replay |

**Each player maintains their own blob.** Storage is doubled but each player can only
affect their own entry. A corrupt or missing blob from one player is covered by the other.

**Live snapshot** — when a player's `moveShip` transaction confirms, the game client
serializes the full accumulated move history and uploads it. The serialized state at that
moment already includes the opponent's previous move, because that `lastMove` is what the
client was displaying when the player chose their action — no extra fetch required. The
upload is a complete record of everything both players have done up to and including the
submitter's current move.

A server-side pointer (`/api/game-blob?gameId=X&player=Y`) maps each player's latest
blobId. Any device fetches one pointer then pulls the snapshot in one aggregator request.

**Archive** — when the game ends, each player uploads a final blob with a 1-month TTL
and records the blobId on-chain via `GameBlobRegistry.record(gameId, blobId)` (regular
games) or `Tournament.recordResult` (tournament games).

### Coverage between the two blobs

At any point in the game, the two players' blobs differ by at most one move (the move
just submitted, before the opponent has responded). Between them, full history is always
available. For replay, prefer the blob from whichever player submitted last; fall back to
the other.

### Multi-device pointer lookup

```
After moveShip confirms:
  1. Serialize full state (includes opponent's lastMove) → POST /api/walrus/upload?epochs=1
  2. POST /api/game-blob { gameId, player, blobId, rawBlobId }

Second device wanting current state:
  1. GET /api/game-blob?gameId=X&player=Y → { rawBlobId }
  2. GET aggregator/v1/blobs/{rawBlobId} → full GameRecord JSON
```

### blobId tracking for completed games

Both tournament and regular games store their archive blobId on-chain — no server pointer
needed for completed games.

- **Tournament**: `Tournament.recordResult(tournamentId, matchId, blobId)` — already
  exists, called by the game client after the archive upload.
- **Regular games**: `GameBlobRegistry.record(gameId, blobId)` — a new minimal contract
  (see §3 below). After the archive upload completes, the winning or losing player signs
  one `record` transaction from their wallet.

**Security model for `GameBlobRegistry`:**
1. *Game must be complete* — checks `GameResults.isGameResultRecorded(gameId)`. Cannot
   record a blob for an in-progress game.
2. *Caller must be a participant* — checks `msg.sender == result.winner || result.loser`
   via `GameResults.getGameResult(gameId)`. Third parties cannot write.
3. *First-write wins* — once set, the blobId is immutable. No overwriting replays.

A player submitting a falsified replay blob cannot affect game outcomes — winner/loser is
already immutably recorded in `GameResults`. The replay is cosmetic only.

**Mid-game live snapshots** still use the server pointer (`/api/game-blob`) since the
game isn't complete yet and on-chain storage per move is not practical. The pointer is
ephemeral and best-effort — its only job is to serve the current snapshot blobId to a
second device during an active game. Once the game ends and the archive is recorded
on-chain, the server pointer becomes irrelevant.

### Cost

This is an EVM app; players have no Sui wallet. The testnet publisher is public and
subsidized — no WAL payment required. All uploads go through a server-side API route.

At testnet pricing (100 FROST/KiB/epoch + ~8,200 FROST fixed overhead per upload):
- Live snapshot (1 epoch, growing ~1–50 KB): effectively free
- Archive (15 epochs, ~50 KB): ~83,000 FROST ≈ 0.00008 WAL — sub-cent
- 50 moves × live snapshots: ~500,000 FROST ≈ 0.0005 WAL total — still sub-cent

Cost is not a concern. Upload frequency is bounded by turn time — not a spam risk.

---

## Walrus Endpoints (testnet)

```
PUT  https://publisher.walrus-testnet.walrus.space/v1/blobs?epochs={n}   → upload
GET  https://aggregator.walrus-testnet.walrus.space/v1/blobs/{rawBlobId} → fetch
```

`rawBlobId` is the base64url string from the publisher response. `blobId` (bytes32 hex)
is for on-chain storage only.

Epoch durations: testnet = 2 days → 1 epoch ≈ 2 days; 15 epochs ≈ 1 month.
Set short TTL live snapshots to `epochs=1` (minimum). Set archive to `epochs=15`.

---

## 1. Types (`app/types/types.ts`)

```typescript
export interface TurnRecord {
  turnNumber: number;
  player: string;
  shipId: number;
  action: string;
  fromPosition: [number, number];
  toPosition: [number, number];
  targetShipId?: number;
  damageDealt?: number;
  timestamp: number;   // block timestamp (unix seconds)
}

export interface GameRecord {
  gameId: string;
  timestamp: number;     // game start
  player1: string;
  player2: string;
  winner: string;        // address, or zero address for draw/in-progress
  turns: TurnRecord[];
  finalShipPositions: Record<string, [number, number]>;
  finalHullValues: Record<string, number>;
  // Present when this was a tournament bracket match
  tournamentId?: number;
  matchId?: number;
}
```

---

## 2. API Route: `/api/walrus/upload/route.ts`

Proxies uploads to the Walrus testnet publisher. Handles both short-TTL live snapshots
and long-TTL archives via the `epochs` query param.

```typescript
// POST /api/walrus/upload?epochs=1   (live snapshot)
// POST /api/walrus/upload?epochs=15  (archive, default)
// Body: GameRecord JSON
// Returns: { blobId: `0x${string}`, rawBlobId: string }

const PUBLISHER_BASE = "https://publisher.walrus-testnet.walrus.space/v1/blobs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const epochs = url.searchParams.get("epochs") ?? "15";
  const body = await req.text();

  const res = await fetch(`${PUBLISHER_BASE}?epochs=${epochs}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Walrus upload failed" }, { status: 502 });
  }

  const data = await res.json();
  const rawBlobId: string =
    data?.newlyCreated?.blobObject?.blobId ?? data?.alreadyCertified?.blobId;
  if (!rawBlobId) {
    return NextResponse.json({ error: "No blobId in response" }, { status: 502 });
  }

  // base64url → 0x-prefixed bytes32 (for on-chain storage)
  const bytes = Uint8Array.from(
    atob(rawBlobId.replace(/-/g, "+").replace(/_/g, "/")),
    c => c.charCodeAt(0),
  );
  const blobId =
    ("0x" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")).padStart(
      66, "0x" + "0".repeat(64).slice(2),
    ) as `0x${string}`;

  return NextResponse.json({ blobId, rawBlobId });
}
```

---

## 3. Contract: `GameBlobRegistry`

New contract to deploy on Base Sepolia alongside the existing suite. Stores the archive
blobId for every completed regular game.

**Interface it depends on** (already deployed):
- `GameResults.isGameResultRecorded(uint256 gameId) → bool`
- `GameResults.getGameResult(uint256 gameId) → GameResult { gameId, winner, loser, timestamp }`

**Storage:** `mapping(uint256 gameId => mapping(address player => bytes32 blobId))`

Each player owns their own slot. A player cannot write to the opponent's slot.

**Write function:** `record(uint256 gameId, bytes32 blobId)`
- Reverts if `!gameResults.isGameResultRecorded(gameId)` (game not complete)
- Reverts if `msg.sender` is not `result.winner` or `result.loser`
- No first-write-wins — a player may update their own slot (e.g. if they re-upload)
- Stores `blobs[gameId][msg.sender] = blobId`, emits `BlobRecorded(gameId, msg.sender, blobId)`

**Read function:** `getBlob(uint256 gameId, address player) → bytes32`

**Replay preference:** call `getBlob` for both participants; prefer whichever is non-zero.
If both are present they should be equivalent — either can serve the replay.

**Deployment:** Constructor takes `address _gameResults`. No owner, no upgradeability —
intentionally minimal. Add deployed address to `deployed_addresses.json` and
`CONTRACT_ADDRESSES_BY_CHAIN_ID` under key `GAME_BLOB_REGISTRY`.

---

## 4. API Route: `/api/game-blob/route.ts`

**Scope: mid-game live snapshots only.** Not used for completed-game storage — that goes
on-chain via `GameBlobRegistry` or `Tournament.recordResult`.

Mutable in-memory pointer: `gameId → { blobId, rawBlobId }`. Ephemeral by design — its
only job is to let a second device fetch the current in-progress snapshot during an active
game. Entries can be evicted after game end.

```
GET  ?gameId=X&player=Y                 → { blobId, rawBlobId } | 404
POST { gameId, player, blobId, rawBlobId }  → 200
```

In-memory map is sufficient for the hackathon. For production replace with a short-TTL
KV store (Vercel KV, Upstash) — expiry keyed to the turn time.

---

## 4. Walrus Utils (`app/utils/walrus.ts`)

```typescript
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space/v1/blobs";

export async function uploadGameSnapshot(
  record: GameRecord,
  epochs: 1 | 15 = 1,
): Promise<{ blobId: `0x${string}`; rawBlobId: string }> {
  const res = await fetch(`/api/walrus/upload?epochs=${epochs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json() as Promise<{ blobId: `0x${string}`; rawBlobId: string }>;
}

export async function fetchGameRecord(rawBlobId: string): Promise<GameRecord> {
  const res = await fetch(`${AGGREGATOR}/${rawBlobId}`);
  if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
  return res.json() as Promise<GameRecord>;
}

export async function updateGamePointer(
  gameId: string,
  blobId: `0x${string}`,
  rawBlobId: string,
): Promise<void> {
  await fetch("/api/game-blob", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, blobId, rawBlobId }),
  });
}

export async function fetchGamePointer(
  gameId: string,
): Promise<{ blobId: `0x${string}`; rawBlobId: string } | null> {
  const res = await fetch(`/api/game-blob?gameId=${gameId}`);
  if (!res.ok) return null;
  return res.json();
}
```

---

## 5. Serialization Helper (`app/utils/serializeGameRecord.ts`)

```typescript
export function serializeGameRecord(
  gameState: /* type from GameDisplay internal state */,
  context: {
    gameId: bigint;
    player1: string;
    player2: string;
    winner?: string;
    tournamentId?: bigint;
    matchId?: bigint;
  },
): GameRecord
```

Pulls accumulated turns and current ship state from in-memory game state. Called after
every confirmed move (for live snapshots) and again at game end (for the archive).

---

## 6. Game Integration (`GameDisplay.tsx`)

### After each confirmed move

```typescript
// Non-blocking — never awaited in the render path
const pushLiveSnapshot = useCallback(async () => {
  try {
    const record = serializeGameRecord(gameState, { gameId, player1, player2 });
    const { blobId, rawBlobId } = await uploadGameSnapshot(record, 1);
    await updateGamePointer(gameId.toString(), blobId, rawBlobId);
  } catch {
    // silently ignore — live snapshot is best-effort
  }
}, [gameState, gameId, player1, player2]);

// Call after writeContract for moveShip confirms (in the success callback / event handler)
```

### At game end

1. Serialize full game record (all turns + final state).
2. Upload to Walrus with `epochs=15` (~1 month).
3. Record blobId on-chain:
   - Tournament game → `Tournament.recordResult(tournamentId, matchId, blobId)`
   - Regular game → `GameBlobRegistry.record(gameId, blobId)` signed by the player
4. Evict the server pointer entry for this gameId (no longer needed).

Surface as a non-blocking UI step: "Saving replay…" badge. Failure is non-fatal — the
game result is already secured by `GameResults`. Store `rawBlobId` in localStorage as a
display-only cache so the replay link appears immediately without a contract read.

Apply the same logic to `SimulatedGameDisplay.tsx` (parity rule — tutorial games take the
regular-game path with no tournament context).

---

## 7. Hook: `app/hooks/useTournamentMatchForGame.ts`

Scans tournament brackets to find if a `gameId` belongs to a match.

```typescript
export function useTournamentMatchForGame(gameId: bigint | null)
// → { tournamentId: bigint, matchId: bigint } | null
```

---

## 8. Hook: `app/hooks/useGameRecord.ts`

```typescript
export function useGameRecord(rawBlobId: string | null | undefined) {
  return useQuery({
    queryKey: ["gameRecord", rawBlobId],
    queryFn: () => fetchGameRecord(rawBlobId!),
    enabled: !!rawBlobId,
    staleTime: Infinity,   // immutable once archived; snapshots are replaced, not mutated
  });
}
```

Note: live snapshots have the same `rawBlobId` until the next move uploads a new one.
The query key changes per move, so React Query fetches the latest automatically when
a watcher reports a new pointer.

---

## 9. Replay Component (`app/components/GameReplay.tsx`)

```typescript
interface Props {
  rawBlobId: string;
}
```

1. `useGameRecord(rawBlobId)` — spinner while loading, "replay unavailable" on error.
2. Renders `<SimulatedGameDisplay mode="replay" turns={record.turns} currentTurn={idx} />`
3. Prev / Next buttons + scrub slider control `idx`.

---

## 10. `SimulatedGameDisplay` Replay Mode

Add `mode` prop:

```typescript
interface SimulatedGameDisplayProps {
  mode: "tutorial" | "replay";
  // replay-only:
  replayTurns?: TurnRecord[];
  replayCurrentTurn?: number;   // controlled by GameReplay parent
}
```

When `mode === "replay"`: suppress tutorial overlays; disable all interactive controls;
drive state from `replayCurrentTurn` index instead of step machine. Tutorial path
unchanged — parity rule holds because replay mode is purely additive.

---

## 11. Entry Points for Replay Links

**Tournament bracket** (`TournamentBracket.tsx`): `walrusBlobId` field is already on
`TournamentMatch`. `hasReplay` check and "View replay" link already exist — just wire
`rawBlobId` through alongside `blobId`.

**Game history / past games**: call `fetchGamePointer(gameId)` or read localStorage
fallback. Show "View Replay" when a pointer exists.

**Live game spectator / second device**: call `fetchGamePointer(gameId)` on an interval
matching turn time → always shows latest snapshot.

---

## 12. Implementation Order

1. `TurnRecord` / `GameRecord` types in `app/types/types.ts`
2. `/api/walrus/upload/route.ts` — verify publisher response format with a curl test
3. `/api/game-blob/route.ts` — pointer store
4. `app/utils/walrus.ts` — upload, fetch, pointer helpers
5. `app/utils/serializeGameRecord.ts` — confirm field names against live game state
6. `useTournamentMatchForGame` hook
7. Per-move snapshot + game-end archive in `GameDisplay.tsx`
8. Parity changes in `SimulatedGameDisplay.tsx`
9. `useGameRecord` hook
10. `SimulatedGameDisplay` replay mode prop
11. `GameReplay` component
12. Wire replay links into bracket and game history

---

## 13. Implementation Order

1. Deploy `GameBlobRegistry` — constructor takes `GameResults` address; add to `deployed_addresses.json` and `CONTRACT_ADDRESSES_BY_CHAIN_ID`
2. `TurnRecord` / `GameRecord` types in `app/types/types.ts`
3. `/api/walrus/upload/route.ts` — verify publisher response format with a curl test first
4. `/api/game-blob/route.ts` — ephemeral mid-game pointer only
5. `app/utils/walrus.ts` — upload, fetch, pointer helpers
6. `app/utils/serializeGameRecord.ts` — confirm field names against live game state
7. `useTournamentMatchForGame` hook
8. Per-move snapshot in `GameDisplay.tsx` + pointer update
9. Game-end archive upload + on-chain recording (`GameBlobRegistry` or `recordResult`)
10. Parity changes in `SimulatedGameDisplay.tsx`
11. `useGameRecord` hook
12. `SimulatedGameDisplay` replay mode prop
13. `GameReplay` component
14. Wire replay links into bracket and game history

---

## 14. Open Items

| # | Item | Notes |
|---|---|---|
| A | Deploy `GameBlobRegistry` | Needs `GameResults` address from `deployed_addresses.json` |
| B | Confirm `TurnRecord` field names against game state internals | Serializer depends on this |
| C | Publisher response shape — validate `newlyCreated` vs `alreadyCertified` branches | Curl test against testnet publisher before building the route |
| D | `bytes32` conversion from base64url — verify padding for IDs shorter than 32 bytes | |
| E | Mainnet epoch count for 1-month target | Testnet: 15 × 2 days = 30 days; make this a named constant |
| F | `send-object-to` publisher param | For production: transfer blob objects to an app-controlled Sui address |
| G | React Query cache invalidation for live snapshots | `rawBlobId` changes each move — pointer fetch must invalidate the `useGameRecord` query |
| H | `GameBlobRegistry` ABI — add to `app/contracts/` and `CONTRACT_ABIS` after deployment | |
| I | Replay source selection — prefer blob from player who moved last; fall back to opponent | Requires knowing which player submitted most recently (check `lastMove` event block timestamps) |
| J | Payment on mainnet | Testnet publisher is free; mainnet needs WAL — app subsidy vs user-pays TBD |
| K | **Future: blob deletion on snapshot update** | Deleting the previous snapshot blob after each upload would refund unused epoch storage on mainnet. Requires: (1) `send-object-to` on every upload so the app's Sui server wallet owns the blob object, (2) server-side deletion call after each successful new upload. Not worth implementing until mainnet and only if epochs are long enough for the refund to matter. Minimum TTL is 1 epoch regardless, so `epochs=1` live snapshots already minimise waste without deletion. |
