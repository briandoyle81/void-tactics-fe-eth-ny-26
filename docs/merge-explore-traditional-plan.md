# Plan: Merge `explore-traditional` into `main` (Web3 + Web2 Toggle)

## Reality check on scope

The two branches diverged much further than "a little UI/UX drift." They
share a merge-base at `a989c53` ("Add weapon impact effects"), and the full
diff is **346 files changed, +36,547/-76,514 lines**. `explore-traditional`
is a wholesale conversion of the data layer from on-chain
(wagmi/viem/contracts) to a traditional Postgres/Neon + Prisma backend with
~33 new REST/SSE API routes, plus roughly 20 commits of independent UI/UX and
gameplay work layered on top of that conversion.

This is not a mergeable-as-is branch — it's two different games sharing a
UI skeleton. The realistic path is **not** `git merge`, but a manual port:
cherry-pick the web2-independent improvements onto `main`, and separately
build a "web2 mode" that plugs a new data layer in behind the existing
components. Good news: `explore-traditional` already has its own porting
notes at `docs/port-improvements-to-master.md`, written by whoever built it,
which pre-scopes most of this. This plan builds on top of that doc rather
than re-deriving it.

## Architecture: what actually differs

| Layer | `main` (web3) | `explore-traditional` (web2) |
|---|---|---|
| Data source | wagmi/viem reads & writes against deployed contracts | `prisma/` (Postgres/Neon) + `app/api/*` (~33 route handlers: games, lobbies, ships, leaderboard, maps, tutorial, user stats, admin, NextAuth) |
| Auth/identity | Wallet connection (RainbowKit) | NextAuth (`AuthButton.tsx`, `Connect.tsx`) + `useCurrentUser.ts` |
| Chain config | `app/providers.tsx`, `app/config/networks.ts`, `app/config/contracts.ts` | Stubbed/removed — no multi-chain, no wagmi provider |
| Game state hooks | `use*Contract.ts` hooks hitting wagmi | Same filenames, gutted to hit REST/SSE instead (`useGameStream.ts`, `useGamePolling.ts`) |
| Payments | On-chain (Flow payment modal, USD/UTC purchase flows via contract) | In-app currency via `HeaderUtcWidget.tsx` + `/api/ships/purchase/usd|utc` |
| Removed subsystems | N/A | Tournament system and Flow-payment components deleted entirely (`useTournament*.ts` ×4, `TournamentAdminPanel/Bracket/Card/Register.tsx`, `useFlowPaymentModal.ts`, `FlowPaymentButton/Modal.tsx`) |

**Implication for "switch between web3 and web2":** this needs a real
abstraction boundary — a data-access layer that either calls contracts or
calls the new API routes depending on a mode flag — not a simple merge. The
tournament and Flow-payment systems would need to be explicitly kept
web3-only (they don't exist on the web2 side at all).

## UI/UX differences in shared components (needs your confirmation)

These are changes explore-traditional made to files that exist on both
branches, independent of the backend swap. Grouped by whether they're safe
"port regardless" improvements or product decisions.

### Safe to port either way (pure quality/perf, no product decision)

- **`GameGrid.tsx`**: tooltip and confirm-widget JSX extracted into
  `GameGridTooltip.tsx`/`GameGridConfirmWidget.tsx`; 8 inline `useMemo`
  set-builders consolidated into a `useGridCellSets` hook; an O(n²)
  arrow-origin fallback removed; pan `mousemove` now RAF-throttled.
- **`GameDisplay.tsx` / `SimulatedGameDisplay.tsx`**: hover/label-target
  logic extracted into `gameGridRanges.ts` utils and a
  `useDamageCalculation` hook; inline font strings replaced with shared
  `STYLE_LABEL`/`STYLE_MONO` constants (kept in parity between the two
  files, per the existing parity rule in CLAUDE.md).
- **`SimulatedGameDisplay.tsx`**: fix so `retreatPrepShipId` only shows when
  `actionOverride === ActionType.Retreat` — a genuine tutorial/live parity
  bug fix (was previously eager in tutorial mode only).
- **Weapon animation components** (10 files under `weapon-animations/`):
  wrapped in `React.memo`; hardcoded timing constants centralized into
  `app/constants/animationTiming.ts`; `mountedRef` guards to prevent
  post-unmount state updates. `globals.css` gained a `game-bg-override`
  variable and four new Flak explosion keyframes.
- **`selectedWeaponType`** widened to include `"ram"` — new ramming-move
  support in `GameGrid.tsx`.

**Recommendation:** port all of these regardless of the web2/web3 decision —
`port-improvements-to-master.md` already has line-by-line instructions for
each (its Tier A/B/C plan).

### Needs a product decision before porting

1. **AI opponent** ("PLAY vs AI" in `Lobbies.tsx` + `/api/lobbies/vs-ai`).
   The decision logic itself (`aiDispatch.ts`, `aiEvaluate.ts`,
   `aiGreedy.ts`, `aiIterativeDeepening.ts`, `aiMinimax.ts`) is pure/portable
   with zero web3 dependency. The lobby-creation plumbing is web2-only
   (REST route) — a web3 version would need either a client-side "vs AI"
   mode that skips the lobby contract, or a new contract flow.
   → **Do you want AI opponents in the web3 version, and if so, contract
   changes or client-only?**
2. **Ship-selection pagination** (`ManageNavy.tsx`): `shipPage` state,
   `SHIPS_PER_PAGE = 100`, "Showing X–Y of Z" with prev/next controls. Pure
   frontend, no backend dependency.
   → **Port as-is to both versions?** (Recommend yes — straightforward.)
3. **Relaxed ship recycling** (`ManageNavy.tsx`): `canRecycle` changed from a
   contract-gated check (`amountPurchased >= 10`) to always `true`, plus
   support for recycling multiple selected ships in one action. The
   multi-select UX is portable; the gating relaxation is a rules change that
   main's contract currently enforces via `recycleReward`/`amountPurchased`.
   → **Keep the 10-purchase minimum on web3, or relax the contract too?**
4. **Draw/tie game outcomes** (`Games.tsx`): UI is built (`TIE_ADDRESS`
   sentinel, purple "DRAW" styling) but depends on the on-chain
   `GameContract` actually emitting a draw winner value.
   → **Does main's deployed contract support draw outcomes today?** If not,
   this is blocked on a contract change, not just a frontend port.
5. **`Lobbies.tsx` opponent-fleet-preview**: reworked around REST fetches on
   explore-traditional — pure web2 plumbing, not a UI decision, just needs
   re-implementing against contract reads for the web3 path.
6. **`Header.tsx`**: RainbowKit wallet button replaced with
   `AuthButton.tsx`/`Connect.tsx` + new `HeaderUtcWidget.tsx` on web2. For a
   combined app, the header likely needs to conditionally render
   wallet-connect vs. auth-button + currency widget based on mode.
7. **`Info.tsx`**: only a 69-line diff — likely a minor copy/layout tweak
   despite a commit message mentioning "info page"; worth a quick visual
   diff rather than a real decision point.

### Not net-new (already exists on main)

- **Replay for live games**: `GameDisplay.tsx` already has this on `main`
  (see the companion Walrus plan doc). Explore-traditional's version is
  REST-adapted, not an additional feature — keep main's implementation,
  no port needed here (though note the Walrus-removal plan changes how
  main's version persists data, independent of this merge).

## What must stay web3-only (per explore-traditional's own notes)

Confirmed via `docs/port-improvements-to-master.md` on that branch — its
author already identified these as web2 conversion artifacts, not to be
ported: `useAccount.ts` (wagmi stub), `useCurrentUser.ts`, `useGameStream.ts`,
gutted `useShipAttributesContract.ts`/other `use*Contract*.ts` stubs,
`providers.tsx`, `ensureUiChainsInWallet.ts`/`switchWalletChain.ts` (these
were deleted on web2 but are required on web3), `next-auth.d.ts`, and
everything under `app/api/`, `app/lib/`, `prisma/`.

Also dropped entirely on web2 and needing an explicit decision: the
**tournament system** and **Flow-payment flow**. If the combined app is
meant to support both modes, these either need to (a) stay web3-only
(hidden/disabled in web2 mode), or (b) get a web2 equivalent built — this
wasn't attempted on `explore-traditional` at all.

## Proposed integration approach

Rather than merging the branches, treat this as three separate tracks:

1. **Cherry-pick the "safe to port" UI/perf improvements** listed above onto
   `main` directly, following the Tier A/B/C recipe already written in
   `docs/port-improvements-to-master.md` (it gives exact files and even
   specific commits to cherry-pick, e.g. `42ae37a` for the overload damage
   fix, `434aaad` for `TutorialGridPanelConfigs.tsx`).
2. **Resolve the product decisions above** (AI opponent scope, recycle
   gating, draw outcomes, header mode-switching) before touching those files.
3. **Build a data-layer abstraction** so a single codebase can run in web3
   mode (contracts) or web2 mode (API routes) behind a runtime toggle —
   this is the actual "combine main and explore-traditional" work, and it's
   a substantial new effort, not a diff-reconciliation. Realistically this
   means introducing an interface (e.g. a `GameDataProvider`) that both the
   existing `use*Contract.ts` hooks and new REST-backed hooks implement, and
   swapping the implementation based on a mode flag (similar in spirit to
   the existing chain-selection-via-localStorage pattern in
   `app/config/networks.ts`).

## Open questions for you to confirm

1. Do you want the AI opponent feature in the web3 version? Client-only or
   contract-backed?
2. Should web3 keep the 10-purchase recycle minimum, or relax it to match
   web2?
3. Does main's `GameContract` support draw/tie outcomes today? If not, is
   that in scope for this effort?
4. Should tournaments and Flow-payments be web3-only (hidden in web2 mode),
   or do they need web2 equivalents eventually?
5. Given the scale of the data-layer work (item 3 above), do you want this
   staged — e.g. ship the safe UI/perf cherry-picks first as a quick win,
   then tackle the web2/web3 toggle as a separate, larger effort?
