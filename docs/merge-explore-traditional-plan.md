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

### Product decisions — resolved

1. **AI opponent: eliminated.** Do not port "PLAY vs AI" in `Lobbies.tsx`,
   `/api/lobbies/vs-ai`, or the AI utility files (`aiDispatch.ts`,
   `aiEvaluate.ts`, `aiGreedy.ts`, `aiIterativeDeepening.ts`,
   `aiMinimax.ts`). This feature is dropped from the merged app entirely —
   not carried forward into either mode, not left as a later decision point.
2. **Ship-selection pagination: port, frontend-only.** `ManageNavy.tsx`'s
   `shipPage` state, `SHIPS_PER_PAGE = 100`, and "Showing X–Y of Z"
   prev/next controls port to both modes as pure frontend — no backend
   involvement, confirmed straightforward.
3. **Ship recycling: web3 keeps the 10-purchase minimum.** `canRecycle`
   stays gated on `amountPurchased >= 10` on the web3 path — main's contract
   enforcement is not relaxed. The **multi-select batch recycle UX** (select
   several ships, recycle them in one action) is separable from the gating
   rule and still ports on top of the existing gate check.
4. **Draw/tie game outcomes: proceed, contract update assumed.** Port the
   `Games.tsx` tie UI (`TIE_ADDRESS` sentinel, purple "DRAW" styling) on the
   assumption that main's on-chain `GameContract` will be updated separately
   to support/emit a draw winner value. The frontend work isn't blocked on
   that update landing first, but the feature won't function in production
   until it does — track the contract change as a dependency, not a
   blocker for this porting work.
5. **Tournament & Flow-payment: web3-only, for now.** Both stay hidden
   entirely in web2 mode; no web2 equivalent is being built at this stage
   (see the "What must stay web3-only" section below).
6. **`Header.tsx`: needs a real mode-aware redesign, not a straight swap.**
   When the user isn't logged in via either method, the header must offer
   **both** login paths — wallet connect (web3) and the auth button
   (web2) — rather than picking one. Once the user logs in through either
   path, the header toggles to show only the widget appropriate to that
   mode (wallet address/chain UI for web3; `AuthButton`/`HeaderUtcWidget`
   for web2). This is real design/build work, not a file-for-file port.

### Still to check (minor, not a real decision point)

- **`Lobbies.tsx` opponent-fleet-preview**: reworked around REST fetches on
  explore-traditional — pure web2 plumbing, no UI decision needed, just
  needs re-implementing against contract reads for the web3 path.
- **`Info.tsx`**: only a 69-line diff — likely a minor copy/layout tweak
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

Also dropped entirely on web2: the **tournament system** and
**Flow-payment flow**. **Resolved**: both render web3-only for now — hidden
entirely when the app is in web2 mode. No web2 equivalent is in scope at
this stage; revisit later if web2 needs its own tournament/payment story.

## Proposed integration approach — staged (resolved)

Confirmed: this is a staged effort, not one big merge. Three stages, each
shippable on its own:

**Stage 1 — Safe UI/perf cherry-picks (no decisions, no data-layer work).
DONE.**

Before porting anything, verified current `main` against every Tier A/B/C
item in `docs/port-improvements-to-master.md`. Turned out **nearly all of
it was already on `main`** — the branch-diff research earlier in this plan
compared against a stale reference point; `main` had independently picked up
most of this refactor already (the hooks, `gameGridRanges.ts` functions,
`GameGridTooltip`/`GameGridConfirmWidget` extraction, the overload damage
fix, the RAF-throttled pan handler, the `React.memo`/`mountedRef`/timing-
constant work on all 10 weapon-animation files, the tutorial/live
`retreatPrepShipId` parity fix, and the CSS/tutorial-copy patches were all
confirmed present and correct). AI utility files (`aiDispatch.ts` etc.) were
never brought over, consistent with the AI-opponent-eliminated decision.

The one real gap found: `GameDisplay.tsx` and `SimulatedGameDisplay.tsx`
still had leftover inline `fontFamily: "var(--font-rajdhani)…"` /
`"var(--font-jetbrains-mono)…"` strings that hadn't been converted to the
shared `STYLE_LABEL`/`STYLE_MONO` constants (21 and 19 occurrences
respectively). Bulk-replaced all of them (one line in `GameDisplay.tsx` left
alone — a `"var(--font-rajdhani), sans-serif"` variant missing the `'Arial
Black'` fallback, which isn't an exact match for `STYLE_LABEL` and wasn't
part of the documented pattern). Verified with `tsc --noEmit`, `eslint`, and
`npm run build` — all clean.

**Not done as part of this stage:** a manual dev-server smoke test (open a
game, verify weapons fire, tooltip shows, confirm widget works, pan gesture
is smooth). Recommend doing this before calling Stage 1 fully closed.

**Stage 2 — Decided feature ports that don't require the web2/web3 toggle.**
- Ship-selection pagination (`ManageNavy.tsx`) — frontend-only, straightforward.
- Multi-select batch recycle UX (`ManageNavy.tsx`) — port the batch-select
  UI, keep the existing 10-purchase (`amountPurchased >= 10`) gate intact.
- Tie/draw UI (`Games.tsx`) — wire up `TIE_ADDRESS`/"DRAW" styling now;
  functionally inert until the separate `GameContract` update (assumed, see
  above) ships and actually emits draw outcomes.
- Header dual-login shell — build the "show both wallet-connect and
  auth-button when logged out" UI now. The "toggle to the appropriate
  widget once logged in" half depends on the app knowing its current
  mode, so full behavior lands with Stage 3 once a mode flag exists (see
  below); until then this can hide behind whichever mode is active by
  default.
- AI opponent, Lobbies REST-based opponent-fleet-preview, and any other
  web2-only plumbing are explicitly **not** touched in this stage (AI
  opponent is eliminated outright; opponent-fleet-preview gets
  re-implemented against contract reads only if/when web2 mode is actually
  built in Stage 3).

**Stage 3 — Data-layer abstraction (the actual "combine main and
explore-traditional" work).** Build the mode toggle so a single codebase can
run in web3 mode (contracts) or web2 mode (API routes) behind a runtime
flag. This is a substantial new effort, not a diff-reconciliation.
Realistically this means introducing an interface (e.g. a
`GameDataProvider`) that both the existing `use*Contract.ts` hooks and new
REST-backed hooks implement, swapping the implementation based on a mode
flag (similar in spirit to the existing chain-selection-via-localStorage
pattern in `app/config/networks.ts`). Tournament and Flow-payment components
render only when the mode flag is web3 (per the resolved decision above);
the Header's login-toggle behavior becomes fully functional once this flag
exists.

## Resolved

All prior open questions are settled:

1. AI opponent — eliminated, not ported to either mode.
2. Ship-selection pagination — ported to both, frontend-only.
3. Ship recycling — web3 keeps the 10-purchase minimum; batch-recycle UX
   ports on top of that gate.
4. Draw/tie outcomes — ported on the assumption of a separate `GameContract`
   update; tracked as a dependency, not a blocker for frontend work.
5. Tournaments & Flow-payments — web3-only for now, hidden in web2 mode.
6. Header — needs both login paths when logged out, toggles to the
   appropriate one once logged in (full toggle behavior lands with Stage 3).
7. Staged effort confirmed — see the three stages above.

Remaining non-decision items to double check when their stage comes up:
`Lobbies.tsx` opponent-fleet-preview re-implementation, and a quick visual
diff of `Info.tsx`.
