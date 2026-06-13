# Void Tactics — Tournament Frontend: Walrus Plan

> **Chain:** Base Sepolia only (`84532`).
> **Do World ID first:** `docs/fe-tournament-worldid.md` — this doc assumes that work is complete.
> **Source docs:** `docs/tournament.md` (contract spec), `docs/tournament-frontend.md` (integration guide).

---

## Overview

Walrus stores a full match record (move history, final state) for every completed tournament game. On-chain only a `bytes32 blobId` pointer is stored per match. A missing or invalid blob degrades replay UX only — it never affects prize integrity (winner always comes from `GameResults`).

**Endpoints (testnet):**
```
PUT  https://publisher.walrus-testnet.walrus.space/v1/blobs    → upload
GET  https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}  → fetch
```

---

## 1. Types (`app/types/types.ts` additions)

Add to the existing types file:

```typescript
export interface MatchRecord {
  tournamentId: number;
  matchId: number;
  gameId: number;           // == lobbyId
  timestamp: number;
  player1: string;
  player2: string;
  winner: string;
  turns: TurnRecord[];
  finalShipPositions: ShipPosition[];
  finalHullValues: Record<number, number>;
}
```

`TurnRecord` and `ShipPosition` likely already exist or are derivable from `useSimulatedGameState` — extend as needed.

---

## 2. Walrus Utils (`app/utils/walrus.ts`) — new file

Pure fetch, no on-chain calls.

```typescript
const PUBLISHER = "https://publisher.walrus-testnet.walrus.space/v1/blobs";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space/v1/blobs";

export async function uploadMatchRecord(record: MatchRecord): Promise<`0x${string}`>
// PUT JSON → parse blobId from response → return as 0x-prefixed bytes32

export async function fetchMatchRecord(blobId: `0x${string}`): Promise<MatchRecord>
// GET blob → parse JSON → return MatchRecord
```

**Key implementation notes:**
- Walrus PUT response contains a `blobId` string — must zero-pad to 32 bytes and prefix with `0x` before passing to `recordResult`.
- Always wrap `uploadMatchRecord` in try/catch. If upload fails, call `recordResult` with `bytes32(0)` — the match still resolves on-chain.
- `fetchMatchRecord` should throw on non-200 or JSON parse failure so callers can show a "replay unavailable" state.

---

## 3. Hook: `app/hooks/useMatchRecord.ts`

React Query wrapper. Caches by `blobId`. Skip fetch when blobId is zero or null.

```typescript
const ZERO_HASH = "0x" + "0".repeat(64);

export function useMatchRecord(blobId: `0x${string}` | null | undefined) {
  return useQuery({
    queryKey: ["matchRecord", blobId],
    queryFn: () => fetchMatchRecord(blobId!),
    enabled: !!blobId && blobId !== ZERO_HASH,
    staleTime: Infinity,   // blobs are immutable
  });
}
// → { data: MatchRecord | undefined, isLoading, error }
```

---

## 4. Component: `app/components/MatchReplay.tsx`

Fetches a `MatchRecord` from Walrus and renders a read-only game replay.

**Props:**
```typescript
interface Props {
  blobId: `0x${string}`;
}
```

**Logic:**
1. `useMatchRecord(blobId)` — show spinner while loading, error state if fetch fails.
2. Once loaded, step through `record.turns` with prev / next controls.
3. Render `<SimulatedGameDisplay />` in replay mode (see §4.1 below).

### 4.1 `SimulatedGameDisplay` replay mode refactor

`SimulatedGameDisplay` is currently coupled to tutorial step logic. For replay, add a `mode` prop:

```typescript
interface SimulatedGameDisplayProps {
  mode: "tutorial" | "replay";
  // replay-only:
  replayTurns?: TurnRecord[];
  replayInitialState?: GameState;
}
```

When `mode === "replay"`:
- Suppress all tutorial overlays, task lists, and step-driven highlights.
- Replace step-driven state machine with a turn index driven by the parent's prev/next controls.
- All interactive fleet/action buttons disabled.

The existing tutorial path is unchanged — the parity rule (`CLAUDE.md`) holds because replay mode is additive.

---

## 5. Game Integration — Post-Game Upload

When a tournament game ends, the frontend serializes and uploads the match record, then calls `recordResult`.

### 5.1 Hook: `app/hooks/useTournamentMatchForGame.ts`

Scan active tournament brackets to find if a given `gameId` belongs to a tournament match.

```typescript
export function useTournamentMatchForGame(gameId: bigint | null)
// → { tournamentId: bigint, matchId: bigint } | null
```

Implementation: reads `tournamentCount`, fetches all brackets, finds the match where `match.gameId === gameId`. Cache with React Query; only runs when `gameId` is non-null.

### 5.2 Where to hook into `GameDisplay.tsx`

In the `GameResultRecorded` event handler (or wherever game-end state is set), add a post-game step:

```typescript
// After game ends and GameResultRecorded fires:
const match = useTournamentMatchForGame(gameId);
if (match) {
  const record = serializeMatchRecord(gameState, match);
  const blobId = await uploadMatchRecord(record).catch(() => ZERO_HASH);
  await writeContract({
    functionName: "recordResult",
    args: [match.tournamentId, match.matchId, blobId],
  });
}
```

Surface this as a non-blocking step in the game-end UI ("Submitting tournament result…") — failure should not block the player from seeing their win.

### 5.3 Serialization helper (`app/utils/serializeMatchRecord.ts`)

```typescript
export function serializeMatchRecord(
  gameState: SimulatedGameState,
  match: { tournamentId: bigint; matchId: bigint; gameId: bigint },
): MatchRecord
```

Pulls `turns`, `finalShipPositions`, `finalHullValues` from the existing in-memory game state. This data is already present — it just needs packaging.

---

## 6. Bracket: "View Replay" Button

In `TournamentBracket.tsx` (built in the World ID phase), the match card has a placeholder slot for the replay link. Fill it in:

```tsx
{match.walrusBlobId !== ZERO_HASH && (
  <Link href={`/tournaments/${tournamentId}/matches/${match.matchId}`}>
    View Replay
  </Link>
)}
```

---

## 7. Admin Panel: Walrus blob for `resolveDraw`

In `TournamentAdminPanel.tsx`, the "Resolve as Draw" button currently passes `bytes32(0)`. In the Walrus phase, optionally upload a partial match record before resolving:

```typescript
const blobId = await uploadMatchRecord(record).catch(() => ZERO_HASH);
await resolveDraw(tournamentId, matchId, blobId);
```

This is optional — `bytes32(0)` is valid and the match resolves correctly without a blob.

---

## 8. Page: `app/tournaments/[tournamentId]/matches/[matchId]/page.tsx`

Match detail / replay page.

```tsx
// Reads match from useTournament, then:
<div>
  <MatchMeta match={match} />        // players, round, winner, timestamp
  {match.walrusBlobId !== ZERO_HASH
    ? <MatchReplay blobId={match.walrusBlobId} />
    : <p>Replay not available for this match.</p>
  }
</div>
```

---

## 9. Implementation Order

1. `MatchRecord` type additions to `app/types/types.ts`
2. `app/utils/walrus.ts` — pure utils, no deps, testable immediately
3. `useMatchRecord` hook
4. `useTournamentMatchForGame` hook
5. `serializeMatchRecord` helper
6. Game integration in `GameDisplay.tsx` — post-game upload + `recordResult`
7. `SimulatedGameDisplay` replay mode prop
8. `MatchReplay` component
9. Match replay page (`/tournaments/[id]/matches/[matchId]`)
10. "View Replay" button in `TournamentBracket`
11. Optional: Walrus blob for `resolveDraw` in admin panel

---

## 10. Open Items

| # | Item | Blocker |
|---|---|---|
| D | `SimulatedGameDisplay` replay mode refactor | Needed for `MatchReplay` — confirm scope with team before touching this file |
| E | `useTournamentMatchForGame` — scanning all brackets could be expensive if many tournaments exist; may need pagination or a server index | Scale concern, not a hackathon blocker |
| G | Exact Walrus `blobId` encoding — confirm byte order and padding from testnet docs | Needed before `uploadMatchRecord` is correct |
