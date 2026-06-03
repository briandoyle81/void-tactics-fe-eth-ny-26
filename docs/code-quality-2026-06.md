# Code Quality Audit — June 2026

Generated from a thorough review of `GameGrid.tsx`, `GameDisplay.tsx`, `SimulatedGameDisplay.tsx`, animation components, and hooks. Priority is on the reported grid performance regression (lag + cursor stutter during play).

---

## P0 — Performance: Root Cause of Grid Stutter

### 1. Per-cell `.some()` scans on every render
**File:** `app/components/GameGrid.tsx` lines 1033–1089  
**Severity:** HIGH — this is almost certainly the cursor stutter source.

Every grid cell render (187 cells, 17×11) calls `.some()` on all of: `movementRange`, `shootingRange`, `validTargets`, `assistableTargets`, `assistableTargetsFromStart`, `effectiveShootingRange`, `effectiveValidTargets`. Any mouse hover over a ship triggers `setHoveredCell` → full grid re-render → 187 × ~7 array scans = **~1,300 linear scans per render**. With 8–10 ships on each side the arrays are small but the constant re-scanning adds up at 60 fps.

**Fix:** Pre-compute `Set<string>` keyed by `"row,col"` for positional arrays and `Set<number>` for ship-ID arrays in `useMemo` blocks before the JSX return, then replace `.some()` with O(1) `.has()` inside the cell loop.

```typescript
const movementTileSet = useMemo(
  () => new Set(movementRange.map(p => `${p.row},${p.col}`)),
  [movementRange]
);
const validTargetIdSet = useMemo(
  () => new Set(validTargets.map(t => t.shipId)),
  [validTargets]
);
// … same for shootingRange, effectiveShootingRange, assistableTargets, etc.

// In cell loop:
const isMovementTile = movementTileSet.has(`${rowIndex},${colIndex}`);
const isValidTarget  = shouldRenderShipContent && validTargetIdSet.has(cell.shipId);
```

**Expected impact:** Drops per-render work from O(n×m) to O(n) for the cell loop.

---

### 2. `onMouseMove` fires unthrottled at 60 Hz on every ship cell
**File:** `app/components/GameGrid.tsx` lines 1521–1548  
**Severity:** HIGH

Every ship cell has an `onMouseMove` handler that calls `setHoveredCell(...)`, creating a new object and triggering a full GameGrid re-render on every mouse-move pixel. Combined with issue #1, moving the mouse over a ship causes continuous re-rendering at 60 fps with 1,300 scans each.

**Fix:** Either skip the update when the shipId hasn't changed (already partially there), or throttle with a ref:

```typescript
onMouseMove={
  shouldRenderShipContent
    ? (e) => {
        if (!hoveredCell || hoveredCell.shipId !== cell.shipId) return;
        // Only update mouse coords; batch via requestAnimationFrame
        const next = { ...hoveredCell, mouseX: e.clientX, mouseY: e.clientY };
        setHoveredCell(next);
      }
    : undefined
}
```

The tooltip positioning already uses `mouseX/mouseY`, so this still needs to update — but it can skip the update entirely when coords haven't changed enough (±2px threshold).

---

## P1 — Memory Leaks: Animation Components

### 3. `setTimeout` callbacks fire after unmount in weapon animations
**Files:** `app/components/weapon-animations/LaserShootingAnimation.tsx` lines 78, 81; `RailgunShootingAnimation.tsx` line 152; `MissileShootingAnimation.tsx` line 152  
**Severity:** HIGH

`LaserShootingAnimation` uses `setInterval(createLine, 150)` — the interval is properly cleared on unmount. But `createLine` itself schedules two `setTimeout` calls (lines 78, 81) to remove state entries 200–300 ms later. If the component unmounts while those timeouts are pending, they call `setLines`/`setFlares` on an unmounted component. Over multiple combat rounds this leaks setState closures.

`RailgunShootingAnimation` line 152 has the same pattern for muzzle flashes (the `timeoutId` on line 169 IS cleaned up, but the line-152 one is not).

**Fix:** Track mount state with a ref and guard all deferred state updates:

```typescript
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);

// Then inside createLine:
setTimeout(() => {
  if (mountedRef.current) setLines(prev => prev.filter(l => l.id !== lineId));
}, 300);
```

Apply to all four animation files with unguarded `setTimeout` + `setState`.

---

### 4. Animation components not wrapped in `React.memo`
**Files:** All files in `app/components/weapon-animations/`  
**Severity:** MED

Weapon animations are mounted/unmounted per turn but while they're alive, any parent re-render (hover, selection, etc.) causes them to re-render too even if their props are unchanged. Given that `GridContainerRef` is a ref (stable), and `attackerRow/Col/targetRow/Col` don't change mid-animation, these components should never re-render after mount.

**Fix:** `export default React.memo(LaserShootingAnimation)` (etc.) on each animation component. No prop comparator needed since all props are primitives or stable refs.

---

## P2 — DRY Violations

### 5. Range and target calculations duplicated between GameDisplay and SimulatedGameDisplay
**Files:** `GameDisplay.tsx` lines ~1176–1900, `SimulatedGameDisplay.tsx` lines ~1451–2100  
**Severity:** HIGH (maintenance burden)

`validTargets`, `shootingRange`, `dragValidTargets`, `dragShootingRange`, `hoverShootingRange`, `hoverValidTargets`, and `labelTargets` are all computed with near-identical `useMemo` logic in both files (~700 lines duplicated). Any change to range logic (as seen with the reactor overload fix) requires updating two places.

**Fix:** Extract to `app/hooks/useGameRanges.ts` accepting the common inputs (`selectedShipId`, `previewPosition`, `shipPositions`, `blockedGrid`, etc.) and returning all range/target arrays. Both display components call the hook.

---

### 6. `calculateDamage` logic duplicated
**Files:** `GameDisplay.tsx` lines ~1167–1185, `SimulatedGameDisplay.tsx` lines ~1430–1447  
**Severity:** MED

Identical damage-preview computation in both files.

**Fix:** Extract to `app/hooks/useDamageCalculation.ts`.

---

### 7. Repeated inline style objects throughout GameDisplay / SimulatedGameDisplay
**Severity:** LOW

The same `fontFamily: "var(--font-rajdhani)..."`, `fontFamily: "var(--font-jetbrains-mono)..."`, and common color/size combos appear hundreds of times across both files as inline style objects. This creates new objects on every render and is hard to update consistently.

**Fix:** Define shared style constants at module level:

```typescript
const STYLE_LABEL = { fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" } as const;
const STYLE_MONO  = { fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" } as const;
```

---

## P3 — File Size

### 8. Three files total 13,389 lines
| File | Lines |
|------|-------|
| `GameDisplay.tsx` | 5,126 |
| `SimulatedGameDisplay.tsx` | 4,314 |
| `GameGrid.tsx` | 3,949 |

**Severity:** MED (correctness risk — it's hard to reason about or review code this large)

**GameGrid.tsx** contains: event/zoom handlers (~150 lines), range visualization overlays (~200 lines), animation orchestration (~400 lines), cell rendering loop (~2,500 lines), tooltip (~300 lines), confirm widget (~300 lines). The cell rendering loop is the only part that truly can't be separated.

**Suggested split:**
- `GameGridTooltip.tsx` — the ship hover tooltip (lines ~3530–3750)
- `GameGridConfirmWidget.tsx` — the drag/hover confirm overlay (lines ~3160–3520)
- Range/target Set pre-computation → a `useGridCellSets.ts` hook

**GameDisplay.tsx / SimulatedGameDisplay.tsx**: After extracting the shared range hook (issue #5), both files shrink by ~700 lines each. Further candidates: the polling/refetch logic in GameDisplay (`useEffect` blocks lines ~234–350) → `useGamePolling.ts`.

---

## P4 — Minor Issues

### 9. O(n²) grid scan fallback in arrow rendering
**File:** `app/components/GameGrid.tsx` lines 2500–2514  
**Severity:** LOW

The arrow origin lookup falls back to scanning the entire grid when `allShipPositions` lookup fails. `allShipPositions` is always provided in practice, so this almost never fires. Could be removed.

### 10. Magic numbers in animation timing
**Files:** weapon-animations/*.tsx, GameGrid.tsx  
**Severity:** LOW

Animation durations are scattered as bare literals (`150`, `200`, `300`, `1000`, `2000` ms). Define in a shared `app/constants/animationTiming.ts` so all animations can be tuned from one place.

### 11. `window.addEventListener('mousemove')` during pan is unthrottled
**File:** `app/components/GameGrid.tsx` lines 502–514  
**Severity:** LOW

Pan mode attaches a raw `mousemove` to `window`. It's properly removed on cleanup, but each move event calls `setZoom`/`setPanOffset` state, causing renders. A `requestAnimationFrame` guard would eliminate redundant updates if the mouse moves faster than the frame rate.

---

## Quick Wins (high impact, low effort)

| # | Change | File | Expected Gain |
|---|--------|------|--------------|
| 1 | Pre-compute `.some()` → Set lookups | GameGrid.tsx | Eliminates most stutter |
| 2 | Skip `onMouseMove` update when shipId unchanged | GameGrid.tsx | Reduces 60 Hz churn |
| 3 | Add `mountedRef` guard to animation timeouts | LaserShootingAnimation, RailgunShootingAnimation, MissileShootingAnimation | Closes memory leak |
| 4 | `React.memo` on all animation components | weapon-animations/*.tsx | Stops unnecessary re-renders during hover |

Items 1–4 can be done in sequence without any architectural changes and should resolve the reported lag.
