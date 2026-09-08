import React, { useCallback, useMemo, useState } from "react";
import { ActionType, Attributes } from "../types/types";
import { GridShipPosition } from "../types/gridDisplay";
import type { Web2LastMove } from "../types/web2Game";
import {
  computeMovementRange,
  computeShootingRange,
  computeLabelTargets,
  computeHoverValidTargets,
  computeHoverShootingRange,
} from "../utils/gameGridRangesWeb2";
import { hasLineOfSight } from "../utils/gameGridRanges";
import { useResetSelectionOnTurnChange } from "./useResetSelectionOnTurnChange";
import { useRetreatModeCancellationWeb2 } from "./useRetreatModeCancellationWeb2";

// Shared `<GameGrid>` interaction state machine — extracted from
// `GameDisplay.tsx` (the original, most-current implementation) so both it
// and `GameDisplayWeb2.tsx` build their move/shoot/special/retreat/ram UI
// state the same way, on plain `number` ids (matching the `GridShip`
// display-layer convention — see `app/types/gridDisplay.ts`). No `Web2`
// suffix: like `GameGrid.tsx` itself, this is shared code that both callers
// adapt to, not a web2-only file web3 happens to reuse.
//
// Deliberately NOT ported here (stays caller-side): data fetching, the
// actual submission mechanism (contract tx vs REST POST — this hook only
// builds the payload), all JSX/chrome, and one web3-only nicety —
// `GameDisplay.tsx`'s "auto-preview the last move via previewPosition when
// idle" effect (ties into replay/localStorage machinery that's out of scope
// for this pass). The last-move *ghost rendering* inside the grid (old-
// position ghost, destroyed-target art) is pure derived data and IS
// included, via `displayGrid`.

export interface GameplayShip {
  id: number;
  owner: string;
  equipment: { mainWeapon: number; armor: number; shields: number; special: number };
}

export interface GameplayHoveredCell {
  shipId: number;
  row: number;
  col: number;
  isCreator: boolean;
  fromFleet?: boolean;
}

export interface GameplayActionPayload {
  shipId: number;
  row: number;
  col: number;
  actionType: ActionType;
  targetShipId: number;
  specialType: number;
}

export interface UseGameplayInteractionParams {
  gridWidth: number;
  gridHeight: number;
  shipMap: Map<number, GameplayShip>;
  getShipAttributes: (shipId: number) => Attributes | null;
  /** All ship positions (including destroyed/fled) — needed for last-move ghost/destroyed-target lookups. */
  allShipPositions: readonly GridShipPosition[];
  /** Alive ships only — used for the board grid and range/target computation. */
  aliveShipPositions: readonly GridShipPosition[];
  movedShipIdsSet: Set<number>;
  playerAddress: string | null;
  currentTurn: string;
  isGameOver: boolean;
  /** Already folds in readOnly/spectator mode and any submission-in-flight turn override the caller tracks. */
  isCurrentPlayerTurn: boolean;
  /** Whether a submission is currently in flight (blocks new proposed-move UI, matches GameDisplay's tx-pending check). */
  isSubmitting: boolean;
  blockedGrid: boolean[][];
  /** Authoritative last move from fresh data (live game state, or a replay snapshot) — used for grid ghosting and to auto-clear the optimistic overlay. */
  lastMove: Web2LastMove | null;
  /**
   * `selectedShipId`/`draggedShipId` are controlled (owned by the caller,
   * not this hook) because resolving their special-weapon range/data
   * requires a *real* hook call for web3 (`useSpecialRange`/`useSpecialData`
   * read the SHIP_ATTRIBUTES contract) — hooks can't be called from inside
   * a callback with a dynamic argument, so the caller must know the id
   * *before* calling this hook, call its own special-lookup hooks with it,
   * and pass the resolved values in. Web2's equivalent lookup is a plain
   * object read (`SPECIAL_CONFIG`), so this costs it nothing.
   */
  selectedShipId: number | null;
  setSelectedShipId: (id: number | null) => void;
  draggedShipId: number | null;
  setDraggedShipId: (id: number | null) => void;
  /** Pre-resolved special range/data for the *selected* ship's equipped special (0 if none). */
  selectedShipSpecialRange: number | undefined;
  selectedShipSpecialData: { strength: number } | null;
  /** Pre-resolved special range for the *dragged* ship's equipped special — drag preview uses the dragged ship's own weapon plan, not the selected ship's. */
  draggedShipSpecialRange: number | undefined;
}

export function useGameplayInteraction({
  gridWidth,
  gridHeight,
  shipMap,
  getShipAttributes,
  allShipPositions,
  aliveShipPositions,
  movedShipIdsSet,
  playerAddress,
  currentTurn,
  isGameOver,
  isCurrentPlayerTurn,
  isSubmitting,
  blockedGrid,
  lastMove,
  selectedShipId,
  setSelectedShipId,
  draggedShipId,
  setDraggedShipId,
  selectedShipSpecialRange,
  selectedShipSpecialData,
  draggedShipSpecialRange,
}: UseGameplayInteractionParams) {
  const [previewPosition, setPreviewPosition] = useState<{ row: number; col: number } | null>(null);
  const [targetShipId, setTargetShipId] = useState<number | null>(null);
  const [actionOverride, setActionOverride] = useState<ActionType | null>(null);
  const [retreatExplicitByShipId, setRetreatExplicitByShipId] = useState<Record<string, true>>({});
  const [selectedWeaponType, setSelectedWeaponType] = useState<"weapon" | "special" | "ram">("weapon");
  const [weaponPreferenceByShipId, setWeaponPreferenceByShipId] = useState<Record<string, "weapon" | "special">>({});
  const [hoveredCell, setHoveredCell] = useState<GameplayHoveredCell | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  const [hoverPreviewPosition, setHoverPreviewPosition] = useState<{ row: number; col: number } | null>(null);
  const [optimisticLastMove, setOptimisticLastMove] = useState<Web2LastMove | null>(null);

  const isShipOwnedByCurrentPlayer = useCallback(
    (shipId: number): boolean => {
      const ship = shipMap.get(shipId);
      return ship ? ship.owner === playerAddress : false;
    },
    [shipMap, playerAddress],
  );

  const isEnemyDisabledShipId = useCallback(
    (shipId: number): boolean => {
      const ship = shipMap.get(shipId);
      if (!ship || !playerAddress) return false;
      if (ship.owner === playerAddress) return false;
      const attrs = getShipAttributes(shipId);
      if (!attrs) return false;
      return attrs.hullPoints === 0;
    },
    [shipMap, playerAddress, getShipAttributes],
  );

  // Broad reset — used on turn change. `handleCancelMove` (below) is the
  // narrower "just clear the proposed move" version used elsewhere.
  const resetSelection = useCallback(() => {
    setSelectedShipId(null);
    setPreviewPosition(null);
    setTargetShipId(null);
    setActionOverride(null);
    setDraggedShipId(null);
    setDragOverCell(null);
    setHoveredCell(null);
    setRetreatExplicitByShipId({});
  }, [setSelectedShipId, setDraggedShipId]);
  useResetSelectionOnTurnChange(currentTurn, resetSelection);

  const handleCancelMove = useCallback(() => {
    setPreviewPosition(null);
    setSelectedShipId(null);
    setTargetShipId(null);
  }, [setSelectedShipId]);

  const handleGridRightClickDeselect = useCallback(() => {
    setActionOverride(null);
  }, []);

  const handleRetreatClick = useCallback(() => {
    if (selectedShipId != null) {
      const sid = selectedShipId;
      setRetreatExplicitByShipId((prev) => ({ ...prev, [sid.toString()]: true }));
    }
    setTargetShipId(null);
    setPreviewPosition(null);
  }, [selectedShipId]);

  // Records the caller's chosen weapon/special per ship (not for "ram" —
  // that's a targeting mode, not a persisted preference) — restored below
  // whenever selection changes to that ship.
  const setWeaponTypeFromGrid = useCallback(
    (type: "weapon" | "special" | "ram") => {
      if (selectedShipId != null && type !== "ram") {
        const sid = selectedShipId;
        setWeaponPreferenceByShipId((prev) => ({ ...prev, [sid.toString()]: type }));
      }
      setSelectedWeaponType(type);
    },
    [selectedShipId],
  );

  // Apply per-ship weapon mode before paint so range highlights match the selected ship.
  React.useLayoutEffect(() => {
    if (selectedShipId === null) {
      setSelectedWeaponType("weapon");
      return;
    }
    const idKey = selectedShipId.toString();
    const ship = shipMap.get(selectedShipId);
    const attrs = getShipAttributes(selectedShipId);
    if (attrs && attrs.hullPoints === 0) {
      setWeaponPreferenceByShipId((prev) => (prev[idKey] === "weapon" ? prev : { ...prev, [idKey]: "weapon" }));
      setSelectedWeaponType("weapon");
      return;
    }
    const canSpecial = !!(ship && ship.equipment.special > 0);
    const saved = weaponPreferenceByShipId[idKey] ?? "weapon";
    if (saved === "special" && !canSpecial) {
      setWeaponPreferenceByShipId((prev) => ({ ...prev, [idKey]: "weapon" }));
      setSelectedWeaponType("weapon");
      return;
    }
    setSelectedWeaponType(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedShipId, shipMap, getShipAttributes]);

  // Disabled ships: always Retreat. Healthy ships: Retreat only if the player chose it for that ship.
  React.useEffect(() => {
    if (selectedShipId === null) return;
    const attrs = getShipAttributes(selectedShipId);
    if (attrs && attrs.hullPoints === 0) {
      setActionOverride(ActionType.Retreat);
      setTargetShipId(null);
      setPreviewPosition(null);
      return;
    }
    setActionOverride(retreatExplicitByShipId[selectedShipId.toString()] ? ActionType.Retreat : null);
  }, [selectedShipId, getShipAttributes, retreatExplicitByShipId]);

  useRetreatModeCancellationWeb2({
    actionOverride,
    targetShipId,
    previewPosition,
    selectedShipId,
    setActionOverride,
    setRetreatExplicitByShipId,
  });

  const selectedShip = selectedShipId != null ? shipMap.get(selectedShipId) : null;
  const specialType = selectedShip?.equipment.special || 0;
  const specialRange = selectedShipSpecialRange;
  const specialData = selectedShipSpecialData;

  const isRammingMovePreview = useMemo(() => {
    if (!selectedShipId || !previewPosition) return false;
    const occupying = aliveShipPositions.find(
      (p) => p.position.row === previewPosition.row && p.position.col === previewPosition.col && p.shipId !== selectedShipId,
    );
    if (!occupying) return false;
    return isEnemyDisabledShipId(occupying.shipId);
  }, [selectedShipId, previewPosition, aliveShipPositions, isEnemyDisabledShipId]);

  React.useEffect(() => {
    if (!isRammingMovePreview) return;
    if (targetShipId === null) return;
    setTargetShipId(null);
  }, [isRammingMovePreview, targetShipId]);

  // Auto-set Flak to target all ships when Flak is first selected.
  const flakAutoSetRef = React.useRef<{ shipId: number | null; weaponType: string }>({ shipId: null, weaponType: "weapon" });
  React.useEffect(() => {
    if (selectedShipId && selectedWeaponType === "special" && specialType === 3) {
      const isNewSelection =
        flakAutoSetRef.current.shipId !== selectedShipId ||
        (flakAutoSetRef.current.weaponType !== "special" && selectedWeaponType === "special");
      if (isNewSelection && targetShipId !== null) {
        setTargetShipId(0);
        flakAutoSetRef.current = { shipId: selectedShipId, weaponType: selectedWeaponType };
      }
    } else {
      flakAutoSetRef.current = { shipId: selectedShipId, weaponType: selectedWeaponType };
    }
  }, [selectedShipId, selectedWeaponType, specialType, targetShipId]);

  const movementRange = useMemo(
    () =>
      computeMovementRange({
        gridWidth,
        gridHeight,
        selectedShipId,
        hasShips: shipMap.size > 0,
        shipMap,
        getShipAttributes,
        shipPositions: aliveShipPositions,
        previewPosition,
        canEnterOccupiedCell: (_row, _col, occupyingShipId) =>
          occupyingShipId !== selectedShipId && isEnemyDisabledShipId(occupyingShipId),
      }),
    [gridWidth, gridHeight, selectedShipId, shipMap, aliveShipPositions, getShipAttributes, previewPosition, isEnemyDisabledShipId],
  );

  const validTargets = useMemo(() => {
    if (!selectedShipId || shipMap.size === 0) return [];
    if (isRammingMovePreview) return [];
    const attributes = getShipAttributes(selectedShipId);
    if (attributes && attributes.hullPoints === 0) return [];

    const shootRange = selectedWeaponType === "special" && specialRange !== undefined ? specialRange : attributes?.range || 1;
    const currentPosition = aliveShipPositions.find((pos) => pos.shipId === selectedShipId);
    if (!currentPosition) return [];

    const startRow = previewPosition ? previewPosition.row : currentPosition.position.row;
    const startCol = previewPosition ? previewPosition.col : currentPosition.position.col;
    const targets: { shipId: number; position: { row: number; col: number } }[] = [];

    aliveShipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      if (selectedWeaponType === "special") {
        if (specialType === 3) {
          if (shipPosition.shipId === selectedShipId) return;
        } else if (specialType === 1) {
          if (ship.owner === playerAddress) return;
        } else {
          if (ship.owner !== playerAddress) return;
        }
      } else {
        if (ship.owner === playerAddress) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance = Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);
      const canShoot = distance === 1 || distance <= shootRange;
      const isSelfRepair = selectedWeaponType === "special" && specialType === 2 && distance === 0;

      if ((canShoot && distance > 0) || isSelfRepair) {
        const shouldCheckLineOfSight =
          distance > 1 && (selectedWeaponType !== "special" || (specialType !== 1 && specialType !== 2 && specialType !== 3));
        if (!shouldCheckLineOfSight || hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)) {
          targets.push({ shipId: shipPosition.shipId, position: { row: targetRow, col: targetCol } });
        }
      }
    });

    return targets;
  }, [selectedShipId, previewPosition, shipMap, playerAddress, getShipAttributes, blockedGrid, aliveShipPositions, selectedWeaponType, specialRange, specialType, isRammingMovePreview]);

  const labelTargets = useMemo(
    () =>
      computeLabelTargets({
        selectedShipId,
        previewPosition,
        isRammingMovePreview,
        shipPositions: aliveShipPositions,
        shipMap,
        playerAddress,
        getShipAttributes,
        selectedWeaponType,
        specialRange,
        specialType,
        blockedGrid,
        gridWidth,
        gridHeight,
      }),
    [selectedShipId, previewPosition, isRammingMovePreview, shipMap, playerAddress, getShipAttributes, blockedGrid, aliveShipPositions, selectedWeaponType, specialRange, specialType, gridWidth, gridHeight],
  );

  // Assist isn't exposed in the UI (removed from web3's contract; kept as
  // empty arrays for GameGrid's prop shape, same as GameDisplay.tsx).
  const assistableTargets = useMemo(() => [] as { shipId: number; position: { row: number; col: number } }[], []);
  const assistableTargetsFromStart = useMemo(() => [] as { shipId: number; position: { row: number; col: number } }[], []);

  const shootingRange = useMemo(
    () =>
      isRammingMovePreview
        ? []
        : computeShootingRange({
            gridWidth,
            gridHeight,
            selectedShipId,
            hasShips: shipMap.size > 0,
            shipMap,
            getShipAttributes,
            shipPositions: aliveShipPositions,
            previewPosition,
            selectedWeaponType,
            specialRange,
            specialType,
            blockedGrid,
          }),
    [gridWidth, gridHeight, selectedShipId, isRammingMovePreview, shipMap, getShipAttributes, aliveShipPositions, previewPosition, selectedWeaponType, specialRange, specialType, blockedGrid],
  );

  // Drag preview uses the DRAGGED ship's own remembered weapon preference
  // (not whatever's globally selected) — same as GameDisplay.tsx's
  // dragWeaponPlan, since dragging one ship shouldn't inherit another
  // selected ship's weapon choice.
  const draggedSpecialEquipmentType = draggedShipId != null ? (shipMap.get(draggedShipId)?.equipment.special ?? 0) : 0;
  const draggedSpecialRange = draggedShipSpecialRange;

  const dragWeaponPlan = useMemo(() => {
    if (!draggedShipId) {
      return { mode: "weapon" as const, specialEquipmentType: 0, specialRange: undefined as number | undefined };
    }
    const ship = shipMap.get(draggedShipId);
    const attrs = getShipAttributes(draggedShipId);
    if (attrs && attrs.hullPoints === 0) {
      return { mode: "weapon" as const, specialEquipmentType: draggedSpecialEquipmentType, specialRange: draggedSpecialRange };
    }
    const canSpecial = !!(ship && ship.equipment.special > 0);
    const saved = weaponPreferenceByShipId[draggedShipId.toString()] ?? "weapon";
    const mode = saved === "special" && canSpecial ? ("special" as const) : ("weapon" as const);
    return { mode, specialEquipmentType: draggedSpecialEquipmentType, specialRange: draggedSpecialRange };
  }, [draggedShipId, shipMap, getShipAttributes, weaponPreferenceByShipId, draggedSpecialEquipmentType, draggedSpecialRange]);

  const dragValidTargets = useMemo(() => {
    if (!draggedShipId || !dragOverCell || shipMap.size === 0) return [];
    const attributes = getShipAttributes(draggedShipId);
    if (!attributes) return [];

    const dragShootRange = dragWeaponPlan.mode === "special" && dragWeaponPlan.specialRange !== undefined ? dragWeaponPlan.specialRange : attributes.range || 1;
    const startRow = dragOverCell.row;
    const startCol = dragOverCell.col;
    const targets: { shipId: number; position: { row: number; col: number } }[] = [];
    const spec = dragWeaponPlan.specialEquipmentType;

    aliveShipPositions.forEach((shipPosition) => {
      const ship = shipMap.get(shipPosition.shipId);
      if (!ship) return;

      if (dragWeaponPlan.mode === "special") {
        if (spec === 3) {
          if (shipPosition.shipId === draggedShipId) return;
        } else if (spec === 1) {
          if (ship.owner === playerAddress) return;
        } else {
          if (ship.owner !== playerAddress) return;
        }
      } else {
        if (ship.owner === playerAddress) return;
      }

      const targetRow = shipPosition.position.row;
      const targetCol = shipPosition.position.col;
      const distance = Math.abs(targetRow - startRow) + Math.abs(targetCol - startCol);
      const canShoot = distance === 1 || distance <= dragShootRange;

      if (canShoot && distance > 0) {
        const shouldCheckLineOfSight = distance > 1 && (dragWeaponPlan.mode !== "special" || (spec !== 1 && spec !== 2 && spec !== 3));
        if (!shouldCheckLineOfSight || hasLineOfSight(startRow, startCol, targetRow, targetCol, blockedGrid)) {
          targets.push({ shipId: shipPosition.shipId, position: { row: targetRow, col: targetCol } });
        }
      }
    });

    return targets;
  }, [draggedShipId, dragOverCell, shipMap, playerAddress, getShipAttributes, dragWeaponPlan, aliveShipPositions, blockedGrid]);

  const dragShootingRange = useMemo(() => {
    if (!draggedShipId || !dragOverCell || shipMap.size === 0) return [];
    const ship = shipMap.get(draggedShipId);
    if (!ship) return [];
    const attributes = getShipAttributes(draggedShipId);
    if (!attributes) return [];

    const dragShootRange = dragWeaponPlan.mode === "special" && dragWeaponPlan.specialRange !== undefined ? dragWeaponPlan.specialRange : attributes.range || 1;
    const startRow = dragOverCell.row;
    const startCol = dragOverCell.col;
    const spec = dragWeaponPlan.specialEquipmentType;
    const validShootingPositions: { row: number; col: number }[] = [];

    for (let row = Math.max(0, startRow - 1); row <= Math.min(gridHeight - 1, startRow + 1); row++) {
      for (let col = Math.max(0, startCol - 1); col <= Math.min(gridWidth - 1, startCol + 1); col++) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
        if (distance === 1) {
          const isOccupied = aliveShipPositions.some((pos) => pos.position.row === row && pos.position.col === col);
          if (!isOccupied) validShootingPositions.push({ row, col });
        }
      }
    }

    for (let row = Math.max(0, startRow - dragShootRange); row <= Math.min(gridHeight - 1, startRow + dragShootRange); row++) {
      for (let col = Math.max(0, startCol - dragShootRange); col <= Math.min(gridWidth - 1, startCol + dragShootRange); col++) {
        const distance = Math.abs(row - startRow) + Math.abs(col - startCol);
        if (distance <= dragShootRange && distance > 1) {
          const isOccupied = aliveShipPositions.some((pos) => pos.position.row === row && pos.position.col === col);
          if (!isOccupied) {
            const shouldCheckLineOfSight = distance > 1 && (dragWeaponPlan.mode !== "special" || (spec !== 1 && spec !== 2 && spec !== 3));
            if (!shouldCheckLineOfSight || hasLineOfSight(startRow, startCol, row, col, blockedGrid)) {
              validShootingPositions.push({ row, col });
            }
          }
        }
      }
    }

    return validShootingPositions;
  }, [draggedShipId, dragOverCell, shipMap, getShipAttributes, dragWeaponPlan, aliveShipPositions, blockedGrid, gridWidth, gridHeight]);

  const hoverValidTargets = useMemo(
    () =>
      computeHoverValidTargets({
        selectedShipId,
        hoverPreviewPosition,
        hasShips: shipMap.size > 0,
        shipPositions: aliveShipPositions,
        shipMap,
        playerAddress,
        getShipAttributes,
        selectedWeaponType,
        specialRange,
        specialType,
        blockedGrid,
      }),
    [selectedShipId, hoverPreviewPosition, shipMap, playerAddress, getShipAttributes, selectedWeaponType, specialType, specialRange, aliveShipPositions, blockedGrid],
  );

  const hoverShootingRange = useMemo(
    () =>
      computeHoverShootingRange({
        selectedShipId,
        hoverPreviewPosition,
        hasShips: shipMap.size > 0,
        shipPositions: aliveShipPositions,
        getShipAttributes,
        selectedWeaponType,
        specialRange,
        specialType,
        blockedGrid,
        gridWidth,
        gridHeight,
      }),
    [selectedShipId, hoverPreviewPosition, shipMap, getShipAttributes, selectedWeaponType, specialType, specialRange, aliveShipPositions, blockedGrid, gridWidth, gridHeight],
  );

  const isShowingProposedMove = useMemo(() => {
    if (selectedShipId === null) return false;
    if (!isShipOwnedByCurrentPlayer(selectedShipId)) return false;
    if (movedShipIdsSet.has(selectedShipId)) {
      const attrs = getShipAttributes(selectedShipId);
      const isDisabled = attrs && attrs.hullPoints === 0;
      if (!isDisabled) return false;
    }
    if (!isCurrentPlayerTurn && !isSubmitting) return false;
    return true;
  }, [selectedShipId, isShipOwnedByCurrentPlayer, movedShipIdsSet, getShipAttributes, isCurrentPlayerTurn, isSubmitting]);

  const retreatPrepShipId = actionOverride === ActionType.Retreat && selectedShipId != null && isShipOwnedByCurrentPlayer(selectedShipId) ? selectedShipId : null;
  const retreatPrepIsCreator = retreatPrepShipId != null ? (shipMap.get(retreatPrepShipId) ? aliveShipPositions.find((p) => p.shipId === retreatPrepShipId)?.isCreator ?? null : null) : null;

  // Note: this preserves GameDisplay.tsx's current (tested-against-the-live-
  // contract) behavior of submitting Pass, not Ram, for a ramming move — the
  // contract infers the ram from "moved onto a disabled enemy's tile"
  // itself. GameDisplayWeb2.tsx's own submit step overrides this to Ram
  // (with the occupying ship as target) since its engine requires it
  // explicitly — see buildActionPayload below and its web2 call site.
  const computedActionType = useMemo(
    () =>
      actionOverride != null
        ? actionOverride
        : isRammingMovePreview
          ? ActionType.Pass
          : targetShipId !== null && targetShipId !== 0
            ? selectedWeaponType === "special"
              ? ActionType.Special
              : ActionType.Shoot
            : targetShipId === 0 && selectedWeaponType === "special" && specialType === 3
              ? ActionType.Special
              : ActionType.Pass,
    [actionOverride, isRammingMovePreview, targetShipId, selectedWeaponType, specialType],
  );

  const computedMoveCoords = useMemo(() => {
    if (previewPosition) return previewPosition;
    const cur = aliveShipPositions.find((p) => p.shipId === selectedShipId);
    return cur ? cur.position : { row: 0, col: 0 };
  }, [previewPosition, selectedShipId, aliveShipPositions]);

  // Retreat never has a previewPosition/targetShipId (it submits at the
  // ship's current tile — see computedMoveCoords' fallback below), so it
  // needs its own inclusion here rather than falling out of the
  // previewPosition/targetShipId check like every other action.
  const showConfirmWidget =
    !isGameOver &&
    isShowingProposedMove &&
    (actionOverride === ActionType.Retreat || previewPosition !== null || targetShipId !== null);

  const confirmWidgetLabel =
    computedActionType === ActionType.Retreat
      ? "RETREAT"
      : computedActionType === ActionType.Pass
        ? "HOLD FIRE"
        : computedActionType === ActionType.Ram
          ? "RAM"
          : selectedWeaponType === "special" && specialType === 2 && targetShipId != null
            ? "REPAIR"
            : targetShipId != null && targetShipId !== 0
              ? "FIRE"
              : "SUBMIT";

  const buildActionPayload = useCallback((): GameplayActionPayload | null => {
    if (!selectedShipId) return null;
    return {
      shipId: selectedShipId,
      row: computedMoveCoords.row,
      col: computedMoveCoords.col,
      actionType: computedActionType,
      targetShipId: computedActionType === ActionType.Pass ? 0 : (targetShipId ?? 0),
      specialType,
    };
  }, [selectedShipId, computedMoveCoords, computedActionType, targetShipId, specialType]);

  const recordOptimisticMove = useCallback((move: Web2LastMove) => {
    setOptimisticLastMove(move);
  }, []);

  // Clear the optimistic overlay once fresh data's lastMove matches it.
  React.useEffect(() => {
    if (!optimisticLastMove || !lastMove) return;
    const matches =
      lastMove.shipId === optimisticLastMove.shipId &&
      lastMove.actionType === optimisticLastMove.actionType &&
      lastMove.targetShipId === optimisticLastMove.targetShipId &&
      lastMove.oldRow === optimisticLastMove.oldRow &&
      lastMove.oldCol === optimisticLastMove.oldCol &&
      lastMove.newRow === optimisticLastMove.newRow &&
      lastMove.newCol === optimisticLastMove.newCol;
    if (matches) {
      setOptimisticLastMove(null);
      handleCancelMove();
    }
  }, [optimisticLastMove, lastMove, handleCancelMove]);

  const displayGrid: (GridShipPosition | null)[][] = useMemo(() => {
    const newGrid: (GridShipPosition | null)[][] = Array(gridHeight)
      .fill(null)
      .map(() => Array(gridWidth).fill(null));

    aliveShipPositions.forEach((shipPosition) => {
      const { position } = shipPosition;

      // Optimistic last move: render the ship at its submitted destination
      // (or remove it for retreat) until fresh data catches up.
      if (optimisticLastMove && shipPosition.shipId === optimisticLastMove.shipId) {
        if (optimisticLastMove.actionType === ActionType.Retreat) return;

        if (optimisticLastMove.newRow >= 0 && optimisticLastMove.newRow < gridHeight && optimisticLastMove.newCol >= 0 && optimisticLastMove.newCol < gridWidth) {
          if (!newGrid[optimisticLastMove.newRow][optimisticLastMove.newCol]) {
            newGrid[optimisticLastMove.newRow][optimisticLastMove.newCol] = {
              ...shipPosition,
              position: { row: optimisticLastMove.newRow, col: optimisticLastMove.newCol },
            };
          }
        }

        const oR = optimisticLastMove.oldRow;
        const oC = optimisticLastMove.oldCol;
        const nR = optimisticLastMove.newRow;
        const nC = optimisticLastMove.newCol;
        if ((oR !== nR || oC !== nC) && oR >= 0 && oR < gridHeight && oC >= 0 && oC < gridWidth && !newGrid[oR][oC]) {
          newGrid[oR][oC] = { ...shipPosition, position: { row: oR, col: oC }, isPreview: true };
        }
        return;
      }

      if (position.row >= 0 && position.row < gridHeight && position.col >= 0 && position.col < gridWidth) {
        newGrid[position.row][position.col] = shipPosition;
        if (selectedShipId === shipPosition.shipId && previewPosition) {
          newGrid[previewPosition.row][previewPosition.col] = {
            ...shipPosition,
            position: { row: previewPosition.row, col: previewPosition.col },
            isPreview: true,
          };
        }
      }
    });

    const isMyTurnNow = currentTurn === playerAddress;
    const shouldShowLastMoveNow = !isGameOver && lastMove != null && lastMove.shipId !== 0 && selectedShipId === null;
    const isShowingProposedMoveNow = (() => {
      if (selectedShipId === null || !isMyTurnNow || previewPosition === null) return false;
      const ship = shipMap.get(selectedShipId);
      return ship ? ship.owner === playerAddress : false;
    })();
    const canShowLastMove = shouldShowLastMoveNow && !isShowingProposedMoveNow;

    if (canShowLastMove && lastMove) {
      const lastMoveShipPosition = aliveShipPositions.find((pos) => pos.shipId === lastMove.shipId);
      if (lastMoveShipPosition) {
        const oldPos = { row: lastMove.oldRow, col: lastMove.oldCol };
        const newPos = { row: lastMove.newRow, col: lastMove.newCol };
        if (oldPos.row !== newPos.row || oldPos.col !== newPos.col) {
          if (oldPos.row >= 0 && oldPos.row < gridHeight && oldPos.col >= 0 && oldPos.col < gridWidth && !newGrid[oldPos.row][oldPos.col]) {
            newGrid[oldPos.row][oldPos.col] = { ...lastMoveShipPosition, position: oldPos, isPreview: true };
          }
        }
      }

      const isTargetingLastMove = lastMove.actionType === ActionType.Shoot || lastMove.actionType === ActionType.Special;
      if (isTargetingLastMove && lastMove.targetShipId !== 0) {
        const destroyedTargetShipPosition = allShipPositions.find((sp) => sp.shipId === lastMove.targetShipId && sp.status === 1);
        if (destroyedTargetShipPosition) {
          const { row, col } = destroyedTargetShipPosition.position;
          if (row >= 0 && row < gridHeight && col >= 0 && col < gridWidth && !newGrid[row][col]) {
            newGrid[row][col] = destroyedTargetShipPosition;
          }
        }
      }
    }

    return newGrid;
  }, [aliveShipPositions, allShipPositions, selectedShipId, previewPosition, optimisticLastMove, currentTurn, playerAddress, isGameOver, lastMove, shipMap, gridHeight, gridWidth]);

  return {
    // state
    selectedShipId,
    previewPosition,
    targetShipId,
    selectedWeaponType,
    hoveredCell,
    draggedShipId,
    dragOverCell,
    // setters
    setSelectedShipId,
    setPreviewPosition,
    setTargetShipId,
    setSelectedWeaponType: setWeaponTypeFromGrid,
    setHoveredCell,
    setDraggedShipId,
    setDragOverCell,
    onMoveTileHover: setHoverPreviewPosition,
    // derived
    displayGrid,
    movementRange,
    shootingRange,
    validTargets,
    labelTargets,
    assistableTargets,
    assistableTargetsFromStart,
    dragValidTargets,
    dragShootingRange,
    hoverValidTargets,
    hoverShootingRange,
    isRammingMovePreview,
    isShipOwnedByCurrentPlayer,
    isShowingProposedMove,
    computedActionType,
    computedMoveCoords,
    confirmWidgetLabel,
    showConfirmWidget,
    retreatPrepShipId,
    retreatPrepIsCreator,
    specialType,
    specialRange,
    specialData,
    // handlers
    handleCancelMove,
    handleGridRightClickDeselect,
    handleRetreatClick,
    resetSelection,
    buildActionPayload,
    recordOptimisticMove,
  };
}
