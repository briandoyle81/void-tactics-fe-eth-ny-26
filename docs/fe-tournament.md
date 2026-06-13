# Void Tactics — Frontend Tournament Implementation Plan

> **Source docs:** `docs/tournament.md` (contract spec), `docs/tournament-frontend.md` (integration guide).
> **Chain:** Base Sepolia only (`84532`).
> **Status:** Pre-implementation. Contract addresses TBD (post-redeploy).

---

## 0. Prerequisites

### 0.1 Contracts must be deployed first

The entire Base Sepolia stack is redeployed fresh (see `tournament.md §11`). Do **not** start frontend wiring until the new addresses are in hand. Once deployed, fill in:

- `app/contracts/base-sepolia/deployed_addresses.json` — add `Tournament` key
- `app/config/contracts.ts` — add Tournament ABI import + address

### 0.2 Install dependencies

```bash
npm install @worldcoin/idkit
```

No other new dependencies. viem and wagmi already handle contract calls.

---

## 1. Contract Config

### 1.1 ABI files

Copy ABIs from the contracts repo's `artifacts/` into:

```
app/contracts/TournamentABI.json      # Tournament.sol full ABI
```

The following ABIs are already present and reused:
- `app/contracts/LobbiesABI.json` — for `createLobbyForAddresses`
- `app/contracts/GameResultsABI.json` — for `getGameResult` (admin verification)

### 1.2 `app/config/contracts.ts` additions

```typescript
import TournamentABI from "@/app/contracts/TournamentABI.json";
export const TOURNAMENT_ABI = TournamentABI as const;

// Add to the chain address map:
// TOURNAMENT: "0x..." (Base Sepolia post-deploy)
```

### 1.3 World ID constants (`app/config/tournament.ts`) — new file

```typescript
export const WORLD_APP_ID = "app_b2739b54eb71ceb8c76380c60c20ce22" as const;
export const WORLD_ACTION = "join-tournament" as const;
export const WORLD_EXTERNAL_NULLIFIER =
  318078722027557965998987370672697888390534537434722412480399796468873891570n;
export const WORLD_ID_ROUTER = "0x42FF98C4E85212a5D31358ACbFe76a621b50fC02" as const;
```

---

## 2. Walrus Utils (`app/utils/walrus.ts`)

Handles all Walrus I/O. No on-chain interaction here — pure fetch calls.

```typescript
const PUBLISHER = "https://publisher.walrus-testnet.walrus.space/v1/blobs";
const AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space/v1/blobs";

export interface MatchRecord {
  tournamentId: number;
  matchId: number;
  gameId: number;          // == lobbyId
  timestamp: number;
  player1: string;
  player2: string;
  winner: string;
  turns: TurnRecord[];
  finalShipPositions: ShipPosition[];
  finalHullValues: Record<number, number>;
}

// Upload: returns hex blobId ready to pass to recordResult as bytes32
export async function uploadMatchRecord(record: MatchRecord): Promise<`0x${string}`>

// Fetch: retrieves and parses a stored match record
export async function fetchMatchRecord(blobId: `0x${string}`): Promise<MatchRecord>
```

**Key implementation notes:**
- Walrus PUT returns a JSON with a `blobId` field — must convert to `bytes32` (`0x`-padded hex).
- The `blobId` stored on-chain is an opaque pointer; a missing/invalid blob degrades replay UX only, never prize integrity. Wrap upload in try/catch and pass `bytes32(0)` to `recordResult` if it fails.
- Import `TurnRecord` and `ShipPosition` from `app/types/types.ts` (extend as needed).

---

## 3. Hooks

### 3.1 `app/hooks/useMatchRecord.ts`

React Query wrapper. Caches fetched `MatchRecord` by `blobId`.

```typescript
export function useMatchRecord(blobId: `0x${string}` | null | undefined)
// → { data: MatchRecord | undefined, isLoading, error }
```

### 3.2 `app/hooks/useTournamentList.ts`

Reads `tournamentCount()` then fetches `getTournamentSummary(id)` for each. Used on the tournament list page.

```typescript
export function useTournamentList()
// → { tournaments: TournamentSummary[], isLoading }
```

`TournamentSummary` maps the contract's `getTournamentSummary` return + `tournamentId`.

### 3.3 `app/hooks/useTournament.ts`

Full state for a single tournament. Composition of multiple contract reads + event watching.

```typescript
export function useTournament(tournamentId: bigint | null)
// → {
//     config: TournamentConfig | undefined,
//     summary: TournamentSummary | undefined,
//     registrants: Address[],
//     bracket: Match[],
//     isRegistered: boolean,    // for connected wallet
//     winnings: bigint,         // for connected wallet
//     isLoading,
//     refetch,
//   }
```

**Event watching:** Register `useWatchContractEvent` for `Registered`, `TournamentStarted`, `MatchGameAssigned`, `MatchResolved`, `NextRoundMatchCreated`, `TournamentFinalized` — all call `refetch` on fire. Follow the existing `useContractEvents.ts` memoization pattern (ABI at module level, config via `useMemo`, handler via `useCallback`).

### 3.4 `app/hooks/useTournamentActions.ts`

Write actions available to players. Uses `TransactionContext` for loading/error UI.

| Function | Contract call |
|---|---|
| `register(tournamentId, idKitResult)` | Decodes proof → `register(id, root, nullifier, proof[8])` payable |
| `start(tournamentId)` | `start(id)` |
| `cancel(tournamentId)` | `cancel(id)` |
| `claimPrize(tournamentId)` | `claim(id)` |
| `claimRefund(tournamentId)` | `claimRefund(id)` |

**Proof decoding** (inside `register`):
```typescript
import { decodeAbiParameters } from "viem";
const [unpackedProof] = decodeAbiParameters(
  [{ type: "uint256[8]" }],
  idKitResult.proof as `0x${string}`,
);
```

### 3.5 `app/hooks/useTournamentAdmin.ts`

Write actions restricted to the tournament creator / Lobbies owner. Used in the admin UI only.

| Function | Contract call(s) |
|---|---|
| `createMatchLobby(tournamentId, matchId, match)` | `Lobbies.createLobbyForAddresses(p1, p2, ...)` → capture `lobbyId` from `LobbyCreated` event → `Tournament.assignMatchGame(id, matchId, lobbyId)` |
| `submitResult(tournamentId, matchId, blobId)` | `Tournament.recordResult(id, matchId, blobId)` |
| `resolveDraw(tournamentId, matchId, blobId)` | `Tournament.resolveDraw(id, matchId, blobId)` |
| `finalize(tournamentId)` | `Tournament.finalize(id)` |

`createMatchLobby` is a two-step sequence: create lobby then assign. Use `waitForTransactionReceipt` + parse `LobbyCreated` log to extract `lobbyId` between steps.

---

## 4. Components

### 4.1 `app/components/TournamentRegister.tsx`

IDKit widget + on-chain register flow. Shown during the `Registration` state.

**Logic:**
1. Read `isRegistered` from `useTournament` — show "Already registered" if true.
2. Show entry fee (`config.entryFee`); if `> 0`, surface the amount clearly.
3. Render `IDKitWidget` with:
   - `app_id={WORLD_APP_ID}`
   - `action={WORLD_ACTION}`
   - `signal={connectedAddress}` — MUST match the wallet that will send the tx
   - `verification_level={VerificationLevel.Orb}`
   - `onSuccess={(r) => actions.register(tournamentId, r)}`
4. On World ID success, `register()` fires automatically.

**Error handling:** surface `WrongEntryFee`, `AlreadyRegistered`, `NullifierUsed`, `RegistrationFull` as readable messages (map revert names to user copy).

### 4.2 `app/components/TournamentBracket.tsx`

Visual single-elimination bracket. Read-only; driven by `bracket: Match[]` from `useTournament`.

**Layout:**
- Render rounds left-to-right (round 0 = leftmost, final = rightmost).
- Each `Match` card shows: player addresses (truncated), winner (if resolved), "View Replay" button (if `walrusBlobId != bytes32(0)`), "Game in progress" if `gameId != 0 && !resolved`.
- Bye slots: `player2 == address(0) && resolved` — show "BYE" for player2.
- Playable match: `player1 != 0 && player2 != 0 && !resolved` — highlight with green border.
- Empty slot: `player1 == 0` — render greyed placeholder.

**No write actions here** — bracket is display only. Actions live in the admin panel.

### 4.3 `app/components/TournamentCard.tsx`

Summary card for use in the tournament list. Shows: state badge, prize pool, player count, entry fee, time remaining to register or start.

### 4.4 `app/components/TournamentAdminPanel.tsx`

Rendered only when `connectedAddress === tournament.creator`. Contains:

- **Per-match action:** For each match that is `player1 != 0 && player2 != 0 && !resolved && gameId == 0`: "Create Lobby & Assign" button → calls `createMatchLobby`.
- **Resolve draw:** For matches known to be draws (admin must identify off-chain): "Resolve Draw" button → calls `resolveDraw`. (Requires the admin to know a draw occurred — there's no on-chain draw flag today.)
- **Finalize:** Once all matches are resolved, "Finalize Tournament" → calls `finalize`.

### 4.5 `app/components/MatchReplay.tsx`

Fetches a `MatchRecord` from Walrus and renders it in read-only mode.

Reuses `SimulatedGameDisplay` with all interactive elements disabled (no action buttons, no fleet placement). The `MatchRecord.turns` array drives the replay state — step through turns with prev/next controls.

**Note:** `SimulatedGameDisplay` is currently coupled to tutorial step logic. When building replay mode, add a `mode: "replay" | "tutorial"` prop that suppresses tutorial overlays and uses the turn array directly as the state source.

---

## 5. Pages / Routes

### 5.1 `app/tournaments/page.tsx`

Tournament list page. Uses `useTournamentList`.

**Sections:**
- Active / Registration tournaments (filterable)
- Completed tournaments (collapsible)
- "Create Tournament" button (admin only — check if `connectedAddress` is the authorized creator EOA, or open to all if desired)

### 5.2 `app/tournaments/[tournamentId]/page.tsx`

Main tournament page. Composition:

```
<TournamentHeader />           // title, state, prize pool, timing
<TournamentRegister />          // shown during Registration; hidden otherwise
<TournamentBracket />           // always shown; updates via events
<TournamentAdminPanel />        // shown only to creator
<ClaimButton />                 // shown when winnings > 0
<CancelRefundButton />          // shown when Cancelled and registered
```

### 5.3 `app/tournaments/[tournamentId]/matches/[matchId]/page.tsx`

Match detail / replay page. Uses `useMatchRecord(match.walrusBlobId)`.

Shows:
- Match metadata (players, round, result)
- `<MatchReplay />` if `walrusBlobId` is set, else "Replay not available"

---

## 6. Game Integration — Post-Game Flow

When a game that belongs to a tournament ends, the frontend must:

1. **Detect** it's a tournament game — check if `gameId` appears in any tournament bracket (via a `useTournamentMatchForGame(gameId)` hook that searches active tournament brackets).
2. **Serialize** the `MatchRecord` from in-memory state (`useSimulatedGameState` / `GameDisplay` already hold all needed data).
3. **Upload** to Walrus via `uploadMatchRecord`.
4. **Call** `Tournament.recordResult(tournamentId, matchId, blobId)` — permissionless, so the game winner's frontend (or either player's) can do this.

**Where to hook this in:** `GameDisplay.tsx` — in the `GameEnded` event handler (or wherever `GameResultRecorded` is processed). Add a "Submit tournament result" step that runs after the game-end UI.

**Failure handling:** If Walrus upload fails, pass `bytes32(0)` as `blobId` to `recordResult` — the match still resolves on-chain, replay just won't work. Log the failure and surface it as a non-blocking warning.

---

## 7. Navigation

Add a "Tournaments" link to the nav (`app/components/Header.tsx`) alongside the existing Lobbies / Manage Navy links.

---

## 8. Implementation Order

Build in this sequence to minimize blockers:

1. **Walrus utils** (`app/utils/walrus.ts`) — no contract dependency
2. **Contract config** — add Tournament ABI + address once deployed
3. **`useTournament` + `useTournamentList`** — read-only hooks, testable immediately
4. **Tournament list + detail pages** — shell pages with bracket read view
5. **`TournamentRegister.tsx`** — World ID IDKit integration
6. **`useTournamentActions`** — player write actions (register, claim, etc.)
7. **`useTournamentAdmin` + `TournamentAdminPanel`** — creator actions
8. **Game integration** — post-game Walrus upload + recordResult
9. **`MatchReplay`** — last, depends on Walrus + SimulatedGameDisplay refactor

---

## 9. Open Items

| # | Item | Blocker |
|---|---|---|
| A | New contract addresses (post-redeploy) | Can't wire anything without these |
| B | `feeRecipient` EOA — who receives the 1% protocol fee? | Needed for Tournament deploy constructor arg |
| C | Creator/admin EOA — same as `Lobbies` owner? Confirm before deploy | Needed for `createLobbyForAddresses` to work |
| D | `SimulatedGameDisplay` replay mode refactor | Needed for `MatchReplay` |
| E | `useTournamentMatchForGame(gameId)` — scan brackets to detect tournament games | Needed for automatic post-game Walrus upload |
| F | Nullifier scope confirmed as per-tournament | Confirmed in `tournament.md §12 O-3`; same human can enter multiple tournaments |

---

## 10. Constants & Values (from `tournament-frontend.md`)

```typescript
// World ID
WORLD_APP_ID         = "app_b2739b54eb71ceb8c76380c60c20ce22"
WORLD_ACTION         = "join-tournament"
WORLD_EXTERNAL_NULL  = 318078722027557965998987370672697888390534537434722412480399796468873891570n
WORLD_ID_ROUTER      = "0x42FF98C4E85212a5D31358ACbFe76a621b50fC02"  // Base Sepolia

// Walrus testnet
WALRUS_PUBLISHER     = "https://publisher.walrus-testnet.walrus.space/v1/blobs"
WALRUS_AGGREGATOR    = "https://aggregator.walrus-testnet.walrus.space/v1/blobs"

// Prize split
PROTOCOL_FEE_BPS     = 100   // 1%
CHAMPION_SHARE       = 0.60  // of remainder
RUNNER_UP_SHARE      = 0.40
```
