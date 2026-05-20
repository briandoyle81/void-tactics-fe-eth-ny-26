# Code Quality Audit

Generated 2026-05-20. Do not fix anything without checking this list first.

---

## 1. Redundant / Duplicated Logic

- [x] `hasLineOfSight` — exported from `gameGridRanges.ts` (upgraded to more complete GameDisplay version); removed `useCallback` from `GameDisplay.tsx`
- [x] `calculateDamage` — extracted to `app/utils/calculateDamage.ts`; both display files use thin `useCallback` wrappers
- [x] `GRID_WIDTH = 17` / `GRID_HEIGHT = 11` — both files now derive from `GRID_DIMENSIONS` in `types.ts`; constants moved to module level in `GameDisplay.tsx`
- [x] `processLobbyData` in `useLobbyList.ts` — inline `useEffect` loop replaced with `processLobbyData()` call
- [x] `lobbyList` shadow state in `useLobbies.ts` — removed `useState`+`useEffect`; replaced with derived const
- [x] Orientation/landscape effects — extracted to `app/hooks/useLandscapeMode.ts`; both display files use the hook
- [x] `proposedMoveTargetListClass` / `proposedMoveTargetBtnClass` — `SimulatedGameDisplay` now uses `useSideLayout` (matching `GameDisplay`) instead of bare `chromeOnSide`
- [x] Turn-change selection reset — extracted to `app/hooks/useResetSelectionOnTurnChange.ts`; both files use it
- [x] Retreat-mode cancellation — extracted to `app/hooks/useRetreatModeCancellation.ts`; both files use it

---

## 2. Wagmi / RPC Memoization Violations

- [x] `useShipAttributesRead` — each specific caller (`useAttributesVersionBase`, `useGunData`, `useArmorData`, `useShieldData`, `useSpecialData`) now wraps its args in `useMemo`
- [x] `useShipsByIds` — args memoized with `useMemo`
- [x] `useShipAttributesByIds` — `contractArgs` memoized before passing to `useReadContract`
- [x] `useFleetsRead` / `useFleetShipIdsAndPositions` — address memoized via `useMemo`; `fleetId` args memoized in `useFleetShipIdsAndPositions`
- [x] `useOwnedShips` — `shipIdsArgs` and `shipsDataArgs` both memoized
- [x] `useLobbiesRead` callers — `useLobby`, `usePlayerLobbyState`, `useIsLobbyOpenForJoining` each memoize their args
- [x] `useGameRead` — address memoized in `useGameRead`; `useGetGamesForPlayer`, `useGetGame`, `useGetGamesFromIds` each memoize args
- [x] `useSpecialRange` — switched from `CONTRACT_ADDRESSES` Proxy to `useSelectedChainId` + `getContractAddresses`; address and args both memoized
- [x] `CONTRACT_ADDRESSES` Proxy in `useSpecialRange` — replaced with `useSelectedChainId`-based lookup
- [x] `useShipImageCache.fetchImageFromContract` — `CONTRACT_ABIS.SHIPS as Abi` extracted to module-level `SHIPS_ABI` const

---

## 3. TypeScript Quality

- [x] `options?: any` in `useLobbiesRead` — replaced with `{ query?: { enabled?: boolean } }`; removed eslint-disable comment; spread `...(options || {})` replaced with `query: options?.query`
- [x] Five `(data as any)[n]` index casts in `usePlayerLobbyState` — replaced with `tupleToPlayerLobbyState(data as PlayerLobbyStateTuple)`; all eslint-disable comments removed
- [x] `gameData as GameDataView` casts in `GameDisplay.tsx` — `useGetGame` now returns `data: result.data as GameDataView | undefined`; all 4 casts removed from component
- [x] `owner as string` in `useShipAttributesOwner` — replaced with `typeof data === "string"` runtime guard; `!!` coercion added to `isOwner`

---

## 4. Dead Code

- [x] `purchaseSingleShip` and `purchaseMultipleShips` in `useShipPurchasing.ts:161–162,198–199` — both are unused wrappers for `purchaseShips`
- [x] `useNavyAnalytics` and `useNavyOptimization` — defined and exported but have zero component consumers; `useNavyOptimization` also contains a benchmark loop (`lines 88–108`) that calls `performance.now()` and discards the result with `void computedValue`
- [x] `useShipDetails` computes `shipsByEquipment` and `shipsByTier` on every render (`useShipDetails.ts:65–114`); `ManageNavy.tsx` only destructures `fleetStats` and `shipsByStatus`
- [x] `gameIdCallCounts` in `useMapsContract.ts:112,115` — module-level debug counter that increments but is never read or exported
- [x] Commented-out import in `useShipsContract.ts:5`
- [x] `globalGameRefetchFunctions` in `GameDisplay.tsx:23` used only in a debug panel (line 4758) — debug panel now gated behind `process.env.NODE_ENV === "development"`

---

## 5. React Anti-Patterns

- [x] `usePlayerGames.ts` — removed `useState`+`useEffect` sync; `games` is now a `useMemo` derived from query data; `isLoading`/`error` returned directly from query; dead `prevChainIdRef` effect and `activeChainId` dependency removed
- [x] `useOwnedShips.ts` — `refetch` wrapped in `useCallback`
- [x] `useLobbyList.ts` — removed 5-second interval; block-based invalidation debounced via `lastInvalidatedRef` (fires at most once per 5 s); `lastInvalidatedRef` reset on address/chain change for immediate re-fetch on network switch
- [x] `SimulatedGameDisplay.tsx:mapNodeToMobileTouchCopy` — Fragment keys now use existing React element key when available, falling back to index
- [x] `SimulatedGameDisplay.tsx` task list — `<li>` keys use existing element key when available, falling back to index
- [x] `GameDisplay.tsx` — removed `isWindowFocused`/`isPageVisible` state; replaced with single `activityRevision` counter; polling effect reads directly from `isWindowFocusedRef`/`wasHiddenRef`; reduces focus-event re-renders from 2 to 1
- [x] `useShipImageCache.ts` — removed unreliable `document.querySelector('[data-testid="wallet-connect-button"]') === null` check from `isUserLoggedIn()`

---

## 6. Component Size / Separation of Concerns

- [x] `GameDisplay.tsx` — 5,327 → 5,058 lines (debug panel gated behind NODE_ENV in prior group; further extraction deferred — remaining size is intrinsic to the game view)
- [x] `SimulatedGameDisplay.tsx` — 5,401 → 4,700 lines; 18 JSX narrative `const` blocks + `TutorialGridPanelConfig` type + `getTutorialGridPanelConfig` extracted to `app/components/TutorialGridPanelConfigs.tsx`
- [x] `Lobbies.tsx` — 4,148 → 4,105 lines; format helpers and game constants extracted to `app/utils/lobbyFormatters.ts`
- [x] `ManageNavy.tsx` — 3,207 → 2,666 lines; tutorial panel sub-components extracted to `app/components/ManageNavyTutorialPanels.tsx`; filter types and helpers extracted to `app/utils/navyFilters.ts`

---

## 7. Inline Styles That Should Use Design Tokens

- [x] `GameDisplay.tsx:3353,3364` — `"rgba(255, 77, 77, 0.15/0.12)"` hard-coded; should use `color-mix(in srgb, var(--color-warning-red) 15%, transparent)`
- [x] `GameDisplay.tsx:3520` — `"rgba(8, 12, 22, 0.96)"` should use `--color-near-black`
- [x] `GameDisplay.tsx:3598,3707,3733` — `"rgba(86, 214, 255, 0.12)"` cyan tint not using `--color-cyan`
- [x] `GameDisplay.tsx:3666,3905` — `"rgba(3, 8, 16, 0.97/0.98)"` and `:3893` `"rgba(10, 10, 15, 0.92)"` deep-space overlays using raw RGBA
- [x] `SimulatedGameDisplay.tsx:3526,3639,3726,3898,3945,3978,3979` — matching hardcoded RGBA overlays and tinted backgrounds (mirrors of GameDisplay issues above)
- [x] `SimulatedGameDisplay.tsx:769` — `drop-shadow-[0_0_14px_rgba(248,113,113,0.8)]` should use warning-red token
- [x] `page.tsx` tab button hover logic (lines 466–483) sets `borderColor`/`color`/`backgroundColor` via inline `onMouseEnter`/`onMouseLeave` instead of Tailwind utilities

---

## 8. General Bad Practice / Console Logs / Magic Numbers

- [x] `console.error` removed from: `GameDisplay.tsx` (retry log + move error), `SimulatedGameDisplay.tsx` (network switch catch), `useShipPurchasing.ts` (write error + purchase catch), `useShipActions.ts` (write error + all three action catches), `useFreeShipClaiming.ts` (localStorage load, write error, localStorage save, claim catch)
- [x] Magic polling intervals in `GameDisplay.tsx` — extracted to module-level `POLL_INTERVAL_FOCUSED_MS`, `POLL_INTERVAL_UNFOCUSED_MS`, `POLL_INTERVAL_HIDDEN_MS`, `TURN_POLL_DIVISOR`; all three inline `normalPollInterval` blocks updated
- [x] Magic `400ms`/`2000ms` delays in `useOwnedShips.ts` — extracted to `REFETCH_DEBOUNCE_MS` / `REFETCH_RETRY_MS`
- [x] Magic `2000ms` in `useShipPurchasing.ts` — extracted to `POST_PURCHASE_REFETCH_DELAY_MS`
- [x] `useLobbies.ts` — removed 4 fire-and-forget `loadLobbies()` calls from `createLobby`, `joinLobby`, `acceptGame`, `rejectGame`; block-based invalidation in `useLobbyList` handles refresh after on-chain settlement
- [x] `useShipImageCache.ts` — `initializeCacheSystem()`, `startQueueCheck()`, and `window.addEventListener("beforeunload")` consolidated into a single `if (typeof window !== "undefined")` SSR guard
- [x] `useNavyOptimization.ts` — deleted in Group 4 (no consumers)
