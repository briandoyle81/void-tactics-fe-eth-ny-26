# Port Frontend Improvements to `master` (Web3 Branch)

**Date written:** 2026-06-04
**Source branch:** `explore-traditional` (web2 / REST backend)
**Target branch:** `master` (web3 / wagmi + on-chain)
**Divergence point:** commit `a989c53` ("Add weapon impact effects")

## Context

`explore-traditional` contains two kinds of changes relative to `master`:

1. **Web2 conversion** — replacing wagmi/viem contract reads with REST API calls, stubs, Prisma/Neon DB, NextAuth. These must **NOT** be ported.
2. **Frontend UI/UX and code quality improvements** — new components, extracted hooks, animation improvements, bug fixes. These **should** be ported.

This document gives exact instructions for porting category 2 only.

---

## Strategy Overview

The work falls into three tiers:

- **Tier A — Copy wholesale.** New files that have zero web3 dependencies. Just `git checkout explore-traditional -- <path>` and they land cleanly on master.
- **Tier B — Patch existing files.** Files that exist on both branches; only some hunks should be applied (use `git diff` and cherry-pick hunks manually or with `patch`).
- **Tier C — Surgical edits.** The three large game components (`GameDisplay.tsx`, `GameGrid.tsx`, `SimulatedGameDisplay.tsx`) have improvements deeply interleaved with web2 stubs. Port by reading the explore-traditional version and reapplying the logical changes by hand on the master version.

---

## Tier A — Copy Wholesale (New Files)

These files do not exist on `master` and have no web2-specific code. Check them out directly:

```bash
git checkout explore-traditional -- \
  app/constants/animationTiming.ts \
  app/styles/fontStyles.ts \
  app/hooks/useDamageCalculation.ts \
  app/hooks/useGridCellSets.ts \
  app/components/GameGridTooltip.tsx \
  app/components/GameGridConfirmWidget.tsx \
  app/utils/aiDispatch.ts \
  app/utils/aiEvaluate.ts \
  app/utils/aiGreedy.ts \
  app/utils/aiIterativeDeepening.ts \
  app/utils/aiMinimax.ts
```

### `useGamePolling.ts` — copy with one import fix

`app/hooks/useGamePolling.ts` is safe to copy wholesale **except** that on `explore-traditional` it imports `registerGameRefetch` / `unregisterGameRefetch` from `useContractEvents`, which master also has. Verify the import path resolves after checkout:

```bash
git checkout explore-traditional -- app/hooks/useGamePolling.ts
# Then verify:
grep "registerGameRefetch\|unregisterGameRefetch" app/hooks/useContractEvents.ts
# Should find both exports. If not, add them.
```

---

## Tier B — Patch Existing Files

### 1. `app/utils/gameGridRanges.ts`

Three new exported functions were added to the end of the file on `explore-traditional`:

- `computeLabelTargets`
- `computeHoverValidTargets`
- `computeHoverShootingRange`

Also: all `selectedWeaponType` param types were widened from `"weapon" | "special"` to `"weapon" | "special" | "ram"`.

**Action:**

```bash
# Append the new functions from explore-traditional to master's copy
git show explore-traditional:app/utils/gameGridRanges.ts > /tmp/ranges_new.ts
git show master:app/utils/gameGridRanges.ts > /tmp/ranges_old.ts
# Diff to see only the additions (should be ~260 lines at end of file)
diff /tmp/ranges_old.ts /tmp/ranges_new.ts
```

Apply changes:

1. Add the three new function blocks (everything after the last `}` in master's file).
2. In `ShootingRangeParams` interface, change `selectedWeaponType: "weapon" | "special"` → `"weapon" | "special" | "ram"`.

### 2. `app/utils/simulatedTutorialRules.ts`

Bug fix for overload damage calculation. The `applyTutorialAction` function had a duplicate damage-reduction calculation path.

**Action:** Apply commit `42ae37a` directly:

```bash
git cherry-pick 42ae37a
# Resolve any conflicts (unlikely — this file only exists on explore-traditional)
```

### 3. `app/globals.css`

Two improvements:

1. **`game-bg-override` CSS variable** — allows per-page background color override without breaking the default.
2. **Improved Flak explosion animations** — replaced single `flak-pop` keyframe with four new keyframes (`flak-flash`, `flak-fireball`, `flak-shard`, `flak-smoke`) and updated `.flak-*` classes.

**Action:**

```bash
git diff master..explore-traditional -- app/globals.css > /tmp/globals.patch
# Review the patch (133 lines), then apply:
cd /path/to/repo && git apply /tmp/globals.patch
```

The patch touches only animation keyframes and the body background. It has no web2-specific content.

### 4. `app/components/TutorialGridPanelConfigs.tsx`

Added tutorial copy improvements in the "select ship" brief: added a paragraph about the FLEET STATUS panel, and rewrote the task list items to reference the new panel-based ship selection flow.

**Action:** Apply commit `434aaad` filtered to this file only:

```bash
git diff 434aaad^..434aaad -- app/components/TutorialGridPanelConfigs.tsx | git apply
```

---

## Tier C — Surgical Edits on Large Components

These three files have improvements interleaved with web2 stubs. Work from **master's version** as the base and apply the logical changes below.

### `app/components/weapon-animations/*.tsx` (all 10 files)

Two changes apply to every animation component:

#### C1. Wrap each component in `React.memo`

Change every `export function X({` at the top level to:

```typescript
export const X = React.memo(function X({
```

And change the closing `}` to `});`.

Files: `EmpWaveAnimation`, `FlakExplosionAnimation`, `FleeAnimation`, `LaserShootingAnimation`, `MissileShootingAnimation`, `PlasmaShootingAnimation`, `RailgunShootingAnimation`, `RepairDroneAnimation`, `RetreatPrepAnimation`, `WarpFieldCollapseAnimation`.

#### C2. Replace per-file timing constants with `animationTiming` imports

After copying `app/constants/animationTiming.ts` (Tier A), update each animation file:

| File                           | Remove local const                                  | Replace with imported name                                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LaserShootingAnimation.tsx`   | (none — bare literals)                              | `}, 300)` → `}, LASER_LINE_FADEOUT_MS)`, `}, 200)` → `}, LASER_FLARE_FADEOUT_MS)`, `setInterval(createLine, 150)` → `setInterval(createLine, LASER_FIRE_INTERVAL_MS)`                         |
| `FlakExplosionAnimation.tsx`   | (none)                                              | `}, 600)` → `}, FLAK_BURST_CLEANUP_MS)`, `setInterval(spawnBursts, 45)` → `setInterval(spawnBursts, FLAK_BURST_SPAWN_INTERVAL_MS)`                                                            |
| `RailgunShootingAnimation.tsx` | `IMPACT_DURATION`, `FLASH_DURATION`, `PEN_DURATION` | rename to `RAILGUN_IMPACT_DURATION_MS`, `RAILGUN_FLASH_DURATION_MS`, `RAILGUN_PEN_DURATION_MS`; also `}, 150)` → `}, RAILGUN_MUZZLE_FADEOUT_MS)`, `}, 2000)` → `}, RAILGUN_RESPAWN_DELAY_MS)` |
| `MissileShootingAnimation.tsx` | `IMPACT_DURATION`                                   | rename to `MISSILE_IMPACT_DURATION_MS`; `}, 200)` → `}, MISSILE_SECOND_FIRE_DELAY_MS)`, `}, 1000)` → `}, MISSILE_RESPAWN_DELAY_MS)`                                                           |
| `PlasmaShootingAnimation.tsx`  | `IMPACT_DURATION`, `IMPACT_THROTTLE_MS`             | rename to `PLASMA_IMPACT_DURATION_MS`, `PLASMA_IMPACT_THROTTLE_MS`; `}, 25)` → `}, PLASMA_PARTICLE_INTERVAL_MS)`                                                                              |
| `FleeAnimation.tsx`            | `GLOW_BUILD_MS`, `ZOOM_DURATION_MS`                 | rename to `FLEE_GLOW_BUILD_MS`, `FLEE_ZOOM_DURATION_MS`                                                                                                                                       |
| `RetreatPrepAnimation.tsx`     | `GLOW_BUILD_MS`                                     | rename to `RETREAT_GLOW_BUILD_MS`                                                                                                                                                             |

Add import to each file:

```typescript
import {
  LASER_LINE_FADEOUT_MS /* ... */,
} from "../../constants/animationTiming";
```

#### C3. `mountedRef` pattern in async effects

On `explore-traditional`, several animation files gained a `mountedRef` to prevent state updates after unmount:

```typescript
const mountedRef = useRef(true);
useEffect(
  () => () => {
    mountedRef.current = false;
  },
  [],
);
```

And guards like `if (!mountedRef.current) return;` before state updates in async callbacks.

**Check** whether master's animation files already have this pattern. If not, add it to: `FlakExplosionAnimation`, `LaserShootingAnimation`, `MissileShootingAnimation`, `PlasmaShootingAnimation`, `RailgunShootingAnimation`.

---

### `app/components/GameGrid.tsx`

Master's `GameGrid.tsx` is 3,534 lines; explore-traditional is 3,645 lines (after all the splits). Apply these changes to master's version:

#### C4. Export `measureGridCellViewportBounds`

Change:

```typescript
function measureGridCellViewportBounds(
```

to:

```typescript
export function measureGridCellViewportBounds(
```

#### C5. Import and use `useGridCellSets` hook

After the weapon-animation imports, add:

```typescript
import { useGridCellSets } from "../hooks/useGridCellSets";
import { GameGridTooltip } from "./GameGridTooltip";
import { GameGridConfirmWidget } from "./GameGridConfirmWidget";
```

Find the block of 8 inline `useMemo` calls that build Sets (around lines 983–1010 on explore-traditional, search for `const movementTileSet = React.useMemo`) AND the `tutorialHighlightKeySet` memo. Replace all of them with:

```typescript
const {
  movementTileSet,
  shootingTileSet,
  effectiveShootingTileSet,
  validTargetIdSet,
  effectiveValidTargetIdSet,
  assistableTargetIdSet,
  assistableTargetsFromStartIdSet,
  tutorialHighlightKeySet,
} = useGridCellSets({
  movementRange,
  shootingRange,
  effectiveShootingRange,
  validTargets,
  effectiveValidTargets,
  assistableTargets,
  assistableTargetsFromStart,
  tutorialHighlightCells,
});
```

#### C6. Replace tooltip IIFE with `<GameGridTooltip />`

Find the inline tooltip (IIFE starting with `{hoveredCell && !disableTooltips && !draggedShipId && (() => {`). Replace the entire block with:

```tsx
<GameGridTooltip
  hoveredCell={hoveredCell}
  disableTooltips={disableTooltips}
  draggedShipId={draggedShipId}
  shipMap={shipMap}
  getShipAttributes={getShipAttributes}
  gridContainerRef={gridContainerRef}
  gridLayoutRef={gridLayoutRef}
  isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
  movedShipIdsSet={movedShipIdsSet}
/>
```

#### C7. Replace confirm widget inline JSX with `<GameGridConfirmWidget />`

Find `{/* Inline confirm widget */}` block (starting with `{showConfirmWidget && previewPosition && onConfirmMove && onCancelMove && confirmWidgetAnchor && (`). Replace with:

```tsx
{
  showConfirmWidget &&
    previewPosition &&
    onConfirmMove &&
    onCancelMove &&
    confirmWidgetAnchor && (
      <GameGridConfirmWidget
        confirmWidgetAnchor={confirmWidgetAnchor}
        confirmWidgetLabel={confirmWidgetLabel}
        onConfirmMove={onConfirmMove}
        onCancelMove={onCancelMove}
        selectedShipId={selectedShipId}
        shipMap={shipMap}
        selectedWeaponType={selectedWeaponType}
        specialType={specialType}
        targetShipId={targetShipId}
        isRammingMovePreview={isRammingMovePreview ?? false}
        movementRange={movementRange}
        grid={grid}
        isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
        getShipAttributes={getShipAttributes}
        setSelectedWeaponType={setSelectedWeaponType}
        setTargetShipId={setTargetShipId}
      />
    );
}
```

#### C8. Remove O(n²) arrow origin fallback

Find the `fromPos` computation in the arrow rendering section. It has a `?? (() => { for (let r = 0; r < grid.length; r++) { ... } return null; })()` fallback after the `allShipPositions?.find(...)?.position`. Remove the entire fallback IIFE, leaving:

```typescript
const fromPos = useLastMoveArrow
  ? lastMoveOldPosition
  : (allShipPositions?.find((sp) => sp.shipId === movingShipId)?.position ??
    null);
```

#### C9. RAF-throttle the pan `mousemove` handler

Inside the `useEffect` that wires up pan (the one that adds `mousedown`/`mousemove`/`mouseup`), update `onMouseMove`:

```typescript
let rafId: number | null = null;
const onMouseMove = (e: MouseEvent) => {
  if (!panStartRef.current) return;
  const dx = e.clientX - panStartRef.current.x;
  const dy = e.clientY - panStartRef.current.y;
  if (!panDidMoveRef.current && Math.hypot(dx, dy) < 4) return;
  panDidMoveRef.current = true;

  if (rafId !== null) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (!panStartRef.current) return;
    const { scale } = zoomRef.current;
    const gridEl = gridContainerRef.current;
    const w = gridEl?.offsetWidth ?? el.offsetWidth;
    const h = gridEl?.offsetHeight ?? el.offsetHeight;
    const tdx = e.clientX - panStartRef.current.x;
    const tdy = e.clientY - panStartRef.current.y;
    let newTx = Math.min(
      0,
      Math.max(w * (1 - scale), panStartRef.current.tx + tdx),
    );
    let newTy = Math.min(
      0,
      Math.max(h * (1 - scale), panStartRef.current.ty + tdy),
    );
    setZoom((prev) => ({ ...prev, tx: newTx, ty: newTy }));
  });
};
```

Also update `onMouseUp` to cancel the pending frame:

```typescript
const onMouseUp = (e: MouseEvent) => {
  if (e.button !== 2) return;
  panStartRef.current = null;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};
```

#### C10. Remove `measureGridCellLabelAnchor` (was removed in commit `17befc1`)

Search for `function measureGridCellLabelAnchor` and delete the entire function (it was replaced with `measureGridCellViewportBounds`).

Also: `collectDamageLabelTargets` gained a RAM early-return in `17befc1`. In the function body, after the opening destructuring, add:

```typescript
if (selectedWeaponType === "ram") return [];
```

And update the `selectedWeaponType` param type from `"weapon" | "special"` to `"weapon" | "special" | "ram"`.

---

### `app/components/GameDisplay.tsx`

Master's `GameDisplay.tsx` is 5,101 lines; explore-traditional is 4,400 lines (after polling extraction and DRY work). The improvements to apply are:

#### C11. Replace `calculateDamageForShip` useCallback with `useDamageCalculation` hook

Find:

```typescript
const calculateDamageForShip = React.useCallback(
  (targetShipId: number, weaponType?: ..., showReducedDamage?: ..., shooterShipIdOverride?: number) =>
    calculateDamage({ ... }),
  [...],
);
```

Replace with (after importing the hook):

```typescript
import { useDamageCalculation } from "../hooks/useDamageCalculation";
// ...
const calculateDamageForShip = useDamageCalculation({
  selectedShipId,
  getShipAttributes,
  selectedWeaponType,
  specialData,
  specialType,
});
```

Remove the now-unused `import { calculateDamage }` and `SpecialData` from imports if they're not used elsewhere.

#### C12. Replace `labelTargets` inline memo with `computeLabelTargets`

Find the `const labelTargets = React.useMemo(...)` block (~140 lines). Replace with:

```typescript
import {
  computeLabelTargets,
  computeShootingRange,
  computeHoverValidTargets,
  computeHoverShootingRange,
} from "../utils/gameGridRanges";
// ...
const labelTargets = React.useMemo(
  () =>
    computeLabelTargets({
      selectedShipId,
      previewPosition,
      isRammingMovePreview,
      shipPositions: game.shipPositions,
      shipMap,
      playerAddress: address,
      getShipAttributes,
      selectedWeaponType,
      specialRange,
      specialType,
      blockedGrid,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
    }),
  [
    selectedShipId,
    previewPosition,
    isRammingMovePreview,
    gameShips,
    shipMap,
    address,
    getShipAttributes,
    blockedGrid,
    game.shipPositions,
    selectedWeaponType,
    specialRange,
    specialType,
  ],
);
```

#### C13. Replace `shootingRange` inline memo with `computeShootingRange`

Find the `const shootingRange = React.useMemo(...)` block (~300 lines). Replace with:

```typescript
const shootingRange = React.useMemo(
  () =>
    isRammingMovePreview
      ? []
      : computeShootingRange({
          gridWidth: GRID_WIDTH,
          gridHeight: GRID_HEIGHT,
          selectedShipId,
          hasShips: !!gameShips,
          shipMap,
          getShipAttributes,
          shipPositions: game.shipPositions,
          previewPosition,
          selectedWeaponType,
          specialRange,
          specialType,
          blockedGrid,
        }),
  [
    selectedShipId,
    gameShips,
    isRammingMovePreview,
    shipMap,
    getShipAttributes,
    game.shipPositions,
    previewPosition,
    selectedWeaponType,
    specialRange,
    specialType,
    blockedGrid,
  ],
);
```

Note: `computeShootingRange` is imported from `gameGridRanges`; master does not currently use it even though it's exported there.

#### C14. Replace `hoverValidTargets` and `hoverShootingRange` inline memos

Find both inline memos (~30 lines each). Replace with:

```typescript
const hoverValidTargets = React.useMemo(
  () =>
    computeHoverValidTargets({
      selectedShipId,
      hoverPreviewPosition,
      hasShips: !!gameShips,
      shipPositions: game.shipPositions,
      shipMap,
      playerAddress: address,
      getShipAttributes,
      selectedWeaponType,
      specialRange,
      specialType,
      blockedGrid,
    }),
  [
    selectedShipId,
    hoverPreviewPosition,
    gameShips,
    shipMap,
    address,
    getShipAttributes,
    selectedWeaponType,
    specialType,
    specialRange,
    game.shipPositions,
    blockedGrid,
  ],
);

const hoverShootingRange = React.useMemo(
  () =>
    computeHoverShootingRange({
      selectedShipId,
      hoverPreviewPosition,
      hasShips: !!gameShips,
      shipPositions: game.shipPositions,
      getShipAttributes,
      selectedWeaponType,
      specialRange,
      specialType,
      blockedGrid,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
    }),
  [
    selectedShipId,
    hoverPreviewPosition,
    gameShips,
    getShipAttributes,
    selectedWeaponType,
    specialType,
    specialRange,
    game.shipPositions,
    blockedGrid,
  ],
);
```

#### C15. Pass `hoverValidTargets`, `hoverShootingRange`, `labelTargets` to `<GameGrid>`

Find all `<GameGrid ... />` render sites in GameDisplay (there are 2: mobile landscape and desktop). Add props:

```tsx
hoverValidTargets = { hoverValidTargets };
hoverShootingRange = { hoverShootingRange };
labelTargets = { labelTargets };
```

#### C16. Replace polling refs/effects with `useGamePolling`

Find the block starting with:

```typescript
const prevGameStateRef = React.useRef<{ currentTurn: string; currentRound: number } | null>(null);
const expectingStateChangeRef = ...
```

through the retry backoff effect and the turn-change reset effect (a block of ~300 lines total).

Replace with:

```typescript
import { useGamePolling } from "../hooks/useGamePolling";
// ...
const { recordPlayerMove } = useGamePolling({
  gameId: Number(game.metadata.gameId),
  turnTime: game.turnState.turnTime,
  gameData,
  refetchGame,
  onRefetch: () => setTargetShipId(null),
});
```

In the submit action handler, find:

```typescript
const moveTime = Date.now();
playerMoveTimeRef.current = moveTime;
setPlayerMoveTimestamp(moveTime);
```

Replace with:

```typescript
recordPlayerMove();
```

Remove the now-unused imports: `registerGameRefetch`, `unregisterGameRefetch` (but keep `globalGameRefetchFunctions` if used elsewhere). Remove the polling constants at module level (`POLL_INTERVAL_FOCUSED_MS`, etc.) since they move into the hook.

#### C17. Replace inline font strings with `STYLE_LABEL` / `STYLE_MONO`

After copying `app/styles/fontStyles.ts` (Tier A), add:

```typescript
import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";
```

Then bulk-replace:

- `style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}` → `style={STYLE_LABEL}`
- `fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",` → `...STYLE_LABEL,`
- `style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}` → `style={STYLE_MONO}`
- `fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",` → `...STYLE_MONO,`
- `fontFamily: "var(--font-jetbrains-mono), monospace",` → `...STYLE_MONO,`

There are 36 rajdhani occurrences and 12 mono occurrences in GameDisplay.

#### C18. Parity fixes: `hoverValidTargets`, `labelTargets`, `retreatPrepShipId` in SimulatedGameDisplay

These changes applied to **SimulatedGameDisplay** (not GameDisplay). Since master's `SimulatedGameDisplay.tsx` has the real web3 hooks but the same component structure, apply exactly the same logic as C13–C15 but adapted for SimulatedGameDisplay's data sources:

- Use `gameState.shipPositions` → convert to numeric via `allShipPositionsForGrid`
- Use `TUTORIAL_PLAYER_ADDRESS` instead of `address`
- Use `shipMap.size > 0` for `hasShips`

For `retreatPrepShipId` — the tutorial showed it for any disabled ship; master should match GameDisplay (only show when `actionOverride === ActionType.Retreat`). Change:

```typescript
// Old (eager — tutorial behaviour)
const retreatPrepShipId = useMemo(() => {
  if (!isMyTurn || !selectedShipId || !isSelectedShipDisabled) return null;
  return selectedShipId;
}, [...]);
```

to:

```typescript
// Matches GameDisplay
const retreatPrepShipId =
  selectedShipId != null &&
  actionOverride === ActionType.Retreat &&
  isShipOwnedByCurrentPlayer(selectedShipId)
    ? selectedShipId
    : null;
```

Also apply the STYLE_LABEL/STYLE_MONO font replacement to SimulatedGameDisplay (15 rajdhani + 6 mono).

---

## Order of Operations

Do the work in this order to avoid cascading type errors:

1. Copy Tier A files (creates the new modules everything else depends on)
2. Patch `gameGridRanges.ts` (Tier B §1) — new utility functions needed by C12–C15
3. Patch `globals.css` (Tier B §3)
4. Patch `simulatedTutorialRules.ts` (Tier B §2) — isolated, no dependencies
5. Patch `TutorialGridPanelConfigs.tsx` (Tier B §4) — isolated
6. Apply weapon animation changes (C1–C3) — independent of the large components
7. Apply `GameGrid.tsx` changes (C4–C10) — GameGridTooltip/ConfirmWidget need to exist first ✓
8. Apply `GameDisplay.tsx` changes (C11–C17)
9. Apply `SimulatedGameDisplay.tsx` changes (C18)
10. `npx tsc --noEmit` — fix any type errors
11. Run `npm run lint` — fix any lint errors
12. Smoke-test: start dev server, open a game, verify weapons fire, tooltip shows, confirm widget works, pan gesture is smooth

## What NOT to port

- `app/hooks/useAccount.ts` — web2 stub replacing wagmi's `useAccount`; master uses real wagmi
- `app/hooks/useCurrentUser.ts` — web2 NextAuth user hook; master uses wagmi address directly
- `app/hooks/useGameStream.ts` — web2 SSE stream; master uses on-chain event polling
- `app/hooks/useShipAttributesContract.ts` — web2 stub; master has real contract reads
- `app/hooks/use*Contract.ts` / `app/hooks/use*Contract*.ts` — all stubs on explore-traditional; master has real implementations
- `app/providers.tsx` — web2 removes RainbowKit/wagmi; master must keep them
- `app/utils/ensureUiChainsInWallet.ts` / `switchWalletChain.ts` — deleted on web2, needed on web3
- Anything under `app/api/`, `app/lib/`, `prisma/` — web2 backend infrastructure
- `app/types/next-auth.d.ts` — web2 auth types
- `app/config/networks.ts`, `app/config/contracts.ts` — master has multi-chain config; web2 stubs these out
