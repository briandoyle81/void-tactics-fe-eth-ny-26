import React from "react";
import { GridShipPosition } from "../types/gridDisplay";
import { collectDamageLabelTargets } from "../utils/gameGridRanges";
import { isRepairDronesSpecial } from "../utils/specialConfigWeb2";
import { readShipValue } from "../utils/requireShipValue";
import { wouldEnterSos } from "../utils/calculateDamage";

type Target = { shipId: number; position: { row: number; col: number } };

const EMPTY_RANGE_CELLS: { row: number; col: number }[] = [];
const EMPTY_DAMAGE_MAP: Map<number, number> = new Map();
const EMPTY_ID_SET: Set<number> = new Set();

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
  draggedShipId: number | null;
  effectiveDragCell: { row: number; col: number } | null;
  effectiveDragShipId: number | null;
  effectiveShootingRange: Array<{ row: number; col: number }>;
  effectiveValidTargets: Target[];
  shootingRange: Array<{ row: number; col: number }>;
  validTargets: Target[];
  labelTargets?: Target[];
  selectedWeaponType: "weapon" | "special" | "ram";
  specialType: number;
  shipVariant?: number;
  specialRange?: number;
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  lastMoveTargetShipId?: number | null;
  lastMoveShipId?: number | null;
  lastMoveNewPosition?: { row: number; col: number } | null;
  /**
   * Last mover's destination even when last-move ghosts/arrows are hidden
   * (a ship is selected). Weapon beams must aim here, not at the from-tile
   * ghost left on the grid.
   */
  lastMoveResolvedTo?: { shipId: number; row: number; col: number } | null;
  factionAbilityIsHeal?: boolean;
  factionAbilityStrength?: number;
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
  getShipAttributes: (shipId: number) => {
    hullPoints: number;
    reactorCriticalTimer: number;
  } | null;
}) {
  const {
    grid,
    allShipPositions,
    selectedShipId,
    targetShipId,
    previewPosition,
    draggedShipId,
    effectiveDragCell,
    effectiveDragShipId,
    effectiveShootingRange,
    effectiveValidTargets,
    shootingRange,
    validTargets,
    labelTargets,
    selectedWeaponType,
    specialType,
    shipVariant,
    specialRange,
    isCurrentPlayerTurn,
    isShipOwnedByCurrentPlayer,
    lastMoveTargetShipId,
    lastMoveShipId,
    lastMoveNewPosition,
    lastMoveResolvedTo,
    factionAbilityIsHeal = false,
    factionAbilityStrength,
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
    // Dest-tile hover is not a staged shot. Treating it as one cleared the
    // last-move beam target and remounted laser/plasma/missile loops on
    // every dest tile.
    const stagingOwnShot =
      selectedShipId != null &&
      (previewPosition != null || draggedShipId != null);
    if (stagingOwnShot) {
      if (targetShipId == null || targetShipId === 0) return null;
      return targetShipId;
    }
    return targetShipId || lastMoveTargetShipId || null;
  }, [
    selectedShipId,
    previewPosition,
    draggedShipId,
    targetShipId,
    lastMoveTargetShipId,
  ]);

  const flakEffectCells = React.useMemo(() => {
    if (selectedWeaponType !== "special" || specialType !== 3) return EMPTY_RANGE_CELLS;

    const range = readShipValue("specialRange", specialRange);
    const origin =
      previewPosition ?? (draggedShipId != null ? effectiveDragCell : null);
    if (origin) {
      const rangeCells = effectiveDragCell ? effectiveShootingRange : shootingRange;
      const targetCells = (effectiveDragCell ? effectiveValidTargets : validTargets)
        .map((t) => t.position);
      const combined = [...rangeCells, ...targetCells];
      if (combined.length > 0) return combined;
    }

    let start = origin;
    if (!start && selectedShipId != null) {
      for (let r = 0; r < grid.length && !start; r++) {
        const row = grid[r];
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          if (cell?.shipId === selectedShipId && !cell.isPreview) {
            start = { row: r, col: c };
            break;
          }
        }
      }
    }
    if (!start || range === undefined) return EMPTY_RANGE_CELLS;
    const cells: { row: number; col: number }[] = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const dist = Math.abs(r - start.row) + Math.abs(c - start.col);
        if (dist > 0 && dist <= range) cells.push({ row: r, col: c });
      }
    }
    return cells;
  }, [
    selectedWeaponType,
    specialType,
    specialRange,
    selectedShipId,
    grid,
    draggedShipId,
    effectiveDragCell,
    previewPosition,
    effectiveShootingRange,
    effectiveValidTargets,
    shootingRange,
    validTargets,
  ]);

  const projectedDamageByShipId = React.useMemo(() => {
    const shouldShowDamagePreview =
      selectedShipId != null &&
      isCurrentPlayerTurn &&
      isShipOwnedByCurrentPlayer(selectedShipId) &&
      (selectedWeaponType === "weapon" ||
        (selectedWeaponType === "special" && specialType === 3));

    if (!shouldShowDamagePreview) return EMPTY_DAMAGE_MAP;

    const map = new Map<number, number>();
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
    const isFactionHeal =
      selectedWeaponType === "ram" && factionAbilityIsHeal;
    const shouldShowRepairPreview =
      selectedShipId != null &&
      isCurrentPlayerTurn &&
      isShipOwnedByCurrentPlayer(selectedShipId) &&
      ((selectedWeaponType === "special" &&
        isRepairDronesSpecial(shipVariant ?? 1, specialType)) ||
        isFactionHeal);

    if (!shouldShowRepairPreview) return EMPTY_DAMAGE_MAP;

    const map = new Map<number, number>();
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
      const heal = isFactionHeal
        ? (factionAbilityStrength ?? 50)
        : calculateDamage(id, "special").reducedDamage;
      if (heal > 0) map.set(id, heal);
    });

    return map;
  }, [
    selectedShipId,
    isCurrentPlayerTurn,
    isShipOwnedByCurrentPlayer,
    selectedWeaponType,
    specialType,
    shipVariant,
    factionAbilityIsHeal,
    factionAbilityStrength,
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
      shipVariant,
      previewPosition,
      specialRange,
      factionAbilityIsHeal,
    });

    if (selectedWeaponType === "ram" && factionAbilityIsHeal) {
      return EMPTY_ID_SET;
    }

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

    return ids.size === 0 ? EMPTY_ID_SET : ids;
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
    shipVariant,
    previewPosition,
    specialRange,
    factionAbilityIsHeal,
    calculateDamage,
    getShipAttributes,
  ]);

  // Predicted SOS hologram: locked weapon target only. Other in-range ships
  // keep live art + damage labels. DESTROY (reactor) uses destroy art.
  const sosPreviewShipIds = React.useMemo(() => {
    const ids = new Set<number>();
    if (
      selectedShipId == null ||
      !isCurrentPlayerTurn ||
      !isShipOwnedByCurrentPlayer(selectedShipId) ||
      targetShipId == null ||
      targetShipId === 0 ||
      targetShipId === selectedShipId
    ) {
      return EMPTY_ID_SET;
    }
    if (selectedWeaponType === "ram") return EMPTY_ID_SET;
    if (
      selectedWeaponType === "special" &&
      isRepairDronesSpecial(shipVariant ?? 1, specialType)
    ) {
      return EMPTY_ID_SET;
    }

    const damage = calculateDamage(
      targetShipId,
      selectedWeaponType,
      selectedWeaponType === "special" && specialType === 3 ? true : undefined,
    );
    if (wouldEnterSos(damage, getShipAttributes(targetShipId))) {
      ids.add(targetShipId);
    }
    return ids.size === 0 ? EMPTY_ID_SET : ids;
  }, [
    selectedShipId,
    isCurrentPlayerTurn,
    isShipOwnedByCurrentPlayer,
    targetShipId,
    selectedWeaponType,
    specialType,
    shipVariant,
    calculateDamage,
    getShipAttributes,
  ]);

  const findShipPositionById = React.useCallback(
    (shipId: number | null | undefined): { row: number; col: number } | null => {
      if (shipId == null) return null;

      const resolved =
        lastMoveResolvedTo && lastMoveResolvedTo.shipId === shipId
          ? lastMoveResolvedTo
          : lastMoveShipId != null &&
              lastMoveShipId === shipId &&
              lastMoveNewPosition != null
            ? { shipId, row: lastMoveNewPosition.row, col: lastMoveNewPosition.col }
            : null;
      if (resolved && resolved.row >= 0 && resolved.col >= 0) {
        return { row: resolved.row, col: resolved.col };
      }

      // Prefer the real ship. Last-move ghosts reuse the same shipId on the
      // from-tile with isPreview, and a row-major scan would hit that first
      // whenever the ship moved down or right.
      let previewMatch: { row: number; col: number } | null = null;
      for (let r = 0; r < grid.length; r++) {
        const row = grid[r];
        for (let c = 0; c < row.length; c++) {
          const cell = row[c];
          if (cell?.shipId !== shipId) continue;
          if (!cell.isPreview) return { row: r, col: c };
          if (!previewMatch) previewMatch = { row: r, col: c };
        }
      }
      if (previewMatch) return previewMatch;

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
    [grid, allShipPositions, lastMoveResolvedTo, lastMoveShipId, lastMoveNewPosition],
  );

  return {
    directedWeaponBeamTargetId,
    flakEffectCells,
    projectedDamageByShipId,
    projectedRepairByShipId,
    destroyPreviewShipIds,
    sosPreviewShipIds,
    findShipPositionById,
  };
}
