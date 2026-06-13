# ETH NYC Hackathon Plan

**Project:** Void Tactics — turn-based blockchain fleet combat
**Track:** Continuity (existing project)
**Sponsors:** Sui (Walrus), World ID, Dynamic

---

## Prize Targets

| Sponsor | Track | Max Prize |
|---|---|---|
| Sui | Best product integrating Walrus (Continuity) | $3,000 |
| World | Track C — Existing projects integrating World ID (Continuity) | $1,500 |
| Dynamic | Best Overall Use | $2,500 |
| Dynamic | Best Use of Flow | $3,000 |
| **Total** | | **$10,000** |

Note: Two Dynamic prizes from one project — confirm with ETHGlobal/Dynamic before the event whether one submission can win both tracks.

---

## Feature Overview

Four integrations, each doing genuine work:

1. **Tournament mode** — bracketed competitive play with entry and prize distribution
2. **Walrus match records** — every completed game stores a permanent record blob; blob ID anchored on-chain
3. **World ID anti-sybil** — tournament registration requires a World ID proof; one human = one bracket slot
4. **Dynamic** — social login + embedded wallets (web2 onboarding); Dynamic Flow for cross-chain ship purchases

---

## 1. Tournament Smart Contract

New Solidity contract deployed on Flow Testnet (chain 747, the game's default chain).

### Storage

```solidity
struct Tournament {
    uint256 id;
    uint256 entryFee;           // in native FLOW wei
    uint256 prizePool;
    address[] registrants;
    mapping(address => bool) registered;
    mapping(uint256 => bytes32) nullifiers; // World ID nullifiers
    Match[] bracket;
    TournamentState state;      // Open | Active | Complete
}

struct Match {
    uint256 gameId;             // links to existing VoidTactics game contract
    address player1;
    address player2;
    address winner;
    bytes32 walrusBlobId;       // set when game ends
}
```

### Key Functions

- `register(uint256 nullifierHash, uint256[8] proof)` — validates World ID proof, stores nullifier, accepts entry fee
- `startTournament()` — admin/owner closes registration, generates bracket (single elimination or round-robin for small counts)
- `recordResult(uint256 matchId, address winner, bytes32 walrusBlobId)` — called by game contract or trusted relayer when a tournament game ends; stores Walrus blob ID
- `claimPrize(uint256 tournamentId)` — winner withdraws prize pool

### Integration with Existing Game Contract

The existing game contract already tracks outcomes. Two options:
- **Option A (simpler):** Add a trusted relayer address to the tournament contract that can call `recordResult`. The relayer watches for `GameEnded` events and submits the result + Walrus blob ID.
- **Option B (cleaner):** The existing game contract calls a callback on the tournament contract when a tournament game ends. Requires a small modification to the game contract to accept a callback address at game creation.

Option A is the right call for the hackathon — no changes to audited game contract logic.

---

## 2. Walrus Match Records

### What Gets Stored

At game end, serialize a match record blob containing:

```typescript
interface MatchRecord {
  tournamentId: number;
  matchId: number;
  gameId: number;
  timestamp: number;
  player1: string;
  player2: string;
  winner: string;
  turns: TurnRecord[];       // full move history
  finalShipPositions: ShipPosition[];
  finalHullValues: Record<number, number>;
}
```

The game state is already fully tracked in the frontend via `useSimulatedGameState` / `GameDisplay`. Serializing it at game end is straightforward — the data is already in memory.

### Write Flow

1. Game ends (existing `GameEnded` event fires)
2. Frontend serializes the match record as JSON
3. POST to Walrus testnet blob endpoint
4. Walrus returns a `blobId` (32-byte hash)
5. Relayer (or winner's frontend) calls `recordResult(matchId, winner, blobId)` on tournament contract

### Read Flow

- Tournament bracket page shows each completed match with a "View Record" link
- Fetch blob from Walrus using `blobId`
- Render a read-only replay view (reuse `SimulatedGameDisplay` in a read-only mode)

### New Files

- `app/utils/walrus.ts` — `uploadMatchRecord(record: MatchRecord): Promise<string>` and `fetchMatchRecord(blobId: string): Promise<MatchRecord>`
- `app/hooks/useMatchRecord.ts` — wraps the fetch with React Query caching

### Walrus Endpoints (Testnet)

- Upload: `PUT https://publisher.walrus-testnet.walrus.space/v1/blobs`
- Fetch: `GET https://aggregator.walrus-testnet.walrus.space/v1/blobs/{blobId}`

---

## 3. World ID Anti-Sybil

**Prize target:** Track C — "Existing projects integrating World ID." Judges evaluate novelty of use case and technical integration readiness. Gaming anti-sybil is novel — most submissions are financial apps.

**What breaks without it:** A single player registers multiple wallets and fills the bracket, guaranteeing they win the prize pool.

### Frontend

Add IDKit to the tournament registration flow:

```tsx
// app/components/TournamentRegister.tsx
import { IDKitWidget, VerificationLevel } from "@worldcoin/idkit";

<IDKitWidget
  app_id="app_void_tactics"
  action="tournament_register"
  verification_level={VerificationLevel.Device}  // Device-level; no iris scan required
  onSuccess={handleWorldIdSuccess}
>
  {({ open }) => (
    <button onClick={open}>Verify & Register</button>
  )}
</IDKitWidget>
```

`onSuccess` receives `{ nullifier_hash, proof, merkle_root }`. Pass these to the tournament contract's `register()` function.

### Smart Contract Verification

The tournament contract calls the World ID router on-chain to verify the proof:

```solidity
IWorldID public worldId;
uint256 public immutable externalNullifier;
mapping(uint256 => bool) public usedNullifiers;

function register(
    uint256 root,
    uint256 nullifierHash,
    uint256[8] calldata proof
) external payable {
    require(msg.value == entryFee, "Wrong entry fee");
    require(!usedNullifiers[nullifierHash], "Already registered");

    worldId.verifyProof(
        root,
        groupId,
        abi.encodePacked(msg.sender).hashToField(),
        nullifierHash,
        externalNullifier,
        proof
    );

    usedNullifiers[nullifierHash] = true;
    registrants.push(msg.sender);
    registered[msg.sender] = true;
}
```

World ID contracts are deployed on many EVM chains. Check worldcoin.org/docs for the Flow Testnet router address; if not available, use Base Sepolia for the tournament contract and bridge/relay as needed.

### Verification Level

Use `VerificationLevel.Device` (World App on phone, no iris scan). Reduces friction substantially while still preventing trivial multi-wallet abuse. For the hackathon demo this is the right tradeoff.

---

## 4. Dynamic

Two distinct integrations targeting two separate prize tracks.

### 4a. Social Login + Embedded Wallet (Best Overall Use — $2,500)

**What changes:** Replace RainbowKit with Dynamic in `app/providers.tsx`. Existing wagmi hooks, `useWriteContract`, and `TransactionContext` are unchanged — Dynamic provides a wagmi-compatible connector.

#### `app/providers.tsx` changes

```tsx
// Remove:
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";

// Add:
import { DynamicContextProvider, DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

// Replace RainbowKitProvider + WagmiProvider with:
<DynamicContextProvider
  settings={{
    environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENV_ID!,
    walletConnectors: [EthereumWalletConnectors],
  }}
>
  <DynamicWagmiConnector>
    <QueryClientProvider client={queryClient}>
      <TransactionProvider>
        {children}
      </TransactionProvider>
    </QueryClientProvider>
  </DynamicWagmiConnector>
</DynamicContextProvider>
```

#### The confirm widget story (no popup for embedded wallet users)

`GameGridConfirmWidget` is **unchanged**. When a player who logged in via Google/email clicks the confirm button:

1. `onConfirmMove` fires (unchanged)
2. wagmi `writeContract` is called (unchanged)
3. Dynamic's embedded wallet connector signs silently — **no popup**
4. Transaction is submitted

For MetaMask/external wallet users, their wallet's own popup still appears. This is expected and not a regression.

#### New login entry point

Add a `<DynamicWidget />` or `<DynamicConnectButton />` to the homepage/lobby. This replaces the RainbowKit connect button and adds social login options (Google, email, etc.).

### 4b. Dynamic Flow for Ship Purchases (Best Use of Flow — $3,000)

**Current state:** `useShipPurchasing.ts` calls `writeContract` with `value: tierPrice` in native FLOW wei. Players must hold FLOW on Flow Testnet to buy ships.

**With Dynamic Flow:** Players can pay with any supported token on any chain. Dynamic Flow handles the swap and bridge; the contract still receives native FLOW.

#### Changes to `useShipPurchasing.ts`

```typescript
import { useDynamicFlow } from "@dynamic-labs/flow";

// Replace the writeContract call with:
const { initiateFlow } = useDynamicFlow();

const purchaseShips = async (tier: number) => {
  const tierPrice = pricesWei[tier] ?? 0n;

  await initiateFlow({
    destinationChain: "flow-testnet",
    destinationToken: "FLOW",
    amount: formatEther(tierPrice),
    recipient: shipsContractAddress,
    onSuccess: (txHash) => {
      toast.success("Ships purchased!");
      refetchShips();
    },
  });
};
```

Dynamic Flow presents its own payment selector UI (source chain, source token). The player picks what they have; Flow settles in FLOW to the contract. The rest of `ManageNavy.tsx` is unchanged.

---

## Component / File Checklist

### New files

| File | Purpose |
|---|---|
| `app/utils/walrus.ts` | Upload and fetch match record blobs |
| `app/hooks/useMatchRecord.ts` | React Query wrapper for Walrus fetch |
| `app/components/TournamentRegister.tsx` | Registration UI with IDKit + entry fee |
| `app/components/TournamentBracket.tsx` | Bracket view with match records and Walrus links |
| `app/hooks/useTournament.ts` | Read tournament state from contract |
| `contracts/Tournament.sol` | Tournament contract (new repo or subdirectory) |

### Modified files

| File | Change |
|---|---|
| `app/providers.tsx` | Swap RainbowKit → Dynamic providers |
| `app/hooks/useShipPurchasing.ts` | Replace `writeContract` with Dynamic Flow |
| `app/components/ManageNavy.tsx` | Wire Flow payment result back to existing UI state |

### Unchanged files (explicitly)

- `app/components/GameGridConfirmWidget.tsx` — no changes needed; embedded wallet signs silently
- `app/components/GameDisplay.tsx` — no changes needed
- `app/components/SimulatedGameDisplay.tsx` — no changes needed
- All existing wagmi hooks — Dynamic connector is wagmi-compatible

---

## Prize Qualification Checklist

### Sui / Walrus

- [ ] App reads from or writes to Walrus as a core part of the tournament flow
- [ ] Working demo: complete a tournament game, show the blob ID recorded on-chain, fetch and display the match record
- [ ] Existing product adopting Walrus (not built from scratch)

### World ID (Track C)

- [ ] Existing product with a clear plan for what ships/improves during the hackathon
- [ ] World ID used meaningfully — proof verified on-chain, nullifier prevents double registration
- [ ] Demo: attempt to register the same World ID twice, show it is rejected

### Dynamic (Best Overall Use)

- [ ] Dynamic SDK integrated in a meaningful way
- [ ] App deployed and usable by judges
- [ ] Demo: log in with Google → play a game → confirm move without any wallet popup

### Dynamic (Best Use of Flow)

- [ ] Dynamic Flow implemented in the ship purchase flow
- [ ] Demo: purchase a ship using a token on a different chain (e.g. ETH on Base), show it settles on Flow Testnet

---

## Demo Script (3 minutes)

1. **Open the app as a new user.** Click "Sign in with Google." Wallet is created automatically. No MetaMask.
2. **Purchase a ship.** Show Dynamic Flow: player pays with ETH, ship appears on Flow Testnet.
3. **Enter tournament.** Click "Register." IDKit modal opens, player approves in World App. Entry fee paid. Show that attempting to register again with the same World ID is rejected.
4. **Play a tournament match.** Submit a move — no wallet popup. The game confirm widget IS the transaction.
5. **Game ends.** Show the match record blob ID stored on-chain. Click "View Record" — fetch from Walrus, render the match summary.

---

## Open Questions Before Building

1. **Two Dynamic prizes from one project** — confirm with Dynamic sponsor at the event before building both integrations.
2. **World ID on Flow Testnet** — verify the World ID router contract is deployed on Flow EVM (chain 747). If not, the tournament contract may need to deploy on Base Sepolia and the entry fee bridged, or use off-chain proof verification via a backend.
3. **Walrus blob TTL on testnet** — testnet blobs may expire. Confirm storage period covers the demo window.
4. **Tournament bracket size** — for the demo, hardcode a 4-player bracket. Larger tournaments can be a post-hackathon feature.
5. **Relayer for `recordResult`** — decide whether the winner's browser calls `recordResult` (simpler, trust the client) or a backend relayer watches for `GameEnded` events (more robust). Browser-side is fine for the hackathon.
