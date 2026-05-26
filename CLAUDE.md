# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js + Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint (v9 flat config)
```

There are no test commands — this project has no test suite.

## Architecture

**Void Tactics** is a turn-based tactical blockchain fleet combat game. The frontend is a Next.js 16 App Router app (React 19, TypeScript strict mode) that interacts with smart contracts across multiple EVM chains.

### Stack

- **Next.js 16** with Turbopack, App Router
- **wagmi 2 + viem 2** — Ethereum hooks and client
- **RainbowKit 2** — wallet connection UI
- **TanStack React Query 5** — server/chain state management
- **Tailwind CSS 4**
- **PostHog** — analytics (proxied via `/ingest/*` rewrites in `next.config.ts`)

### Multi-Chain Support

Four testnets are supported: **Flow Testnet** (id: 747, default), **Ronin Saigon** (2020), **Base Sepolia** (84532), **Xai Testnet v2** (37714555429). Chain selection is persisted to `localStorage` and triggers a custom event that invalidates React Query state. Chain config lives in `app/config/networks.ts`; deployed contract addresses per chain are in `app/contracts/<chain-name>/deployed_addresses.json`.

### Contract ABIs

`app/contracts/` contains ~88 JSON ABI files plus per-chain `deployed_addresses.json`. `app/config/contracts.ts` imports ABIs as `const` with `as const` assertions and exports typed address maps keyed by chain id. When referencing ABIs in hooks, always extract them as module-level `const` — never inline inside components.

### Key Directories

| Path | What's there |
|---|---|
| `app/components/` | UI components. `GameDisplay.tsx`, `GameGrid.tsx`, and `SimulatedGameDisplay.tsx` are the main game views (each 150–210 KB). `Lobbies.tsx` and `ManageNavy.tsx` handle pre-game flows. |
| `app/hooks/` | 34 custom hooks. `useContractEvents.ts` manages a global refetch registry for real-time blockchain events. `useShipImageCache.ts` pre-loads/caches canvas-rendered ship images. `useOnboardingTutorial.ts` is a step-driven state machine for the onboarding flow. |
| `app/config/` | `networks.ts` (chain definitions + selection logic), `contracts.ts` (ABI imports + address maps), `alpha.ts` (feature flags). |
| `app/utils/` | 23 utility modules. `shipRenderer/` handles canvas-based ship image generation. `shipAttributesCalculator.ts` computes derived ship stats. `tutorialStepScripts.ts` defines tutorial dialogue. |
| `app/types/` | `types.ts` (Ship, ShipEquipment, ShipTraits, etc.), `onboarding.ts`. |
| `app/providers/` | `TransactionContext` — wraps wagmi write calls with loading/error UI state. |
| `app/providers.tsx` | Root providers: wagmi, QueryClient, RainbowKit, TransactionProvider. |
| `app/[gameId]/` | Dynamic route for an active game session. |

### Data Flow

1. Wallet connects via RainbowKit → wagmi stores connection; selected chain stored in localStorage
2. `useContractEvents` registers wagmi `useWatchContractEvent` watchers for transfer and game events, calling registered refetch callbacks on events
3. Ship data fetched via `useOwnedShips` (reads contract) → images pre-loaded by `useShipImageCache`
4. Game state polled by `usePlayerGames`; client-side turn simulation handled by `useSimulatedGameState`
5. Transactions flow through `TransactionProvider` which surfaces pending/success/error toasts

## Critical: RPC Call Memoization

Excessive RPC calls will spam the node provider and cause rate limiting. Every wagmi hook config and every callback passed to wagmi hooks **must** be memoized:

```typescript
// ABIs at module level — never inline
const SHIP_ABI = ShipsABI as const;

// Config objects via useMemo
const watchConfig = useMemo(() => ({
  address: contractAddress,
  abi: SHIP_ABI,
  eventName: 'Transfer',
  chainId,
}), [contractAddress, chainId]);

// Handlers via useCallback
const handleTransfer = useCallback((logs) => {
  refetch();
}, [refetch]);

useWatchContractEvent({ ...watchConfig, onLogs: handleTransfer });
```

Only true dependencies belong in dependency arrays — don't include stable references like `refetch` from React Query unless they actually change. After any change to hooks, verify in DevTools Network that the number of RPC calls is not growing unboundedly on re-renders or user interactions.

## Path Aliases

`@/*` maps to the repo root (e.g., `@/app/config/contracts` resolves to `./app/config/contracts`).

## Security & Admin

API route security mirrors the smart contract pattern: `requireAuth()` establishes identity; DB queries filter by `userId`/`ownerId` so a caller gets 404/403 rather than another player's data. See `SECURITY_AND_ADMIN.md` for the full model.

**Admin access** is email-gated via `MAP_ADMIN_EMAILS` in `app/config/alpha.ts`. The admin email (`briandoyle81@gmail.com`) sees a **[SHIP ATTRIBUTES]** tab with an editable ship cost table. Saving bumps `costsVersion` and recalculates every ship in the DB.

**Ship costs** live in `app/lib/shipCosts.ts` (code defaults) and the DB `Config` table (key `"ship_costs"`, admin-editable at runtime). `calcShipCost()` is the single source of truth used by ship generation and recalculation. When the contract's `setCosts` changes: update via the admin panel → Save & Recalculate.

## Game Display Parity Rule

`SimulatedGameDisplay.tsx` (tutorial game view) and `GameDisplay.tsx` (live game view) must always look and feel identical. Any visual or layout change to one must be applied to the other.

The only permitted differences are elements that exist solely in `SimulatedGameDisplay` to support the tutorial: overlay panels, task lists, step-driven highlights, and simulated action feedback. Everything else — colors, spacing, typography, component structure — must stay in sync.
