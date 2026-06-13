# Void Tactics — Tournament System Design

> **Status:** Design / pre-implementation. No code written yet.
> **Date:** 2026-06-13
> **Scope:** New `Tournament` smart contract + integration with existing game contracts, World ID anti-sybil, and Walrus match records.
> **Hackathon tracks targeted:** World ID (Track C — existing projects integrating World ID), Walrus (verifiable match records), Flow (gameplay).

---

## 1. Summary of Decisions

These are the confirmed product decisions this design is built on:

| Topic | Decision |
|---|---|
| Target chain (tournament + game + World ID) | **Base Sepolia (chain `84532`)** — the full game is already deployed there, so everything is single-chain. |
| Multiplicity | **Registry**: one `Tournament` contract manages many tournaments via `mapping(uint => Tournament)`. Owner is not required to create tournaments (see "creator" below). |
| Match winner source | **Read on-chain from `GameResults[gameId]`** — trustless. The off-chain caller only supplies `matchId` + `gameId` + `walrusBlobId`. |
| Match → game creation | Tournament admin (the Lobbies owner) pairs the two players via `Lobbies.createLobbyForAddresses`, producing a game. |
| `gameId` ↔ `lobbyId` | **Unify them**: change the game contract so `gameId == lobbyId` (see §4). Removes ambiguity when linking a match to its game. |
| Bracket | **Single elimination**, seeded by registration order, byes for non-power-of-2 fields. |
| Advancement | **Auto on-chain**: when both feeder matches of a slot resolve, the contract creates the next-round match slot. Game creation + Walrus upload + result submission are done by the **frontend/backend** (no relayer code in this repo). |
| Prizes | **1% protocol fee** off the top, then **60 / 40** to 1st / 2nd of the remainder (no 3rd place). Tournament supports **one optional sponsor** (refundable on cancel) and **free entry** (`entryFee == 0`). |
| Draws (temporary) | A drawn game cannot advance the bracket on its own. **Temporary rule:** the match is awarded to whichever player **registered first** (lower registration index). Resolved by a creator-only call; marked temporary in code. |
| Field size / timing | Creator sets **min**, **max**, and **lastStartTime**. Anyone may `start()` when at max size, OR when `lastStartTime` passed and registrants ≥ min. Anyone may `cancel()` (refund) when below min after `lastStartTime`. |
| Per-match game config | **Fixed at tournament creation** (map, cost limit, turn time, max score), applied to every match. |
| World ID verification | On-chain via Base Sepolia `WorldIDRouter` (testnet), **Orb level / `groupId = 1`**. Testnet uses the **World ID Simulator** with a **staging `app_id`** and a pool of **fake test identities** (no real Orb scans). |

---

## 2. Architecture Overview

```
                         Base Sepolia (chain 84532)
 ┌──────────────────────────────────────────────────────────────────────┐
 │                                                                        │
 │   Player ──register(World ID proof + entryFee)──►  Tournament          │
 │                                                      │                 │
 │   Admin ──createLobbyForAddresses(p1,p2,cfg)──► Lobbies                 │
 │                                                  │                     │
 │   Players ──createFleet──► Lobbies ──startGame──► Game (gameId=lobbyId) │
 │                                                  │                     │
 │   Game end ──recordGameResult──► GameResults                           │
 │                                                  ▲                     │
 │   Anyone ──recordResult(matchId, gameId, blob)── reads winner from ────┘
 │                                                  GameResults
 │                                                      │
 │   When bracket complete ──finalize()──► Tournament splits prize pool   │
 │   Winners ──claim()──► pull payment                                    │
 └──────────────────────────────────────────────────────────────────────┘

         World ID                              Walrus (off-chain)
   ┌──────────────────┐              ┌────────────────────────────────┐
   │ WorldIDRouter     │              │ Frontend serializes MatchRecord │
   │ (Base Sepolia     │              │ → PUT publisher → blobId        │
   │  testnet router)  │              │ recordResult(..., blobId)       │
   └──────────────────┘              │ "View Record" → GET aggregator  │
                                      └────────────────────────────────┘
```

Everything that touches funds, identity, and results lives on **one chain** (Base Sepolia). The only off-chain actors are the **frontend/backend** that (a) collect the World ID proof, (b) create lobbies for matches, (c) upload Walrus blobs, and (d) call `recordResult`. None of these can forge a winner because the winner is read from `GameResults` on-chain.

### Deployed addresses (Base Sepolia, chain 84532)

> ⚠️ **All addresses will change.** The `gameId == lobbyId` change (§4) plus the new `Tournament` contract mean the **entire stack is redeployed fresh** on Base Sepolia (O-10). The table below is the **current** deployment, kept only for reference; every address becomes new after redeploy. Update this table and `ignition/deployments/chain-84532/deployed_addresses.json` post-deploy before wiring the frontend/backend.

| Contract | Current address (to be replaced) |
|---|---|
| `Game` (modified — §4) | `0xFc996f440CA9Bb841C26AB31c508E2BB43C38423` |
| `GameResults` | `0x9F3FAF7f8018C4bC68f6ea6490eA89AB025bf8Ac` |
| `Lobbies` | `0x2BAb5F458407d6D07c3bC0d1aaa6d2f08D2302a0` |
| `Fleets` | `0x69c86df545C96702429819d89b1E5Ad47164dF08` |
| `Ships` | `0x8e5d341F11CAdd5177Ce8ebD7D40AB10BbD27B6F` |
| `Maps` | `0xC14F9D9E667dCe0F27cE9Eb0f5f92fa4Aa366d7E` |
| `Tournament` (new) | — |

All of the above (and the renderers/etc.) are redeployed; collect the new addresses after deployment.

### World ID router (Base Sepolia testnet)

- `WorldIDRouter` (testnet): `0x42FF98C4...C02` (confirm full address from the World ID on-chain verification docs before deploy).
- On-chain `verifyProof` supports **Orb credentials only** → `groupId = 1`.
- **Testnet identities:** we don't have real Orb-verified humans on testnet, so registration proofs are generated by the **World ID Simulator** (`https://simulator.worldcoin.org`) against a **staging `app_id`**. This gives a pool of fake test users that produce valid Orb-level proofs the testnet router will verify. One simulator identity = one `nullifierHash` = one registration.

---

## 3. Hackathon Track Notes

- **World ID (Track C):** Gaming anti-sybil is a novel, non-financial use case. Without it, one human registers many wallets and fills the bracket to guarantee winning the pool. We bind one verified human to one registration via `nullifierHash` uniqueness, with the registrant's wallet address used as the signal.
- **Walrus:** Each completed match's full move history + final state is serialized and stored in Walrus; the 32-byte `blobId` is committed on-chain in the match, giving a verifiable, replayable record per match.
- **Flow:** Note the game is *also* deployed on Flow Testnet (chain 545). For the tournament we use the **Base Sepolia** deployment so World ID on-chain verification is possible. If a Flow demo is required, see **O-2**.

---

## 4. Required Change to Existing Contracts — `gameId == lobbyId`

This is the **only** change to existing audited contracts, and it is approved.

### Current behavior

`Lobbies` and `Game` maintain independent counters:

- `Lobbies.lobbyCount++` on each lobby creation.
- `Game.startGame` does `gameCount++` and keys the game by `gameCount` (`Game.sol` lines 95–148).

So `gameId` and `lobbyId` diverge.

### Change

In `Game.startGame`, key the game by the incoming `_lobbyId` instead of a separate counter:

- Replace `gameCount++; games[gameCount] ...` with `games[_lobbyId] ...` and `game.metadata.gameId = _lobbyId`.
- Use `_lobbyId` in all in-function references currently using `gameCount`: `applyPresetMapToGame`, `_initializeFleetAttributes`, `_placeShipsOnGrid`, the `gameAfterPlace` read, `playerGames[...].push`, and the `GameStarted` event.
- Keep `gameCount` as a simple "number of games started" tally (optional, for stats), but it is no longer the id.

### Why it's safe (blast radius)

- Every game is created from exactly one lobby (`Lobbies.createFleet` → `Game.startGame`), and a lobby can start a game at most once (status moves to `InGame` and never recreates). So `games[lobbyId]` keys are unique. `gameId`s become **sparse** (not every lobby starts a game), which is fine — all reads use `_gameId` as a mapping key, not a range.
- All other `Game.sol` functions already take `_gameId` as a parameter and index `games[_gameId]`; they are unaffected.
- `GameResults.recordGameResult(_gameId, ...)` is keyed by `_gameId`; it stays correct (now equal to `lobbyId`).
- `GameStarted(gameId, lobbyId, ...)` already carries both fields; after the change they're equal.

### Risks / things to verify during implementation

- **Off-chain/frontend code** in the *other* repo that assumes sequential, dense `gameId`s (e.g., iterating `1..gameCount`) must switch to event-driven discovery (`GameStarted`).
- `playerGames` now stores `lobbyId`s; any indexer mapping must be updated.
- Confirm no other contract reads `Game.gameCount` as an id source (grep shows it's internal to `Game.sol`).
- Re-run contract-size checks after the edit (must stay < 24 KiB; do **not** disable size checks).

> If we later decide we don't want to touch `Game.sol`, the fallback is an explicit `assignMatchGame(matchId, gameId)` admin call. The chosen approach (unify ids) is cleaner and was selected.

---

## 5. Tournament Contract Specification

New contract: `contracts/Tournament.sol`. `Ownable` (protocol owner) + `ReentrancyGuard`. Registry of many tournaments.

### 5.1 Enums

```solidity
enum TournamentState {
    Registration, // accepting registrants
    Active,       // bracket generated, matches in progress
    Complete,     // winner decided, prizes distributed/claimable
    Cancelled     // below min after lastStartTime; entries refundable
}
```

### 5.2 Structs

Because `Tournament` contains mappings, it lives only in storage (`mapping(uint => Tournament)`); it cannot be returned by value. Dedicated view getters expose the readable parts.

```solidity
struct TournamentConfig {
    uint256 entryFee;        // native wei; 0 == free entry
    uint32  minPlayers;      // must be >= 2
    uint32  maxPlayers;      // cap; bracket padded to next power of 2 with byes
    uint64  lastStartTime;   // unix seconds; start gate / cancel gate
    // Fixed per-match game config, applied to every match's lobby:
    uint256 costLimit;
    uint256 turnTime;
    uint256 selectedMapId;
    uint256 maxScore;
}

struct Match {
    uint256 matchId;        // index within the tournament's bracket
    uint8   round;          // 0 = first round
    address player1;
    address player2;        // address(0) == bye / not-yet-determined
    address winner;         // set on recordResult
    uint256 gameId;         // == lobbyId of the played game (0 until assigned)
    bytes32 walrusBlobId;   // match record pointer (0 until recorded)
    bool    resolved;
}

struct Tournament {
    uint256 id;
    address creator;
    TournamentState state;
    TournamentConfig config;

    uint256 prizePool;       // entry fees + sponsor contribution (native wei)
    address sponsor;         // single sponsor (address(0) if none); refunded on cancel
    uint256 sponsorAmount;   // sponsor's contribution (for refund math)

    address[] registrants;   // registration order == seed order
    mapping(address => bool) registered;
    mapping(uint256 => bool) usedNullifiers; // World ID nullifierHash → used (scoped to THIS tournament)

    Match[] bracket;         // flattened single-elim bracket
    uint8   totalRounds;
    address champion;        // set at finalize (final winner)
    address runnerUp;        // set at finalize (final loser)

    bool    prizesDistributed;
    mapping(address => uint256) winnings; // pull-payment balances
    mapping(address => bool) refunded;    // for cancelled tournaments
}
```

### 5.3 Storage (top level)

```solidity
IWorldID public worldId;          // Base Sepolia router
uint256 public immutable groupId; // 1 for Orb (see O-1)
uint256 public externalNullifier; // hash(appId, action) — per O-1/O-3
address public gameResults;       // GameResults address (winner source)
address public feeRecipient;      // receives 1% protocol fee
uint16  public constant PROTOCOL_FEE_BPS = 100; // 1.00%

uint256 public tournamentCount;
mapping(uint256 => Tournament) internal tournaments;
```

### 5.4 Events

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

### 5.5 Errors

```solidity
error NotInRegistration(); error AlreadyRegistered(); error NullifierUsed();
error WrongEntryFee(); error RegistrationFull(); error BelowMinPlayers();
error StartConditionsNotMet(); error CancelConditionsNotMet();
error NotActive(); error MatchNotFound(); error MatchAlreadyResolved();
error GameNotAssigned(); error ResultNotRecorded(); error WinnerNotInMatch();
error NothingToClaim(); error AlreadyRefunded(); error InvalidConfig();
error SponsorAlreadySet(); error NotCreator(); error NotSponsor();
```

### 5.6 Functions

#### Creation & funding

```solidity
function createTournament(TournamentConfig calldata cfg) external payable returns (uint256 tournamentId);
```
- Validates `minPlayers >= 2`, `maxPlayers >= minPlayers`, `lastStartTime > block.timestamp`, game config within bounds (`turnTime`, `costLimit ≤ maxFleetCostLimit`, map exists if non-zero).
- Sets `state = Registration`, `creator = msg.sender`.
- If `msg.value > 0`, the creator becomes the tournament's **single sponsor**: `sponsor = msg.sender; sponsorAmount = msg.value; prizePool += msg.value`. Free entry is simply `cfg.entryFee == 0`.

```solidity
function addSponsorPrize(uint256 tournamentId) external payable;
```
- Allowed in `Registration` or `Active`.
- **Only one sponsor per tournament.** If `sponsor == address(0)`, the caller becomes the sponsor. If a sponsor already exists, only that same `sponsor` may add more; any other caller reverts (`SponsorAlreadySet`).
- Adds `msg.value` to `prizePool` and `sponsorAmount`.

#### Registration (World ID gate)

```solidity
function register(
    uint256 tournamentId,
    uint256 root,
    uint256 nullifierHash,
    uint256[8] calldata proof
) external payable;
```
- Requires `state == Registration`, `block.timestamp <= lastStartTime` (or simply not-yet-started), `registrants.length < maxPlayers`.
- Requires `msg.value == config.entryFee`.
- Requires `!registered[msg.sender]` and `!usedNullifiers[nullifierHash]`.
- Verifies World ID:
  ```solidity
  worldId.verifyProof(
      root,
      groupId,
      abi.encodePacked(msg.sender).hashToField(), // signal = registrant address
      nullifierHash,
      externalNullifier,
      proof
  );
  ```
- On success: mark `usedNullifiers[nullifierHash] = true`, `registered[msg.sender] = true`, push to `registrants`, `prizePool += msg.value`.
- If `registrants.length == maxPlayers` after this, the tournament is eligible for `start()` immediately (does not auto-start; see `start`).

> `hashToField` comes from World ID's `ByteHasher` library. `externalNullifier` is precomputed from `appId` + `action` (see O-3).

#### Starting / cancelling

```solidity
function start(uint256 tournamentId) external; // permissionless
```
Allowed when `state == Registration` and **either**:
- `registrants.length == maxPlayers`, **or**
- `block.timestamp > lastStartTime` AND `registrants.length >= minPlayers`.

Effects: builds the single-elimination bracket (see §6), sets `totalRounds`, `state = Active`, emits `TournamentStarted`.

```solidity
function cancel(uint256 tournamentId) external; // permissionless
```
Allowed when `state == Registration`, `block.timestamp > lastStartTime`, and `registrants.length < minPlayers`. Sets `state = Cancelled`.

```solidity
function claimRefund(uint256 tournamentId) external nonReentrant;
```
- Allowed when `state == Cancelled`.
- If the caller is a registered, not-yet-refunded player, refunds `config.entryFee` and marks `refunded[caller] = true` (pull payment).
- If the caller is the `sponsor` and `sponsorAmount > 0`, refunds `sponsorAmount` and zeroes it. (A single address that is both player and sponsor can claim both, once each.)

#### Match → game linkage & results

```solidity
function assignMatchGame(uint256 tournamentId, uint256 matchId, uint256 gameId) external;
```
- Restricted to the **tournament `creator`** (`NotCreator` otherwise).
- Called **after** creating the match's lobby via `Lobbies.createLobbyForAddresses` (recall `gameId == lobbyId`).
- Stores `gameId` on the match; emits `MatchGameAssigned`. Idempotent until resolved.

```solidity
function recordResult(uint256 tournamentId, uint256 matchId, bytes32 walrusBlobId) external; // permissionless
```
- Requires `state == Active`, match exists, `!resolved`, `gameId != 0`.
- Reads the canonical result from `GameResults.getGameResult(gameId)`:
  - Requires the result is recorded (else `ResultNotRecorded`).
  - Requires `{winner, loser} == {player1, player2}` of the match (else `WinnerNotInMatch`). This binds the on-chain game to this specific match and the two enrolled players.
- Sets `match.winner`, `match.walrusBlobId`, `match.resolved = true`; emits `MatchResolved`.
- Calls internal `_advance(tournamentId, matchId)` (see §6) to propagate the winner into the next-round slot, creating that `Match` when both feeders are resolved (`NextRoundMatchCreated`).
- If this resolves the final, sets `champion`/`runnerUp` and emits readiness for `finalize`.

> The `walrusBlobId` is **not** trusted for correctness — it's an opaque pointer. The winner is always from `GameResults`. A wrong/missing blob only degrades the replay UX, not prize integrity.

```solidity
function resolveDraw(uint256 tournamentId, uint256 matchId, bytes32 walrusBlobId) external; // TEMPORARY
```
- **Temporary fix for drawn games.** A draw sets the game's winner to `address(0)` and is **not** written to `GameResults` (see `Game._endGame`), so `recordResult` can't resolve it.
- Restricted to the tournament `creator` (the only off-chain actor who knows a draw occurred — there is no on-chain "draw" flag in `Game` today).
- Awards the match to the player who **registered first** (the lower index in `registrants`) — deterministic, so the creator has no discretion over the outcome, only over invoking it. Sets `winner`, `walrusBlobId`, `resolved`, then `_advance`.
- **Marked `// TEMPORARY` in code.** A proper fix would add a draw/ended indicator to `Game` (we can, since all contracts are being redeployed — see §4 note) or a deterministic on-chain tiebreak (e.g., score, then ship count). Deferred.

#### Finalize & claim

```solidity
function finalize(uint256 tournamentId) external; // permissionless
```
- Requires the final match resolved. Computes the split, credits `winnings[...]`, sets `state = Complete`, `prizesDistributed = true`, transfers the 1% fee to `feeRecipient`. Emits `TournamentFinalized`.

```solidity
function claim(uint256 tournamentId) external nonReentrant;
```
- Pull-payment: transfers `winnings[msg.sender]` (set to 0 first). Emits `PrizeClaimed`.

#### Views

```solidity
function getTournamentConfig(uint256) external view returns (TournamentConfig memory);
function getTournamentSummary(uint256) external view returns (TournamentState state, uint256 prizePool, uint256 registrantCount, uint8 totalRounds, address champion);
function getRegistrants(uint256) external view returns (address[] memory);
function getMatch(uint256 tournamentId, uint256 matchId) external view returns (Match memory);
function getBracket(uint256) external view returns (Match[] memory);
function isRegistered(uint256, address) external view returns (bool);
function winningsOf(uint256, address) external view returns (uint256);
```

---

## 6. Bracket: Single Elimination

- **Seeding:** registration order (`registrants[0]` is seed 1, etc.).
- **Size:** pad to the next power of two `N`. The number of byes is `N - registrants.length`. Standard seeding gives the top seeds the byes (seed 1 plays the lowest, etc.). A bye is modeled as `player2 == address(0)`; the present player auto-advances at start (or on first `_advance`).
- **Bracket storage:** flattened `Match[]`, **all slots pre-allocated at `start()`** for a power-of-two field of size `N` (`N - 1` total matches: `N/2` first-round, down to 1 final). First-round slots are filled with seeded players; later-round slots start empty (`player1 == player2 == address(0)`) and are populated by `_advance`. Pre-allocation keeps `matchId` indexing stable and simple.
- **`_advance(matchId)`:** determines the parent slot in the next round, writes the winner into `player1` or `player2`, and emits `NextRoundMatchCreated` once that parent slot has both players.
- **Byes:** resolved automatically at `start()` so round 2 can begin immediately for those slots.

### Off-chain responsibilities (frontend/backend repo — NO relayer in this repo)

For each unresolved match where both players are known:
1. Admin calls `Lobbies.createLobbyForAddresses(player1, player2, costLimit, turnTime, selectedMapId, maxScore)` using the tournament's fixed config. Capture `lobbyId` (== future `gameId`) from the `LobbyCreated` event.
2. Admin calls `Tournament.assignMatchGame(tournamentId, matchId, lobbyId)`.
3. Players build fleets and play (existing flow). Game ends → `GameResults` records the winner.
4. Frontend serializes the `MatchRecord`, uploads to Walrus, gets `blobId`.
5. Anyone calls `Tournament.recordResult(tournamentId, matchId, blobId)`.

Provide these as scripts/instructions in the frontend/backend repo, not as a Solidity relayer here.

---

## 7. Prize Distribution

Let `P = prizePool` (entry fees + sponsor funds).

1. **Protocol fee:** `fee = P * 1% (100 bps)` → `feeRecipient`.
2. **Remainder** `R = P - fee` split between the two finalists (no 3rd place):
   - 1st (champion): `60% * R`
   - 2nd (runner-up): `40% * R`

This works for every field size ≥ 2, since single elimination always produces exactly one final match with a champion and a runner-up. Rounding: integer math; assign any wei remainder (dust) to the champion.

> A draw cannot advance a bracket. `GameResults` does not record draws (winner `address(0)` is skipped in `Game._endGame`). Tournament matches must produce a decisive winner via normal play, `endGameOnTimeout`, or `flee`. See O-8.

---

## 8. World ID Integration Detail

### Frontend (IDKit)

```tsx
<IDKitWidget
  app_id={WORLD_STAGING_APP_ID}        // staging app id (testnet)
  action="tournament_register"
  signal={userAddress}                 // bind proof to wallet
  verification_level={VerificationLevel.Orb}  // on-chain verification requires Orb (groupId 1)
  onSuccess={(r) => register(tournamentId, r.merkle_root, r.nullifier_hash, decodeProof(r.proof))}
>
  {({ open }) => <button onClick={open}>Verify & Register</button>}
</IDKitWidget>
```

`onSuccess` provides `{ merkle_root, nullifier_hash, proof }`. The `proof` is ABI-decoded to `uint256[8]` for the contract call.

**Testing:** because the app is **staging** and the level is **Orb**, the IDKit flow routes to the **World ID Simulator** instead of a real World App. Each simulated identity yields a distinct `nullifierHash`, giving the pool of fake test users needed to fill a bracket. No real Orb verification is involved on testnet.

### Contract

- Implements the canonical pattern: `IWorldID.verifyProof(root, groupId, signalHash, nullifierHash, externalNullifier, proof)` with `signalHash = abi.encodePacked(msg.sender).hashToField()` and `ByteHasher` for `hashToField`.
- `externalNullifier = abi.encodePacked(abi.encodePacked(appId).hashToField(), action).hashToField()` (precompute, set in constructor or setter).
- Stores `usedNullifiers[nullifierHash]` to enforce one-human-one-entry **per tournament** (mapping lives inside each `Tournament`, so the same human can enter different tournaments — confirm in O-3 whether uniqueness should be global instead).

### Deploy-time config

- `worldId` = Base Sepolia `WorldIDRouter` (confirm full testnet address from docs).
- `groupId` = `1` (Orb) for on-chain verification.
- Consider deploying behind a proxy per World ID's recommendation (optional for hackathon).

---

## 9. Walrus Integration Detail (frontend/backend)

On-chain we only store `bytes32 walrusBlobId` per match. All Walrus I/O is off-chain.

### MatchRecord (serialized to JSON)

```typescript
interface MatchRecord {
  tournamentId: number;
  matchId: number;
  gameId: number;       // == lobbyId
  timestamp: number;
  player1: string;
  player2: string;
  winner: string;
  turns: TurnRecord[];          // full move history (from useSimulatedGameState)
  finalShipPositions: ShipPosition[];
  finalHullValues: Record<number, number>;
}
```

### Write flow

1. Game ends (`GameUpdate` / `GameResultRecorded`).
2. Frontend serializes the `MatchRecord` (data already in memory via `useSimulatedGameState` / `GameDisplay`).
3. `PUT https://publisher.walrus-testnet.walrus.space/v1/blobs` → returns `blobId`.
4. Convert `blobId` to the 32-byte form expected by the contract.
5. Call `recordResult(tournamentId, matchId, blobId)`.

### Read flow

- Bracket page shows a "View Record" link per resolved match.
- `GET https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}`.
- Render read-only replay (reuse `SimulatedGameDisplay` in a read-only mode).

### New files (other repo)

- `app/utils/walrus.ts` — `uploadMatchRecord(record): Promise<string>`, `fetchMatchRecord(blobId): Promise<MatchRecord>`.
- `app/hooks/useMatchRecord.ts` — React Query wrapper with caching.
- `app/components/TournamentRegister.tsx` — IDKit registration flow.

> Walrus `blobId` ↔ `bytes32` and serialization are handled entirely in the **other repo** by capturing game events and storing the JSON record there. On-chain, `recordResult`/`resolveDraw` accept whatever `bytes32` the frontend supplies (may be `bytes32(0)` if a blob isn't attached); it's an opaque pointer and never affects prize integrity.

---

## 10. Security Considerations

- **Trustless winner:** winner read from `GameResults`; `recordResult` is permissionless and cannot install a false winner because of the `{winner,loser} == {player1,player2}` binding.
- **Pull payments:** `claim` / `claimRefund` use checks-effects-interactions + `ReentrancyGuard`; no push transfers in result paths.
- **World ID replay:** per-tournament `usedNullifiers` prevents double registration; signal-binds to wallet to prevent proof reuse across wallets.
- **Game spoofing:** an attacker could create an unrelated lobby between the same two players. Mitigated because `assignMatchGame` is admin-gated and `recordResult` only accepts the assigned `gameId`. (If we ever drop admin assignment, this binding weakens — keep it.)
- **Reentrancy via World ID router:** `verifyProof` is a view-like external call; still place state writes after verification and avoid value transfer in `register` beyond accounting.
- **Fee/rounding:** integer division dust assigned to champion; fee computed before split.
- **Existing audit items:** unrelated to tournaments but note `endGameOnTimeout` front-running (M-07) and draw edge cases (L-04) interact with how matches conclude — handled at the game layer.
- **Contract size:** keep `Tournament` under 24 KiB; do not enable any "ignore contract size" option (repo rule). Use libraries if needed.

---

## 11. Deployment & Wiring

1. Implement the `gameId == lobbyId` change in `Game.sol`; recompile and verify contract size (< 24 KiB; do not disable size checks).
2. **Redeploy the entire stack** fresh on Base Sepolia (all contracts, per O-10) via Ignition, then run the existing wiring (`Game.setAddresses`, `Lobbies.setGameAddress`/`setFleetsAddress`/`setMapsAddress`, `GameResults.setGameContract`, etc.). All addresses change.
3. Add a `Tournament` Ignition module: deploy with constructor args `(worldIdRouter, groupId=1, externalNullifier, gameResults, feeRecipient)` using the **newly deployed** `GameResults` address.
4. The tournament admin (the per-tournament `creator` who pairs matches) must be (or be granted) the **owner of `Lobbies`** so it can call `createLobbyForAddresses` (off-chain admin EOA, not the contract).
5. Add Base Sepolia network + verification config (already present in `hardhat.config.ts` as `base-sepolia`).
6. **Record the new addresses:** after redeploy, update `ignition/deployments/chain-84532/deployed_addresses.json`, the address table in §2 of this doc, and the frontend/backend config. All prior addresses are superseded.

---

## 12. Resolved Questions

All previously-open questions are now resolved:

- **O-1 (World ID level):** Use **Orb on-chain** (`groupId = 1`) verified against the Base Sepolia testnet router. Testnet proofs come from the **World ID Simulator** with a **staging `app_id`** (pool of fake test identities).
- **O-2 (Flow demo):** **No Flow Testnet path.** Base Sepolia only.
- **O-3 (nullifier scope):** **Per-tournament** uniqueness — the same human may enter different tournaments, but only once each. (`usedNullifiers` lives inside each `Tournament`.) Action string `tournament_register`; staging `app_id` provided at deploy.
- **O-4 (sponsor refunds):** **One sponsor per tournament**, refunded their `sponsorAmount` on cancel.
- **O-5 (admin authority):** The tournament **`creator`** calls `assignMatchGame` / `resolveDraw` and creates the lobbies.
- **O-6 (bracket storage):** **Pre-allocate** all bracket slots at `start()`.
- **O-7 (small-field prizes):** No 3rd place; finalists split `R` 60/40 (works for any field ≥ 2).
- **O-8 (draws):** **Temporary rule** — drawn match awarded to the **first-to-register** player via the creator-only `resolveDraw`, marked `// TEMPORARY` (see §5.6).
- **O-9 (Walrus encoding):** Handled in the **other repo** (capture events → store JSON). On-chain blob is an opaque `bytes32`.
- **O-10 (redeploy):** **Redeploy all contracts** fresh on Base Sepolia; collect new addresses afterward.

### Remaining inputs needed at implementation/deploy time (config, not design)

- Staging World ID `app_id` and the confirmed Base Sepolia `WorldIDRouter` full address.
- `feeRecipient` address for the 1% protocol fee.
- The admin EOA that will own `Lobbies` and act as tournament `creator`.
```