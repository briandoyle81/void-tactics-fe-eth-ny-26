# Void Tactics — Frontend

**Hackathon Live Deployment:** https://void-tactics-fe-eth-ny-26.vercel.app/
**Original Deployment:** https://www.voidtactics.xyz
**Contracts:** https://github.com/briandoyle81/warpflow-contracts

Void Tactics is a turn-based tactical space combat game where players build fleets of NFT ships and fight on a 17×11 grid. Every move, every outcome, every tournament result is resolved on-chain. The frontend is a Next.js 16 App Router application — wagmi, viem, TanStack Query, and Tailwind — talking directly to EVM contracts on Base Sepolia (and three other testnets).

---

## What's New Since the Hackathon Started

The contracts are described in detail in the contracts repo README. This document covers what was built on the frontend side — mostly features that live entirely here, between the browser and the chain.

### Ship Purchases via Dynamic Flow

Players need ships to play. The ship purchase flow now runs through [Dynamic](https://dynamic.xyz) using their Flow payment SDK. A player picks a ship type, Dynamic opens a payment modal, the transaction goes through Flow's cross-chain rails, and the contract mints the ship NFT. No swap-and-bridge step visible to the user.

Dynamic also handles all wallet connection across the app — the same session powers login, signing, and payment without making the user juggle multiple auth steps. For a game that's supposed to be accessible to people outside the usual DeFi power-user demographic, that's the whole point.

### Tournament Registration with World ID

Tournaments have an entry requirement: prove you're a unique human. Clicking "Register" opens the [World ID](https://world.org) IDKit widget, which generates a proof from the player's World App. The proof is verified on-chain against the Base Sepolia `WorldIDRouter` — the contract checks the nullifier against its stored set, binds the proof to `msg.sender`, and only then accepts the entry fee.

The reason this matters for a bracket: one person running five wallets should not be able to buy five spots. Without some form of uniqueness enforcement, a funded attacker can fill any open tournament. World ID is the only live production solution to that problem that doesn't require KYC.

The rp-context endpoint (`/api/world-id/rp-context`) issues a short-lived signed nonce using the managed RP signing key. No frontend secret exposure; no server-side wallet.

### Game Recording and Match Replay (Walrus)

Every confirmed move uploads a full game state snapshot to [Walrus](https://walrus.site) — a decentralized blob store that's chain-agnostic and Sui-based, accessed here entirely over HTTP from an EVM app. Each player maintains their own blob; when you submit a move, the upload also includes your opponent's last move (already in client memory at submission time), so either player's blob contains the complete record.

**Why this matters beyond just storage:** EVM RPC providers cap historical event log queries to 2,000–10,000 blocks per request. Reconstructing move-by-move game history from on-chain events via a browser is unreliable past a certain game length — you hit pagination limits and rate caps. Walrus sidesteps the problem entirely: one blob fetch returns the full game state, no matter how long the game ran or how long ago it was played.

The replay UI is built directly into the game view: a "Replay" button appears during any live game. It fetches the current snapshot from Walrus, loads it into memory, and lets the player step backward and forward through every move with Prev / Next / Play / Pause / Exit controls. Exiting replay drops back to the live board exactly where the game is now.

At game end, a final archive blob is uploaded with a 1-month TTL and the blob ID is recorded on-chain via `GameBlobRegistry.record()`. Tournament matches additionally call `Tournament.recordResult()`. After that point, the replay survives independently of the team running any server.

---

## The Game Itself

### Fleet Building

Players assemble fleets from their owned NFT ships, staying within a threat budget. Ships have procedurally generated stats (accuracy, hull, speed) and equipment (weapon, armor, shield, special). Expensive ships are more capable but allow fewer slots; cheaper ships give more numbers at the cost of individual power. Fleets are committed before the game starts.

### Combat

Turns alternate between players. Each turn, a player selects a ship, moves it within range, and chooses an action: shoot, use a special ability, claim a scoring tile, ram, or pass. Line of sight is enforced for weapons (but not specials). Damage is calculated from weapon stats minus armor reduction. A ship reduced to 0 HP is destroyed — permanently.

Ship destruction is permanent. The NFT still exists, but the destroyed flag is set in the contract and the ship is ineligible for future fleets. Players decide in real time whether to spend a ship to win a round or pull it back and fight another day.

### Scoring

Certain tiles on the map award victory points to the first ship to occupy them (and on subsequent turns for some). Reaching the point threshold wins the game. Completely destroying the enemy fleet also wins. Maps are configurable, and the scoring geometry is part of pre-game lobby setup.

### Onboarding

A fully scripted tutorial (locally simulated, no gas) walks new players through every game mechanic — movement, shooting, specials, scoring, retreat — before they commit an NFT ship to a real match. Tutorial completion unlocks a claimable reward on Base Sepolia.

---

## Supported Networks

The app runs on four testnets. Chain selection is in the UI and persists to `localStorage`. Contract addresses per chain are in `app/contracts/<chain>/deployed_addresses.json`.

| Network        | Chain ID    | Entry Point                                                        |
| -------------- | ----------- | ------------------------------------------------------------------ |
| Base Sepolia   | 84532       | `https://void-tactics-fe-eth-ny-26.vercel.app/?chain=base-sepolia` |
| Flow Testnet   | 747         | `?chain=flow-testnet`                                              |
| Ronin Saigon   | 2020        | `?chain=ronin-saigon`                                              |
| Xai Testnet v2 | 37714555429 | `?chain=xai-testnet-v2`                                            |

Tournaments and Walrus recording are Base Sepolia only (where the Tournament and GameBlobRegistry contracts are deployed).

---

## Stack

- **Next.js 16** (App Router, Turbopack)
- **wagmi 2 + viem 2** — chain interaction and contract reads/writes
- **Dynamic** — wallet connection, authentication, and Flow payments
- **TanStack React Query 5** — server and chain state
- **World ID IDKit v4** — human uniqueness verification for tournament registration
- **Walrus testnet** — decentralized blob storage for game state and replays
- **Tailwind CSS 4**
- **PostHog** — analytics

## Running Locally

```bash
npm install
npm run dev
```

Requires `.env` with RPC URLs, Dynamic API keys, World RP signing key, and ship minter private key. See `.env.example` if present, or the CLAUDE.md in the root for variable names.
