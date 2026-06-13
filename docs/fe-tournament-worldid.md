# Void Tactics — Tournament Frontend: World ID Plan

> **Chain:** Base Sepolia only (`84532`).
> **Companion:** `docs/fe-tournament-walrus.md` (Walrus / replay — do this second).
> **Source docs:** `docs/tournament.md` (contract spec), `docs/tournament-frontend.md` (integration guide).
> **Status:** Pre-implementation. Contract addresses TBD (post-redeploy).

---

## 0. Prerequisites

### 0.1 Contracts must be deployed first

The entire Base Sepolia stack is redeployed fresh (see `tournament.md §11`). Do **not** start frontend wiring until the new addresses are in hand. Once deployed:

- Add `Tournament` address to `app/contracts/base-sepolia/deployed_addresses.json`
- Add Tournament ABI + address to `app/config/contracts.ts`

### 0.2 Install dependencies

```bash
npm install @worldcoin/idkit
```

No other new dependencies — viem and wagmi already handle contract calls.

---

## 1. Contract Config

### 1.1 ABI file

Copy from the contracts repo's `artifacts/contracts/Tournament.sol/Tournament.json` (the `abi` field):

```
app/contracts/TournamentABI.json
```

Existing ABIs already present and reused:
- `app/contracts/LobbiesABI.json` — for `createLobbyForAddresses`
- `app/contracts/GameResultsABI.json` — for admin verification

### 1.2 `app/config/contracts.ts` additions

```typescript
import TournamentABI from "@/app/contracts/TournamentABI.json";
export const TOURNAMENT_ABI = TournamentABI as const;
// Add TOURNAMENT address to the Base Sepolia address map
```

### 1.3 World ID + tournament constants (`app/config/tournament.ts`) — new file

```typescript
export const WORLD_APP_ID = "app_b2739b54eb71ceb8c76380c60c20ce22" as const;
export const WORLD_ACTION = "join-tournament" as const;
export const WORLD_EXTERNAL_NULLIFIER =
  318078722027557965998987370672697888390534537434722412480399796468873891570n;
export const WORLD_ID_ROUTER = "0x42FF98C4E85212a5D31358ACbFe76a621b50fC02" as const;
```

---

## 2. Hooks

### 2.1 `app/hooks/useTournamentList.ts`

Reads `tournamentCount()` then fetches `getTournamentSummary(id)` for each. Used on the list page.

```typescript
export function useTournamentList()
// → { tournaments: TournamentSummary[], isLoading }
```

`TournamentSummary` is the `getTournamentSummary` return value plus `tournamentId`.

### 2.2 `app/hooks/useTournament.ts`

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

### 2.3 `app/hooks/useTournamentActions.ts`

Write actions available to any player. Uses `TransactionContext` for loading/error UI.

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
// then:
writeContract({ functionName: "register", args: [tournamentId, BigInt(idKitResult.merkle_root), BigInt(idKitResult.nullifier_hash), unpackedProof], value: entryFeeWei })
```

**Revert messages to surface as user-readable copy:**

| Revert | User message |
|---|---|
| `WrongEntryFee` | "Incorrect entry fee" |
| `AlreadyRegistered` | "You're already registered" |
| `NullifierUsed` | "This World ID has already registered for this tournament" |
| `RegistrationFull` | "Tournament is full" |
| `RegistrationClosed` | "Registration has closed" |

### 2.4 `app/hooks/useTournamentAdmin.ts`

Write actions restricted to the tournament creator / Lobbies owner. Used in the admin panel only.

| Function | Contract call(s) |
|---|---|
| `createMatchLobby(tournamentId, matchId, match)` | `Lobbies.createLobbyForAddresses(p1, p2, costLimit, turnTime, mapId, maxScore)` → parse `LobbyCreated` log → `Tournament.assignMatchGame(id, matchId, lobbyId)` |
| `submitResult(tournamentId, matchId, blobId)` | `Tournament.recordResult(id, matchId, blobId)` |
| `resolveDraw(tournamentId, matchId, blobId)` | `Tournament.resolveDraw(id, matchId, blobId)` |
| `finalize(tournamentId)` | `Tournament.finalize(id)` |

`createMatchLobby` is a two-step sequence: create lobby, wait for receipt, parse `LobbyCreated` log to extract `lobbyId` (== future `gameId`), then assign. Use `waitForTransactionReceipt` + `parseEventLogs` between steps.

---

## 3. Components

### 3.1 `app/components/TournamentRegister.tsx`

IDKit widget + on-chain register flow. Rendered during `Registration` state only.

```tsx
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";
import { WORLD_APP_ID, WORLD_ACTION } from "@/app/config/tournament";

// Logic:
// 1. If isRegistered → show "Already registered"
// 2. If not connected → show "Connect wallet to register"
// 3. Otherwise render IDKitWidget:
<IDKitWidget
  app_id={WORLD_APP_ID}
  action={WORLD_ACTION}
  signal={connectedAddress}          // MUST equal the wallet that sends register()
  verification_level={VerificationLevel.Orb}
  onSuccess={(r) => void actions.register(tournamentId, r)}
>
  {({ open }) => (
    <button onClick={open}>Verify with World ID & Register</button>
  )}
</IDKitWidget>
```

**Important:** `signal` must be the wallet address that will call `register()`. The contract recomputes `hashToField(abi.encodePacked(msg.sender))` and rejects proofs where the signal doesn't match.

Show entry fee clearly if `config.entryFee > 0`. Surface revert errors as readable messages (see §2.3 table).

### 3.2 `app/components/TournamentBracket.tsx`

Visual single-elimination bracket. Read-only, driven by `bracket: Match[]` from `useTournament`.

**Layout:** rounds left-to-right (round 0 leftmost, final rightmost).

**Match card states:**

| Condition | Display |
|---|---|
| `player1 == 0` | Grey placeholder — "TBD" |
| `player2 == 0 && resolved` | Player 1 name + "BYE" |
| `!resolved && gameId == 0` | Both players, "Awaiting game setup" |
| `!resolved && gameId != 0` | Both players, "Game in progress" (link to game) |
| `resolved` | Both players, winner highlighted, result pill |

Walrus "View Replay" button is added in the Walrus phase — leave a `{match.walrusBlobId !== zeroHash && <ReplayLink />}` placeholder slot.

**No write actions in this component** — all writes live in the admin panel.

### 3.3 `app/components/TournamentCard.tsx`

Summary card for the tournament list. Shows: state badge, prize pool (formatted ETH), player count / max, entry fee, time remaining to register (countdown) or time until start-eligible.

### 3.4 `app/components/TournamentAdminPanel.tsx`

Rendered only when `connectedAddress === summary.creator`. Three sections:

**1. Match queue** — matches where `player1 != 0 && player2 != 0 && !resolved && gameId == 0`:
- "Create Lobby & Assign Game" button per match → `createMatchLobby`

**2. Resolve draws** — matches where `!resolved && gameId != 0` (admin knows a draw occurred off-chain; no on-chain flag today):
- "Resolve as Draw" button per match → `resolveDraw(tournamentId, matchId, bytes32(0))` (no Walrus blob needed; add blob support in Walrus phase)

**3. Finalize** — shown when all bracket matches are `resolved`:
- "Finalize Tournament" button → `finalize`

---

## 4. Pages / Routes

### 4.1 `app/tournaments/page.tsx`

Tournament list page. Uses `useTournamentList`.

Layout:
- Header: "Tournaments" + "Create" button (open to all, or creator-gated — TBD)
- Active / Registration tab
- Completed tab (collapsible)
- Each entry: `<TournamentCard tournamentId={id} />`

### 4.2 `app/tournaments/[tournamentId]/page.tsx`

Main tournament page. Component composition:

```tsx
<TournamentHeader />       // name/id, state badge, prize pool, timing
<TournamentRegister />     // Registration state only
<TournamentBracket />      // always shown; refreshes via events
<TournamentAdminPanel />   // creator wallet only
<ClaimSection />           // shown when winnings > 0 (Complete state)
<RefundSection />          // shown when Cancelled + registered
```

---

## 5. Navigation

Add "Tournaments" to the nav in `app/components/Header.tsx` alongside the existing Lobbies / Manage Navy links.

---

## 6. Implementation Order

1. `app/config/tournament.ts` — constants, no deps
2. `app/contracts/TournamentABI.json` + `app/config/contracts.ts` update — once addresses available
3. `useTournamentList` + `useTournament` — read hooks, testable against deployed contract
4. `app/tournaments/page.tsx` + `TournamentCard` — list view shell
5. `app/tournaments/[tournamentId]/page.tsx` + `TournamentBracket` — detail view shell
6. `TournamentRegister` + `useTournamentActions.register` — World ID registration flow
7. `useTournamentActions` remaining actions (start, cancel, claim, claimRefund)
8. `useTournamentAdmin` + `TournamentAdminPanel` — creator flow
9. Navigation addition

---

## 7. Open Items

| # | Item | Blocker |
|---|---|---|
| A | New contract addresses (post-redeploy) | Nothing can be wired without these |
| B | `feeRecipient` EOA | Needed for Tournament deploy constructor |
| C | Creator/admin EOA confirmed as Lobbies owner | Needed for `createLobbyForAddresses` to work |
| F | Per-tournament nullifier scope confirmed | ✅ Confirmed (`tournament.md §12 O-3`) |
