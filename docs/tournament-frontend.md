# Void Tactics — Tournament Frontend/Backend Integration Guide

> **Audience:** the frontend + backend service repo (not this contracts repo).
> **Chain:** Base Sepolia (`84532`). Everything — game, results, World ID
> verification, prizes — is on this one chain.
> **Companion docs:** `docs/tournament.md` (full contract design).

This guide tells the frontend/backend exactly what to call, in what order, with
which values, to run a tournament end‑to‑end. The on‑chain winner is always read
from `GameResults`, so the off‑chain orchestrator **cannot forge a result** — it
only wires matches to games and submits pointers.

---

## 1. Constants

### World ID (v3 / legacy on‑chain, Orb level)

| Item | Value |
|---|---|
| `app_id` | `app_b2739b54eb71ceb8c76380c60c20ce22` |
| `action` | `join-tournament` |
| `verification_level` | **Orb** (on‑chain path requires Orb → `groupId = 1`) |
| `externalNullifier` (uint256) | `318078722027557965998987370672697888390534537434722412480399796468873891570` |
| `WorldIDRouter` (Base Sepolia) | `0x42FF98C4E85212a5D31358ACbFe76a621b50fC02` |

- `externalNullifier` is **not secret**. It is `hashToField(abi.encodePacked(hashToField(app_id), action))`.
  The frontend's IDKit config MUST use the same `app_id` + `action`, or on‑chain
  `verifyProof` rejects every proof. (Recompute with
  `npx hardhat run scripts/computeExternalNullifier.ts` in the contracts repo.)
- World ID merged staging/production into one `app_id`; there is no separate
  staging id.

### Walrus (testnet)

| Item | Value |
|---|---|
| Publisher (PUT) | `https://publisher.walrus-testnet.walrus.space/v1/blobs` |
| Aggregator (GET) | `https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}` |

### Contract addresses — fill in after deploy

> The whole stack is redeployed fresh; collect addresses from
> `ignition/deployments/chain-84532/deployed_addresses.json` after deployment.

| Contract | Address |
|---|---|
| `Tournament` | `TBD` |
| `Lobbies` | `TBD` |
| `Game` | `TBD` |
| `GameResults` | `TBD` |
| `Ships` | `TBD` |

ABIs come from this repo's `artifacts/contracts/<Name>.sol/<Name>.json` (the
`abi` field). Ship them with the frontend, or generate types with your tool of
choice.

---

## 2. Roles

| Role | Who | Responsibilities |
|---|---|---|
| **Player** | end users | World ID verify → `register`, play their matches, `claim` winnings. |
| **Tournament creator** | the EOA that calls `createTournament` | Calls `assignMatchGame` and (if needed) `resolveDraw`. **Must also be the `Lobbies` owner** so it can call `createLobbyForAddresses`. |
| **Backend service** | your relayer | Watches events, creates lobbies per match, assigns games, uploads Walrus records, submits `recordResult`. Holds no power to change winners. |
| **Firebase Flow minter** | `0x7f9dc2D68FF842EC79DA722B68E3ca7e5aa31CCb` | Authorized to mint Ships (same rights as `ShipPurchaser`) so players can be granted ships/fleets for matches. |

> The tournament `creator` and the `Lobbies` owner must be the **same EOA** (or
> the creator must be granted Lobbies ownership). `createLobbyForAddresses` is
> `onlyOwner` on `Lobbies`; `assignMatchGame`/`resolveDraw` are `creator`‑only on
> `Tournament`.

---

## 3. World ID registration flow

### 3.1 IDKit widget

```tsx
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";

<IDKitWidget
  app_id="app_b2739b54eb71ceb8c76380c60c20ce22"
  action="join-tournament"
  signal={userAddress}                       // MUST be the wallet that will send register()
  verification_level={VerificationLevel.Orb} // on-chain requires Orb
  onSuccess={(result) => registerOnChain(tournamentId, result, userAddress)}
>
  {({ open }) => <button onClick={open}>Verify & Register</button>}
</IDKitWidget>
```

The `signal` binds the proof to the registrant's wallet. The contract recomputes
the signal as `hashToField(abi.encodePacked(msg.sender))`, so **the wallet that
sends `register` must equal the `signal`**.

### 3.2 Decode the proof and call `register`

IDKit's `onSuccess` returns `{ merkle_root, nullifier_hash, proof }`. The `proof`
is ABI‑encoded bytes and must be decoded to `uint256[8]`:

```ts
import { decodeAbiParameters } from "viem";

function registerOnChain(tournamentId: bigint, result, userAddress) {
  const unpackedProof = decodeAbiParameters(
    [{ type: "uint256[8]" }],
    result.proof as `0x${string}`
  )[0];

  // entryFee in wei must be sent as msg.value (read from getTournamentConfig)
  walletClient.writeContract({
    address: TOURNAMENT_ADDRESS,
    abi: tournamentAbi,
    functionName: "register",
    args: [
      tournamentId,
      BigInt(result.merkle_root),    // root
      BigInt(result.nullifier_hash), // nullifierHash
      unpackedProof,                 // uint256[8]
    ],
    value: entryFeeWei,              // 0 for free-entry tournaments
  });
}
```

`register` reverts with: `WrongEntryFee` (msg.value ≠ entryFee), `AlreadyRegistered`,
`NullifierUsed` (this human already registered for this tournament),
`RegistrationFull`, `RegistrationClosed` (past `lastStartTime`), or the World ID
router's own revert if the proof is invalid.

---

## 4. Tournament lifecycle (contract calls)

All signatures below are the actual `Tournament` external API.

### 4.1 Create

```solidity
function createTournament(TournamentConfig calldata cfg) external payable returns (uint256 tournamentId);

struct TournamentConfig {
    uint256 entryFee;      // wei; 0 == free entry
    uint32  minPlayers;    // >= 2
    uint32  maxPlayers;
    uint64  lastStartTime; // unix seconds
    uint256 costLimit;     // per-match game config (applied to every lobby)
    uint256 turnTime;
    uint256 selectedMapId;
    uint256 maxScore;
}
```
- Send `msg.value > 0` to also become the tournament's single **sponsor** (added
  to the prize pool, refundable on cancel).
- `tournamentId` is returned, but writes don't return values to the frontend —
  read it from the `TournamentCreated` event or `tournamentCount()`.

Optional extra sponsorship (single sponsor only):
```solidity
function addSponsorPrize(uint256 tournamentId) external payable; // Registration or Active
```

### 4.2 Register
See §3. (`register(tournamentId, root, nullifierHash, proof[8])` payable.)

### 4.3 Start (permissionless)

```solidity
function start(uint256 tournamentId) external;
```
Allowed when **either** `registrants == maxPlayers`, **or**
`block.timestamp > lastStartTime && registrants >= minPlayers`. Builds the bracket,
auto‑resolves byes, sets state `Active`. Reverts `StartConditionsNotMet` otherwise.

### 4.4 Per‑match orchestration (backend)

For each unresolved bracket match where **both** `player1` and `player2` are set:

1. **Create the lobby** (creator/Lobbies owner):
   ```solidity
   Lobbies.createLobbyForAddresses(
     player1, player2, costLimit, turnTime, selectedMapId, maxScore
   ); // onlyOwner
   ```
   Use the tournament's fixed config (from `getTournamentConfig`). Capture the
   `lobbyId` from the `LobbyCreated(uint indexed lobbyId, ...)` event.
   **`gameId == lobbyId`** (see §5).

2. **Link the match to the game** (creator):
   ```solidity
   Tournament.assignMatchGame(tournamentId, matchId, lobbyId);
   ```

3. **Players play** the existing flow: each builds a fleet
   (`Lobbies.createFleet(lobbyId, shipIds, startingPositions)`); once both fleets
   are set the game starts (`Game.GameStarted(gameId, lobbyId, ...)`). The game
   ends normally (win / `flee` / `endGameOnTimeout`) → `GameResults` records
   `GameResultRecorded(gameId, winner, loser, ts)`.
   - Players need ships. The backend can mint via the authorized Firebase minter
     (`0x7f9d…1CCb`) if it grants ships to players.

4. **Upload the match record to Walrus** (see §6), get the `blobId`.

5. **Submit the result** (permissionless):
   ```solidity
   Tournament.recordResult(tournamentId, matchId, walrusBlobId); // bytes32
   ```
   The contract reads `GameResults.getGameResult(gameId)` and requires
   `{winner, loser} == {player1, player2}`. It sets the winner, stores the blob,
   and auto‑advances the winner into the next round (emitting
   `NextRoundMatchCreated` once a parent slot has both players). Reverts:
   `GameNotAssigned`, `WinnerNotInMatch`, `MatchAlreadyResolved`, or the
   `GameResults` `GameNotFound` if the game hasn't finished yet.

### 4.5 Draws (temporary, creator‑only)

A drawn game is **not** written to `GameResults`, so `recordResult` can't resolve
it. Temporary rule — award to the earlier registrant (lower seed):
```solidity
function resolveDraw(uint256 tournamentId, uint256 matchId, bytes32 walrusBlobId) external; // creator only
```

### 4.6 Finalize & claim

```solidity
function finalize(uint256 tournamentId) external;              // permissionless; after final resolved
function claim(uint256 tournamentId) external;                 // pull-payment for champion/runner-up/feeRecipient
```
Finalize splits the pool (see §7), credits pull‑payment balances, sets state
`Complete`. Each winner (and the fee recipient) then calls `claim`.

### 4.7 Cancel & refund

```solidity
function cancel(uint256 tournamentId) external;        // permissionless; below min after lastStartTime
function claimRefund(uint256 tournamentId) external;   // players get entryFee back; sponsor gets sponsorAmount
```

---

## 5. `gameId == lobbyId` and event‑driven discovery

- A lobby starts **at most one** game, and the game is keyed by the lobby id, so
  `gameId == lobbyId`. After `createLobbyForAddresses`, the `lobbyId` from
  `LobbyCreated` **is** the `gameId` to pass to `assignMatchGame` and to read from
  `GameResults`.
- `gameId`s are **sparse** (not every lobby starts a game). **Do not** iterate
  `1..gameCount`. Discover games via the `GameStarted` / `GameResultRecorded`
  events, keyed by id.

---

## 6. Walrus match records

On‑chain only a `bytes32 walrusBlobId` is stored per match; it's an opaque
pointer and never affects prize integrity (winner is from `GameResults`). A
missing/invalid blob only degrades replay UX.

### MatchRecord (serialize to JSON)

```ts
interface MatchRecord {
  tournamentId: number;
  matchId: number;
  gameId: number;        // == lobbyId
  timestamp: number;
  player1: string;
  player2: string;
  winner: string;
  turns: TurnRecord[];           // full move history
  finalShipPositions: ShipPosition[];
  finalHullValues: Record<number, number>;
}
```

### Write flow
1. Game ends (`GameUpdate` / `GameResultRecorded`).
2. Serialize the `MatchRecord` (data already in memory in the game UI).
3. `PUT https://publisher.walrus-testnet.walrus.space/v1/blobs` → returns a
   `blobId`.
4. Convert the `blobId` to the 32‑byte form expected by the contract.
5. `recordResult(tournamentId, matchId, blobId)`.

### Read flow
- "View Record" per resolved match → `GET .../v1/blobs/{blobId}` → render a
  read‑only replay.

### Suggested files (frontend repo)
- `app/utils/walrus.ts` — `uploadMatchRecord(record): Promise<string>`, `fetchMatchRecord(blobId): Promise<MatchRecord>`.
- `app/hooks/useMatchRecord.ts` — query wrapper with caching.
- `app/components/TournamentRegister.tsx` — IDKit registration.

---

## 7. Prize math

`P = prizePool` (entry fees + sponsor). On `finalize`:
1. Protocol fee: `fee = P * 1% (100 bps)` → `feeRecipient` (the deployer).
2. Remainder `R = P - fee`:
   - Champion (1st): `60% * R` (plus integer dust).
   - Runner‑up (2nd): `40% * R`.

No 3rd place. Works for any field ≥ 2.

---

## 8. Read views for UI

```solidity
function getTournamentConfig(uint256) external view returns (TournamentConfig memory);
function getTournamentSummary(uint256) external view returns (
  TournamentState state, address creator, uint256 prizePool,
  uint256 registrantCount, uint8 totalRounds, address champion, address runnerUp
);
function getRegistrants(uint256) external view returns (address[] memory);
function getBracket(uint256) external view returns (Match[] memory);
function getMatch(uint256 tournamentId, uint256 matchId) external view returns (Match memory);
function isRegistered(uint256, address) external view returns (bool);
function winningsOf(uint256, address) external view returns (uint256);
function tournamentCount() external view returns (uint256);

enum TournamentState { Registration, Active, Complete, Cancelled }

struct Match {
  uint256 matchId; uint8 round; address player1; address player2;
  address winner; uint256 gameId; bytes32 walrusBlobId; bool resolved;
}
```

- Build the bracket UI from `getBracket`. A match is **playable** when
  `player1 != 0 && player2 != 0 && !resolved`. A bye shows as `player2 == 0` and
  `resolved == true`.
- Poll/subscribe to events for live updates: `Registered`, `TournamentStarted`,
  `MatchGameAssigned`, `MatchResolved`, `NextRoundMatchCreated`,
  `TournamentFinalized`, `PrizeClaimed`, `TournamentCancelled`, `Refunded`.

---

## 9. Events reference

```solidity
event TournamentCreated(uint256 indexed tournamentId, address indexed creator, uint256 entryFee, uint32 minPlayers, uint32 maxPlayers, uint64 lastStartTime);
event SponsorAdded(uint256 indexed tournamentId, address indexed sponsor, uint256 amount);
event Registered(uint256 indexed tournamentId, address indexed player, uint256 nullifierHash);
event TournamentStarted(uint256 indexed tournamentId, uint8 totalRounds, uint256 matchCount);
event MatchGameAssigned(uint256 indexed tournamentId, uint256 indexed matchId, uint256 gameId);
event MatchResolved(uint256 indexed tournamentId, uint256 indexed matchId, address winner, bytes32 walrusBlobId);
event NextRoundMatchCreated(uint256 indexed tournamentId, uint256 indexed matchId, uint8 round);
event TournamentFinalized(uint256 indexed tournamentId, address champion, address runnerUp);
event PrizeClaimed(uint256 indexed tournamentId, address indexed player, uint256 amount);
event TournamentCancelled(uint256 indexed tournamentId);
event Refunded(uint256 indexed tournamentId, address indexed player, uint256 amount);
```

---

## 10. Checklist before going live

- [ ] Fill the address table (§1) from the post‑deploy `deployed_addresses.json`.
- [ ] Confirm the `Tournament` was deployed pointing at the **real** Base Sepolia
      WorldIDRouter (`0x42FF98C4…fC02`), not the mock.
- [ ] Confirm on‑chain `externalNullifier` matches §1 (and the IDKit `app_id` +
      `action`).
- [ ] Ensure the tournament `creator` EOA is the `Lobbies` owner.
- [ ] IDKit on the **Orb** path; decode `proof` to `uint256[8]`; `signal` = the
      registering wallet.
- [ ] Wire Walrus upload/fetch; pass `bytes32` blobId to `recordResult`.
```
