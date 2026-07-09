import React from "react";
import { GridShipPosition } from "../types/gridDisplay";
import { collectDamageLabelTargets } from "../utils/gameGridRanges";

type Target = { shipId: number; position: { row: number; col: number } };

/**
 * Bundles the grid's "what visual effects should show right now" derived
 * state — the projected damage/repair per ship, which cells get a Flak
 * burst, which ship is destroyed by the staged shot, the directed weapon
 * beam's target, and a target→position lookup. Extracted verbatim from
 * `GameGrid.tsx` — same memoized calculations, same output, just bundled
 * into one hook since they all read from the same "current
 * selection/targeting" inputs.
 */
export function useGridEffectPreviews(params: {
  grid: (GridShipPosition | null)[][];
  allShipPositions?: readonly GridShipPosition[];
  selectedShipId: number | null;
  targetShipId: number | null;
  previewPosition: { row: number; col: number } | null;
  effectiveDragCell: { row: number; col: number } | null;
  effectiveDragShipId: number | null;
  effectiveShootingRange: Array<{ row: number; col: number }>;
  effectiveValidTargets: Target[];
  shootingRange: Array<{ row: number; col: number }>;
  validTargets: Target[];
  labelTargets?: Target[];
  selectedWeaponType: "weapon" | "special" | "ram";
  specialType: number;
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  lastMoveTargetShipId?: number | null;
  calculateDamage: (
    targetShipId: number,
    weaponType?: "weapon" | "special",
    showReducedDamage?: boolean,
    shooterShipIdOverride?: number,
  ) => {
    reducedDamage: number;
    willKill: boolean;
    reactorCritical: boolean;
  };
  getShipAttributes: (shipId: number) => { reactorCriticalTimer: number } | null;
}) {
  const {
    grid,
    allShipPositions,
    selectedShipId,
    targetShipId,
    previewPosition,
    effectiveDragCell,
    effectiveDragShipId,
    effectiveShootingRange,
    effectiveValidTargets,
    shootingRange,
    validTargets,
    labelTargets,
    selectedWeaponType,
    specialType,
    isCurrentPlayerTurn,
    isShipOwnedByCurrentPlayer,
    lastMoveTargetShipId,
    calculateDamage,
    getShipAttributes,
  } = params;

  /**
   * Beam target for directed main weapons. When the player is staging a shot from
   * a preview or drag origin, only `targetShipId` applies. Falling back to
   * `lastMoveTargetShipId` in that case would replay the *previous* move's victim
   * (e.g. opponent shot the player's ship) while drawing from the staged
   * attacker, which looks like friendly fire.
   */
  const directedWeaponBeamTargetId = React.useMemo(() => {
    const stagingOwnShot =
      selectedShipId != null &&
      (previewPosition != null || effectiveDragCell != null);
    if (stagingOwnShot) {
      if (targetShipId == null || targetShipId === 0) return null;
      return targetShipId;
    }
    return targetShipId || lastMoveTargetShipId || null;
  }, [
    selectedShipId,
    previewPosition,
    effectiveDragCell,
    targetShipId,
    lastMoveTargetShipId,
  ]);

  const flakEffectCells = React.useMemo(() => {
    // Only show Flak explosions when a destination is active (hover, drag, or staged move).
    // Without an active destination, shootingRange is a multi-origin threat range and
    // would spread explosions across the whole board.
    if (!effectiveDragCell && !previewPosition) return [];
    // Flak should show explosions across all in-range tiles, including tiles
    // that contain ships. `shootingRange` excludes occupied tiles, so union with
    // target positions.
    const rangeCells = effectiveDragCell ? effectiveShootingRange : shootingRange;
    const targetCells = (effectiveDragCell ? effectiveValidTargets : validTargets)
      .map((t) => t.position);
    return [...rangeCells, ...targetCells];
  }, [
    effectiveDragCell,
    previewPosition,
    effectiveShootingRange,
    effectiveValidTargets,
    shootingRange,
    validTargets,
  ]);

  const projectedDamageByShipId = React.useMemo(() => {
    const map = new Map<number, number>();

    const shouldShowDamagePreview =
      selectedShipId != null &&
      isCurrentPlayerTurn &&
      isShipOwnedByCurrentPlayer(selectedShipId) &&
      (selectedWeaponType === "weapon" ||
        (selectedWeaponType === "special" && specialType === 3));

    if (!shouldShowDamagePreview) return map;

    const ids = new Set<number>();

    // Selected target (locked shot)
    if (targetShipId != null && targetShipId !== 0) {
      ids.add(targetShipId);
    }

    // Same ships that get floating damage labels: labelTargets (GameDisplay threat range)
    // when not dragging / not only preview-origin, else drag or preview valid targets.
    if (effectiveDragCell) {
      effectiveValidTargets.forEach((t) => ids.add(t.shipId));
    } else if (previewPosition) {
      validTargets.forEach((t) => ids.add(t.shipId));
    } else {
      (labelTargets ?? validTargets).forEach((t) => ids.add(t.shipId));
    }

    const showReducedDamage =
      selectedWeaponType === "special" && specialType === 3 ? true : undefined;

    ids.forEach((id) => {
      const dmg = calculateDamage(
        id,
        selectedWeaponType,
        showReducedDamage,
      ).reducedDamage;
      if (dmg > 0) map.set(id, dmg);
    });

    return map;
  }, [
    selectedShipId,
    isCurrentPlayerTurn,
    isShipOwnedByCurrentPlayer,
    selectedWeaponType,
    specialType,
    targetShipId,
    effectiveDragCell,
    effectiveValidTargets,
    validTargets,
    previewPosition,
    labelTargets,
    calculateDamage,
  ]);

  const projectedRepairByShipId = React.useMemo(() => {
    const map = new Map<number, number>();

    const shouldShowRepairPreview =
      selectedShipId != null &&
      isCurrentPlayerTurn &&
      isShipOwnedByCurrentPlayer(selectedShipId) &&
      selectedWeaponType === "special" &&
      specialType === 2;

    if (!shouldShowRepairPreview) return map;

    const ids = new Set<number>();

    if (targetShipId != null && targetShipId !== 0) {
      ids.add(targetShipId);
    }

    if (effectiveDragCell) {
      effectiveValidTargets.forEach((t) => ids.add(t.shipId));
    } else if (previewPosition) {
      validTargets.forEach((t) => ids.add(t.shipId));
    } else {
      (labelTargets ?? validTargets).forEach((t) => ids.add(t.shipId));
    }

    ids.forEach((id) => {
      const heal = calculateDamage(id, "special").reducedDamage;
      if (heal > 0) map.set(id, heal);
    });

    return map;
  }, [
    selectedShipId,
    isCurrentPlayerTurn,
    isShipOwnedByCurrentPlayer,
    selectedWeaponType,
    specialType,
    targetShipId,
    effectiveDragCell,
    effectiveValidTargets,
    validTargets,
    previewPosition,
    labelTargets,
    calculateDamage,
  ]);

  const destroyPreviewShipIds = React.useMemo(() => {
    const ids = new Set<number>();
    const targetsToShow = collectDamageLabelTargets({
      grid,
      allShipPositions,
      selectedShipId,
      targetShipId,
      draggedShipId: effectiveDragShipId,
      dragOverCell: effectiveDragCell,
      dragValidTargets: effectiveValidTargets,
      validTargets,
      labelTargets,
      selectedWeaponType,
      specialType,
    });

    for (const target of targetsToShow) {
      const damage = calculateDamage(
        target.shipId,
        selectedWeaponType === "ram" ? "weapon" : selectedWeaponType,
        selectedWeaponType === "special" && specialType === 3
          ? true
          : undefined,
      );
      const targetAttributes = getShipAttributes(target.shipId);
      const willDestroyByReactor =
        damage.reactorCritical &&
        !!targetAttributes &&
        targetAttributes.reactorCriticalTimer + 1 >= 3;
      // Same condition as label text "[DESTROY]" (main gun, flak, EMP reactor stack).
      if (willDestroyByReactor) {
        ids.add(target.shipId);
      }
    }

    return ids;
  }, [
    grid,
    allShipPositions,
    selectedShipId,
    targetShipId,
    effectiveDragShipId,
    effectiveDragCell,
    effectiveValidTargets,
    validTargets,
    labelTargets,
    selectedWeaponType,
    specialType,
    calculateDamage,
    getShipAttributes,
  ]);

  const findShipPositionById = React.useCallback(
    (shipId: number | null | undefined): { row: number; col: number } | null => {
      if (shipId == null) return null;

      // Primary: find in currently rendered grid.
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r];
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          if (cell?.shipId === shipId) {
            return { row: r, col: c };
          }
        }
      }

      // Fallback: use authoritative game shipPositions from GameDataView.
      if (allShipPositions && allShipPositions.length > 0) {
        const fallbackPos = allShipPositions.find((sp) => sp.shipId === shipId);
        if (fallbackPos) {
          return {
            row: fallbackPos.position.row,
            col: fallbackPos.position.col,
          };
        }
      }

      return null;
    },
    [grid, allShipPositions],
  );

  return {
    directedWeaponBeamTargetId,
    flakEffectCells,
    projectedDamageByShipId,
    projectedRepairByShipId,
    destroyPreviewShipIds,
    findShipPositionById,
  };
}
