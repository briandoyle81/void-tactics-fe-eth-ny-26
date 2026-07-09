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

**Stage 2 — Decided feature ports that don't require the web2/web3 toggle.
Partially done.**

- **Ship-selection pagination (`ManageNavy.tsx`) — DONE.** Added `shipPage`
  state, `SHIPS_PER_PAGE = 100`, a page-reset effect (on filter/sort/fleet
  changes), a `paginatedShips` memo, and Prev/Next controls with a
  "Showing X–Y of Z" header, matching `explore-traditional`'s
  implementation. Select-all/selection state still operates on the full
  filtered set (`shipsForGridDisplay`), not just the visible page —
  pagination only affects what's rendered.
- **Multi-select batch recycle UX (`ManageNavy.tsx`) — DONE, with a gating
  fix.** The batch "[RECYCLE N SHIPS]" button (recycle several selected
  ships in one `ShipActionButton` call) already existed on `main` — but it
  had **no `canRecycle` gate at all**, unlike the adjacent single-ship
  recycle modal which does check `amountPurchased >= 10`. This was a real
  gap against the "web3 keeps the 10-purchase minimum" decision: a player
  under the minimum could bulk-recycle via multi-select while being blocked
  from the single-ship flow. Fixed by adding `canRecycle &&` to the batch
  button's render condition, so both paths are now consistently gated.
- **Tie/draw UI (`Games.tsx`) — DONE.** Added `TIE_ADDRESS =
  "0x0…001"`, `isDraw` check, and purple "DRAW" accent/badge styling,
  matching `explore-traditional` exactly. `--color-purple` was already
  registered in the `@theme` block in `globals.css`, so `border-purple`/
  `bg-purple`/`text-purple` utilities work with no CSS changes needed.
  Functionally inert until the separate `GameContract` update (assumed, see
  above) actually emits `TIE_ADDRESS` as a winner value.
- **Header dual-login shell — NOT done, flagging rather than building a
  stub.** On inspection, `main` has no web2 auth surface at all yet — no
  NextAuth, no `AuthButton`/`Connect`/`HeaderUtcWidget` components, no
  `/api/auth` route. Building a second login button now would mean either
  porting a meaningful slice of the Stage 3 auth/data-layer work early (out
  of scope for "doesn't require the web2/web3 toggle"), or adding a
  cosmetic button that doesn't actually do anything — which is exactly the
  kind of half-finished feature this project's conventions warn against.
  Recommend deferring the entire Header redesign to Stage 3, once real web2
  auth exists to wire the second login path into.
- AI opponent, Lobbies REST-based opponent-fleet-preview, and any other
  web2-only plumbing are explicitly **not** touched in this stage (AI
  opponent is eliminated outright; opponent-fleet-preview gets
  re-implemented against contract reads only if/when web2 mode is actually
  built in Stage 3).

**Stage 3 — Data-layer abstraction (the actual "combine main and
explore-traditional" work). In progress — multi-session effort, per your
call to do this "one subsystem at a time, ongoing."**

Realistically this means introducing an interface (e.g. a
`GameDataProvider`) that both the existing `use*Contract.ts` hooks and new
REST-backed hooks implement, swapping the implementation based on a mode
flag (similar in spirit to the existing chain-selection-via-localStorage
pattern in `app/config/networks.ts`). Tournament and Flow-payment components
should render only when the mode flag is web3 (per the resolved decision
above) — **not done yet**, still to wire up.

### Subsystem 1 — Auth + mode toggle: DONE

- **Dependencies**: added `@prisma/client`, `@prisma/adapter-pg`, `pg`,
  `next-auth@4`, `clsx` (runtime) and `prisma`, `@types/pg`, `dotenv`, `tsx`
  (dev), matching `explore-traditional`'s exact versions. Added
  `db:generate`/`db:migrate`/`db:studio`/`db:seed`/`postinstall` scripts.
- **Prisma**: copied `prisma/schema.prisma` (full schema — Users, Ships,
  Fleets, Lobbies, Games, GameTurns, Maps, Config, PlayerStats) and all 11
  migrations verbatim from `explore-traditional`, plus `prisma.config.ts` and
  `app/lib/prisma.ts`. Ran `prisma generate` successfully.
  - **Changed from source**: made the `prisma` client singleton in
    `app/lib/prisma.ts` a lazy `Proxy` instead of eagerly constructing (and
    throwing on missing `DATABASE_URL`) at module-import time. The original
    eager version broke `npm run build` for the *entire app* — including
    pages that never touch the DB — the moment any file imported anything
    that transitively pulled in `prisma.ts` (e.g. the new NextAuth route).
    Since this app must keep building and running in web3-only
    configurations with no Neon DB configured, the client now only connects
    (and only requires `DATABASE_URL`) on first actual use.
- **NextAuth**: copied `app/lib/auth.ts` (Google OAuth provider config),
  `app/api/auth/[...nextauth]/route.ts` (with the `signIn` callback that
  upserts a `User` row), and `app/types/next-auth.d.ts` verbatim. Added
  `SessionProvider` to `app/providers.tsx` alongside the existing
  wagmi/Dynamic providers — both auth systems now coexist in the same
  provider tree.
- **`useCurrentUser.ts`**: copied verbatim (thin `useSession()` wrapper) —
  this is distinct from `explore-traditional`'s `useAccount.ts` stub (which
  replaces wagmi's real hook and is correctly still on the "never port"
  list); `useCurrentUser` doesn't conflict with anything on web3.
- **Sign-in UI**: `explore-traditional` had two near-duplicate components for
  this — a generic white "Sign in with Google" `AuthButton.tsx`, and a
  game-styled `Connect.tsx`. Used the game-styled one, but renamed it to
  `AuthSignIn.tsx` — `main` (per `posthog-setup-report.md`) already uses the
  name `Connect.tsx` for an unrelated wallet-tracking component, so reusing
  that name would collide. Did not port the generic `AuthButton.tsx`.
- **`app/config/appMode.ts` / `app/hooks/useAppMode.ts`**: new — the actual
  web3/web2 mode flag, built as a localStorage + custom-event store,
  mirroring `networks.ts`'s existing chain-selection pattern exactly
  (`getAppMode`/`setAppMode`/`useAppMode`, `VOID_TACTICS_APP_MODE_CHANGED_EVENT`).
  Nothing reads this flag to switch data sources yet (see "Not done" below)
  — right now it only records which login method the user last used.
- **`Header.tsx` dual-login** (the item Stage 2 explicitly deferred): now
  shows both `HeaderDisconnectedConnect` (wallet) and `AuthSignIn` (Google)
  side by side when logged out of both; shows only the wallet UI once
  connected; shows only `AuthSignIn`'s signed-in view when logged in via
  Google without a wallet. Logging in via either method calls `setAppMode()`
  — the login method itself is the mode signal. Also had to loosen the
  mobile hamburger/expanded-panel gating (`showMobileWalletMenu`), which
  previously only appeared once wallet-connected/connecting — otherwise
  mobile users logged out of everything would have had no way to reach the
  Google sign-in option at all.
- Verified with `tsc --noEmit`, `eslint`, and `npm run build` — all clean.
  `npm run build` now succeeds with **no `DATABASE_URL` set at all**,
  confirming the lazy-Prisma fix actually solves the web3-only-build
  problem.

### Needs from you before this actually runs against a real database

You said the Neon DB is already provisioned, but I don't have (and
shouldn't be given, in chat) the actual connection string or OAuth
credentials. I added empty placeholder keys to `.env` — fill these in
yourself (e.g. via your editor or `! echo ... >> .env.local`):

```
DATABASE_URL=
DATABASE_URL_UNPOOLED=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

`DATABASE_URL_UNPOOLED` should be Neon's direct (non-pgbouncer) connection
string, used only for running migrations (see `prisma.config.ts`).
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` need a Google OAuth app registered
with `http://localhost:3000/api/auth/callback/google` (and your prod URL)
as an authorized redirect URI. Once filled in, run `npm run db:migrate` to
apply the schema to your database, then `npm run dev` and try signing in
with Google from the header.

### Not done yet (future subsystems)

- **No `GameDataProvider` abstraction exists yet** — the `appMode` flag is
  wired to the login UI but nothing reads it to switch between contract
  calls and API calls. This is the core remaining work.
- **None of the ~33 web2 API routes are ported** (games, lobbies, ships,
  leaderboard, maps, tutorial, user stats, admin). Each is effectively its
  own future subsystem.
- **Tournament/Flow-payment mode-gating** — not yet wired to `useAppMode()`.
- Google OAuth app registration and Neon connection strings — yours to do
  (see above).

### Subsystem 2 — Ships (data layer): DONE

Corrected architecture per your guidance — no identity bridging, no
crossover. `app/types/types.ts` (`bigint`/`0x${string}`) stays exactly as-is,
web3-only, forever. Web2 gets its own fully parallel type system:

- **`app/types/web2Ship.ts`** — new. `Web2Ship`/`Web2ShipEquipment`/
  `Web2ShipTraits`/`Web2ShipColors`/`Web2ShipData`, copied field-for-field
  from `explore-traditional`'s (in-place-edited) `types/types.ts` — plain
  `number` ids, `string` owner (a NextAuth user id, not an address). Zero
  overlap with the web3 `Ship` type by design.
- **`app/lib/dbToType.ts`** (`dbShipToShip`) and **`app/lib/shipGen.ts`**
  (`generateShip`) — ported, with their type imports redirected from
  `../types/types` to `../types/web2Ship`. Otherwise verbatim.
- **`app/lib/shipCosts.ts`, `economyConfig.ts`, `purchaseTiers.ts`,
  `customizeCost.ts`, `getCurrentCosts.ts`, `recalcStaleShips.ts`,
  `apiFetch.ts`, `apiMutate.ts`, `bigintJson.ts`, `shipNames.json`** — all
  ported verbatim; none of these touch `types/types.ts` at all (structural
  typing or DB-shaped types only).
- **`app/utils/shipAttributesCalculatorWeb2.ts`** — new. The web3
  `shipAttributesCalculator.ts` is pure logic parameterized on `Ship`; since
  it can't be reused without importing the web3 type, this is a parallel
  copy parameterized on `Web2Ship` instead (`calculateAttributesFromContractsWeb2`).
  `Attributes` (the *return* type) has no bigint fields, so it's shared
  as-is from `types/types.ts` — no duplication needed there.
- **`app/hooks/useShipDataCacheWeb2.ts`** — new. Parallel to
  `useShipDataCache.ts`'s localStorage caching, typed on `Web2Ship`. Already
  used a distinct cache-key namespace on `explore-traditional` (`"legacy"`
  instead of a contract address), so it can't collide with web3's cache —
  preserved that.
- **`app/hooks/useOwnedShipsWeb2.ts`** — new (parallel to `useOwnedShips.ts`,
  which stays untouched and web3-only). Fetches from `/api/ships` via
  `apiFetch`, paginating through cursors.
- **10 API routes ported verbatim** under `app/api/ships/`: list/paginate
  (`route.ts`), recycle-one (`[id]/route.ts` `DELETE`), construct one/bulk
  (`[id]/construct`, `construct`), customize preview+apply
  (`[id]/customize`), claim-free (`claim-free`), attributes
  (`attributes` — redirected to import `calculateAttributesFromContractsWeb2`
  instead of the web3 calculator), bulk recycle (`recycle`), and both
  purchase flows (`purchase/usd`, `purchase/utc`).
- Verified with `tsc --noEmit`, `eslint`, and `npm run build` — all clean;
  all 10 routes show up correctly in the build's route list.

**Deliberately left out of this pass** (own future work):
- `app/api/games/[id]/ships/route.ts` and `useGameShips.ts` — these return
  ships *for a specific game* and depend on the `Game` Prisma model and a
  game-state blob; that's the **games** subsystem's concern, not ships'.

### Subsystem 2 — Ships (UI wiring): DONE

Discussed the rendering-layer question before building: pure canvas/SVG ship
rendering doesn't touch ids or ownership at all, so duplicating it into a
second ~20-file tree would be pure maintenance debt with no separation
benefit — decided (with your sign-off, given both modes will be maintained
"for a bit") to share it via a minimal structural type, while keeping the
actual ships page/actions genuinely parallel (new component, not branches in
`ManageNavy.tsx`) since that's where real mode-specific logic belongs and
React hooks can't be called conditionally anyway.

- **`app/types/shipVisual.ts`** — new. `ShipVisual` holds only
  `equipment`/`traits`/a few `shipData` flags — no ids, no ownership. Both
  `Ship` and `Web2Ship` satisfy the equipment/traits fields structurally;
  the only mismatch was `shipData.timestampDestroyed` (`bigint` on `Ship` vs
  `number` on `Web2Ship`), so `ShipVisual` fixes that field as `number`.
- **`app/utils/shipRenderer/*` (all ~20 files) and `app/utils/shipLevel.ts`**
  — redirected from `Ship` to `ShipVisual`. One behavior fix along the way:
  `ImageRenderer.ts`'s destroyed check changed from `> BigInt(0)` to `> 0`
  to match the new field type.
- **`app/utils/toShipVisual.ts`** — new. The one-line adapter web3 call sites
  need (`Number()`-converts `timestampDestroyed`); `Web2Ship` needs no
  adapter since it already matches `ShipVisual` exactly.
- **Fixed up existing web3 call sites** to pass `toShipVisual(ship)` instead
  of `ship` directly to the now-shared functions: `GameGrid.tsx`,
  `HeroShipShowcase.tsx`, `Lobbies.tsx`, `ShipCard.tsx`, `ShipConstructor.tsx`,
  `ShipImage.tsx`, `useShipRenderer.ts`, `useShipImageCache.ts`,
  `navyFilters.ts`, and `shipLevel.test.ts` (simplified its `makeShip` test
  fixture to build a `ShipVisual` directly, since the rank/tier functions it
  exercises never needed the id/owner fields it was fabricating anyway).
  This was a wider blast radius than expected going in — `tsc --noEmit`
  caught every site; all fixed and verified (`70/70` vitest tests still
  pass).
- **Parallel (not shared), because they're infrastructure, not pure logic**:
  - `app/hooks/useShipRendererWeb2.ts` — same in-memory rendered-image cache
    strategy as `useShipRenderer.ts`, backed by `useShipDataCacheWeb2`
    instead. Both call the same shared `renderShip()`.
  - `app/components/ShipImageWeb2.tsx` — same presentation as `ShipImage.tsx`,
    calls the web2 hook.
  - `app/components/ShipCardWeb2.tsx` — intentionally simpler than the
    875-line web3 `ShipCard.tsx` (no fleet-composition drag state, no
    in-game tooltip variant) — construct/recycle/select actions calling the
    ship API routes directly.
  - `app/components/ManageNavyWeb2.tsx` — the actual web2 ships page: list
    (via `useOwnedShipsWeb2`), purchase (USD + UTC tiers from
    `PURCHASE_TIERS`), claim-free, construct (single/all), recycle
    (single/bulk). Deliberately **not** feature-parity with `ManageNavy.tsx`
    (no filters/sort/fleet-composition/pagination yet) — a first working
    slice, not the whole page.
  - Wired into `app/page.tsx`: the "Manage Navy" tab now renders
    `<ManageNavyWeb2 />` when `useAppMode() === "web2"`, `<ManageNavy />`
    otherwise. Rest of the tab shell (other tabs, wallet-gated admin checks,
    etc.) is untouched — full page-shell mode-gating is still open.
- Verified with `tsc --noEmit`, `eslint`, `npx vitest run` (70/70), and
  `npm run build` — all clean.

**Known gap carried over from the source branch, not introduced here**: the
USD purchase route (`/api/ships/purchase/usd`) has no real payment
gate — no Stripe/checkout integration exists anywhere in
`explore-traditional`, it just grants ships directly. Treat it as a
placeholder until a real payment step is added; the UTC (credit-balance)
purchase path is the more legitimate one for now.

**Still open for a future pass**: filters/sort/pagination/fleet-composition
parity with `ManageNavy.tsx`; a way to display the user's current UTC
balance (no `/api/user/me`-equivalent endpoint exists yet); full page-shell
mode-gating beyond the single "Manage Navy" tab.

### Subsystem 3 — Lobbies: DONE (with a real scope boundary — see below)

- **`app/types/web2Lobby.ts`** — new. `Web2Lobby`/`Web2Fleet` and friends,
  `number` ids and `string` user ids, mirroring `explore-traditional`'s
  lobby shapes. One correction versus the source: that branch's own
  `dbLobbyToLobby` cast `creatorId`/`joinerId` (Google OAuth subs) *as*
  `` `0x${string}` `` to satisfy the shared web3 `Lobby` type — exactly the
  identity-crossover shortcut you told me not to take. Web2's `creator`/
  `joiner`/`reservedJoiner` fields are plain `string` here, with `""` as the
  "unset" sentinel instead of the zero address.
- **Found a pre-existing collision and undid it**: `app/utils/lobbyFormatters.ts`
  already exists on `main` (bigint-typed, e.g. `formatThreatShort(costLimit:
  bigint)`) — I initially overwrote it with `explore-traditional`'s
  number-typed version before `tsc` caught 6 broken call sites in
  `Lobbies.tsx`/`TournamentCard.tsx`. Reverted immediately and instead added
  **`app/utils/lobbyFormattersWeb2.ts`** with number-typed formatter
  functions, importing the shared threshold constants
  (`SKIRMISH_THREAT_LIMIT`, `MIN_SHIPS_FOR_LOBBIES`, etc.) from the
  original file since those have no bigint/identity concern at all. Lesson
  for future subsystems: check whether a same-named file already exists on
  `main` *before* checking out from `explore-traditional`, not after.
- **`app/types/web2Game.ts`** — new, and deliberately narrow: just enough
  (`Web2GameDataView`, `Web2GameMetadata`, `Web2TurnState`,
  `Web2ShipPosition`, `Web2GameGridDimensions`) to create a `Game` row when
  a lobby's fleets are both submitted. This is *not* the games subsystem —
  no turn-submission or display types live here. `Attributes` (shared, no
  bigint fields) is reused as-is.
- **`app/lib/createGameFromLobby.ts`** — ported, type imports redirected to
  `web2Ship`/`web2Game`; `winner` sentinel changed from the zero address to
  `""` to match the no-crossover identity model.
- **8 of 9 lobby API routes ported** under `app/api/lobbies/`: list/create
  (`route.ts`), leave (`[id]/route.ts` `DELETE`), accept, fleet (submits a
  fleet and auto-starts the game once both are complete), join,
  quit-with-penalty, reject, timeout-joiner, and player-state. Only
  `route.ts` needed a type redirect (`Lobby`/`LobbyStatus` →
  `Web2Lobby`/`Web2LobbyStatus`, dropped the fake-`0x` casts and the
  `isAiGame` field entirely).
- **Explicitly not ported**: `/api/lobbies/vs-ai` (AI opponent eliminated,
  per Stage 2) and `/api/admin/lobbies` (admin tooling to pre-create lobbies
  by email — deferred, not core player flow).
- **`app/hooks/useLobbyListWeb2.ts` / `useLobbiesWeb2.ts`** — parallel to
  the existing web3 `useLobbyList.ts`/`useLobbies.ts` (untouched). Excludes
  `createAiLobby` (eliminated feature) and `timeoutGame` (calls
  `/api/games/[id]/timeout`, which belongs to the not-yet-built games
  subsystem).
- **`app/components/LobbiesWeb2.tsx`** — new page: browse open lobbies,
  create (threat/turn-time/score presets matching the server's validation
  bounds), join, leave, decline a reserved invite, submit a fleet (ship
  multi-select only — **no starting-position picker**, the server already
  falls back to default positions when none are given), and the
  creator/joiner timeout-penalty actions. Gated on owning at least
  `MIN_SHIPS_FOR_LOBBIES` (10) constructed ships, matching the source's
  requirement. Wired into `page.tsx`'s "Lobbies" tab behind
  `useAppMode() === "web2"`, same pattern as ships.
- Verified with `tsc --noEmit`, `eslint`, `npx vitest run` (70/70), and
  `npm run build` — all clean; all 8 lobby routes show up in the build's
  route list.

**The real scope boundary to be upfront about**: submitting a fleet can
create a `Game` row via `createGameFromLobby`, but **there is no web2
`GameDisplay` yet** — once a lobby reaches `InGame`, `LobbiesWeb2.tsx`
just shows "Game started — playing it out isn't available in web2 mode
yet" rather than pretending there's somewhere to go. Actually playing a
started game is the **games** subsystem, still future work.

**Still open for a future pass**: the fleet starting-position picker (grid
placement UI, currently server-default-only); `/api/admin/lobbies`; and, as
above, the games subsystem itself (turn submission, web2 `GameDisplay`,
replay) — without it, a web2 lobby can reach "game started" but not
actually be played.

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
