"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { ShipPosition, Attributes, Ship, ActionType } from "../types/types";
import { ShipImage, SHIP_IMAGE_RANK_STAR_BOX } from "./ShipImage";
import { calculateShipRank } from "../utils/shipLevel";
import ShipCard from "./ShipCard";
import { LaserShootingAnimation } from "./weapon-animations/LaserShootingAnimation";
import { MissileShootingAnimation } from "./weapon-animations/MissileShootingAnimation";
import { PlasmaShootingAnimation } from "./weapon-animations/PlasmaShootingAnimation";
import { RailgunShootingAnimation } from "./weapon-animations/RailgunShootingAnimation";
import { FlakExplosionAnimation } from "./weapon-animations/FlakExplosionAnimation";
import { RepairDroneAnimation } from "./weapon-animations/RepairDroneAnimation";
import { EmpWaveAnimation } from "./weapon-animations/EmpWaveAnimation";
import { RetreatPrepAnimation } from "./weapon-animations/RetreatPrepAnimation";
import { WarpFieldCollapseAnimation } from "./weapon-animations/WarpFieldCollapseAnimation";

/** Horizontal center, top, and bottom of a cell in overlay coords (container-relative).
 * Prefer DOM rects: tiles are aspect-square inside fr tracks, so uniform track
 * math can sit left/right of the painted square (same fix as move-path arrows). */
function measureGridCellLabelAnchor(
  containerRect: DOMRect,
  layoutRoot: HTMLElement | null,
  row: number,
  col: number,
  fallback: {
    originX: number;
    originY: number;
    cellWidth: number;
    cellHeight: number;
  },
): { cx: number; cellTop: number; cellBottom: number } {
  const el = layoutRoot?.querySelector(
    `[data-grid-row="${row}"][data-grid-col="${col}"]`,
  ) as HTMLElement | null;
  if (el) {
    const rect = el.getBoundingClientRect();
    return {
      cx: (rect.left + rect.right) / 2 - containerRect.left,
      cellTop: rect.top - containerRect.top,
      cellBottom: rect.bottom - containerRect.top,
    };
  }
  const cellTop = fallback.originY + row * fallback.cellHeight;
  return {
    cx: fallback.originX + col * fallback.cellWidth + fallback.cellWidth / 2,
    cellTop,
    cellBottom: cellTop + fallback.cellHeight,
  };
}

/** Viewport bounds for a grid cell (fixed tooltip placement vs the moused tile). */
function measureGridCellViewportBounds(
  layoutRoot: HTMLElement | null,
  row: number,
  col: number,
  fallback: {
    gridContainerViewportLeft: number;
    gridContainerViewportTop: number;
    originX: number;
    originY: number;
    cellWidth: number;
    cellHeight: number;
  },
): { left: number; top: number; right: number; bottom: number } {
  const el = layoutRoot?.querySelector(
    `[data-grid-row="${row}"][data-grid-col="${col}"]`,
  ) as HTMLElement | null;
  if (el) {
    const rect = el.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    };
  }
  const left =
    fallback.gridContainerViewportLeft +
    fallback.originX +
    col * fallback.cellWidth;
  const top =
    fallback.gridContainerViewportTop +
    fallback.originY +
    row * fallback.cellHeight;
  return {
    left,
    top,
    right: left + fallback.cellWidth,
    bottom: top + fallback.cellHeight,
  };
}

type DamageLabelTarget = { shipId: bigint; row: number; col: number };

/** Same target list as the floating damage-label overlay (keeps destroy-preview art in sync). */
function collectDamageLabelTargets(params: {
  grid: (ShipPosition | null)[][];
  allShipPositions?: readonly ShipPosition[];
  selectedShipId: bigint | null;
  targetShipId: bigint | null;
  draggedShipId: bigint | null;
  dragOverCell: { row: number; col: number } | null;
  dragValidTargets: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  validTargets: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  labelTargets?: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  selectedWeaponType: "weapon" | "special";
  specialType: number;
}): DamageLabelTarget[] {
  const {
    grid,
    allShipPositions,
    selectedShipId,
    targetShipId,
    draggedShipId,
    dragOverCell,
    dragValidTargets,
    validTargets,
    labelTargets,
    selectedWeaponType,
    specialType,
  } = params;

  const targetsToShow: DamageLabelTarget[] = [];
  const selectedShipSide =
    selectedShipId != null
      ? (() => {
          for (let r = 0; r < grid.length; r++) {
            const row = grid[r];
            for (let c = 0; c < row.length; c++) {
              const cell = row[c];
              if (cell?.shipId === selectedShipId) {
                return cell.isCreator;
              }
            }
          }
          const fallback = allShipPositions?.find(
            (sp) => sp.shipId === selectedShipId,
          );
          return fallback?.isCreator ?? null;
        })()
      : null;

  const shouldShowTargetLabel = (
    shipId: bigint,
    fallbackIsCreator?: boolean,
  ) => {
    if (selectedShipSide == null) return true;
    const targetSide =
      fallbackIsCreator ??
      (() => {
        for (let r = 0; r < grid.length; r++) {
          const row = grid[r];
          for (let c = 0; c < row.length; c++) {
            const cell = row[c];
            if (cell?.shipId === shipId) return cell.isCreator;
          }
        }
        const fallback = allShipPositions?.find((sp) => sp.shipId === shipId);
        return fallback?.isCreator;
      })();
    if (targetSide == null) return true;

    if (selectedWeaponType === "special" && specialType === 2) {
      return targetSide === selectedShipSide;
    }
    return targetSide !== selectedShipSide;
  };

  const pushTargetIfAllowed = (
    shipId: bigint,
    row: number,
    col: number,
    fallbackIsCreator?: boolean,
  ) => {
    if (!shouldShowTargetLabel(shipId, fallbackIsCreator)) return;
    if (targetsToShow.some((t) => t.shipId === shipId)) return;
    targetsToShow.push({ shipId, row, col });
  };

  if (targetShipId) {
    grid.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell && cell.shipId === targetShipId) {
          pushTargetIfAllowed(cell.shipId, r, c, cell.isCreator);
        }
      });
    });
  }

  if (draggedShipId && dragOverCell) {
    dragValidTargets.forEach((target) => {
      pushTargetIfAllowed(
        target.shipId,
        target.position.row,
        target.position.col,
      );
    });
  }

  const targetsForLabels = labelTargets ?? validTargets;
  const hasSingleSelectedTarget =
    targetShipId != null && targetShipId !== 0n;

  if (selectedShipId && !hasSingleSelectedTarget) {
    targetsForLabels.forEach((target) => {
      pushTargetIfAllowed(
        target.shipId,
        target.position.row,
        target.position.col,
      );
    });
  }

  return targetsToShow;
}

interface GameGridProps {
  grid: (ShipPosition | null)[][];
  allShipPositions?: readonly ShipPosition[];
  shipMap: Map<bigint, Ship>;
  selectedShipId: bigint | null;
  previewPosition: { row: number; col: number } | null;
  targetShipId: bigint | null;
  selectedWeaponType: "weapon" | "special";
  hoveredCell: {
    shipId: bigint;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreator: boolean;
  } | null;
  draggedShipId: bigint | null;
  dragOverCell: { row: number; col: number } | null;
  movementRange: Array<{ row: number; col: number }>;
  shootingRange: Array<{ row: number; col: number }>;
  validTargets: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  labelTargets?: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>; // Optional: when provided (GameDisplay), used for damage labels; otherwise fall back to validTargets
  assistableTargets: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  assistableTargetsFromStart: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  dragShootingRange: Array<{ row: number; col: number }>;
  dragValidTargets: Array<{
    shipId: bigint;
    position: { row: number; col: number };
  }>;
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: bigint) => boolean;
  movedShipIdsSet: Set<bigint>;
  specialType: number;
  blockedGrid: boolean[][];
  scoringGrid: number[][];
  onlyOnceGrid: boolean[][];
  calculateDamage: (
    targetShipId: bigint,
    weaponType?: "weapon" | "special",
    showReducedDamage?: boolean,
    shooterShipIdOverride?: bigint,
  ) => {
    reducedDamage: number;
    willKill: boolean;
    reactorCritical: boolean;
  };
  getShipAttributes: (shipId: bigint) => Attributes | null;
  disableTooltips: boolean;
  address: string | undefined;
  currentTurn: string;
  highlightedMovePosition?: { row: number; col: number } | null;
  lastMoveShipId?: bigint | null; // Ship ID for the last move (to show pulse effect)
  lastMoveOldPosition?: { row: number; col: number } | null; // Old position for last move preview
  // New position for the last move (to position). When playing back weapon
  // effects for the last move, the beam should originate from this "to"
  // position rather than the old position.
  lastMoveNewPosition?: { row: number; col: number } | null;
  lastMoveActionType?: ActionType | null; // When Retreat, show warp collapse at old position
  lastMoveTargetShipId?: bigint | null; // When last move was Special (e.g. repair), target ship for animation
  lastMoveIsCurrentPlayer?: boolean | undefined; // true = blue outline, false = red outline
  /** Ramming preview destination tile. */
  rammingPreviewPosition?: { row: number; col: number } | null;
  /** True when the staged move is a ramming move. */
  isRammingMovePreview?: boolean;
  /** When set, last-move EMP replay still shows while a ship is selected (e.g. tutorial ship-destruction). */
  showLastMoveEmpReplayWhenSelected?: boolean;
  retreatPrepShipId?: bigint | null; // When set, this ship shows flip + engine glow (Retreat selected)
  retreatPrepIsCreator?: boolean | null; // For retreat prep flip direction
  /**
   * **Tutorial highlight**: cells that show a gentle pulsing yellow tint under ships
   * (e.g. select-ship until a player ship is selected; view-enemy until an enemy ship).
   * Optional `label` overrides the floating badge text.
   * `tutorialDefaultLabel` sets fallback text when label is omitted (default "Click here").
   * Set `hideLabel` to pulse the cell without rendering the badge.
   */
  tutorialHighlightCells?: readonly {
    row: number;
    col: number;
    label?: string;
    hideLabel?: boolean;
  }[];
  tutorialDefaultLabel?: string;
  /** Extra clears (e.g. retreat override) after right-click deselect on the grid. */
  onGridRightClickDeselect?: () => void;
  setSelectedShipId: (shipId: bigint | null) => void;
  setPreviewPosition: (position: { row: number; col: number } | null) => void;
  setTargetShipId: (shipId: bigint | null) => void;
  setSelectedWeaponType: (type: "weapon" | "special") => void;
  setHoveredCell: (
    cell: {
      shipId: bigint;
      row: number;
      col: number;
      mouseX: number;
      mouseY: number;
      isCreator: boolean;
    } | null,
  ) => void;
  setDraggedShipId: (shipId: bigint | null) => void;
  setDragOverCell: (cell: { row: number; col: number } | null) => void;
}

export function GameGrid({
  grid,
  allShipPositions,
  shipMap,
  selectedShipId,
  previewPosition,
  targetShipId,
  selectedWeaponType,
  hoveredCell,
  draggedShipId,
  dragOverCell,
  movementRange,
  shootingRange,
  validTargets,
  labelTargets,
  assistableTargets,
  assistableTargetsFromStart,
  dragShootingRange,
  dragValidTargets,
  isCurrentPlayerTurn,
  isShipOwnedByCurrentPlayer,
  movedShipIdsSet,
  specialType,
  blockedGrid,
  scoringGrid,
  onlyOnceGrid,
  calculateDamage,
  getShipAttributes,
  disableTooltips,
  address,
  currentTurn,
  highlightedMovePosition,
  lastMoveShipId,
  lastMoveOldPosition,
  lastMoveNewPosition,
  lastMoveActionType,
  lastMoveTargetShipId,
  lastMoveIsCurrentPlayer,
  rammingPreviewPosition = null,
  isRammingMovePreview = false,
  showLastMoveEmpReplayWhenSelected = false,
  retreatPrepShipId,
  retreatPrepIsCreator,
  tutorialHighlightCells,
  tutorialDefaultLabel = "Click here",
  onGridRightClickDeselect,
  setSelectedShipId,
  setPreviewPosition,
  setTargetShipId,
  setSelectedWeaponType,
  setHoveredCell,
  setDraggedShipId,
  setDragOverCell,
}: GameGridProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  /** The bordered CSS grid (cells); tracks are inset by border — use for cell math vs overlay. */
  const gridLayoutRef = useRef<HTMLDivElement>(null);
  // Track last drag over cell to prevent excessive state updates
  const lastDragOverCellRef = useRef<{ row: number; col: number } | null>(null);

  /** Re-render on grid container resize so ship tooltips stay aligned with cells. */
  const [, setGridLayoutVersion] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = gridContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setGridLayoutVersion((v) => v + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [useCompactMobileDamageLabels, setUseCompactMobileDamageLabels] =
    React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setUseCompactMobileDamageLabels(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const isMyTurn = currentTurn === address;
  const selectedShipCreatorSide = React.useMemo(() => {
    if (selectedShipId == null) return null as boolean | null;
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (!cell || cell.shipId !== selectedShipId) continue;
        if (!cell.isPreview) return cell.isCreator;
      }
    }
    for (let r = 0; r < grid.length; r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (!cell || cell.shipId !== selectedShipId) continue;
        return cell.isCreator;
      }
    }
    return null;
  }, [grid, selectedShipId]);

  const lastMoveActionNum =
    lastMoveActionType != null ? Number(lastMoveActionType) : NaN;

  const showLastMoveEmpReplay =
    !selectedShipId || showLastMoveEmpReplayWhenSelected;

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
      (previewPosition != null ||
        (draggedShipId != null && dragOverCell != null));
    if (stagingOwnShot) {
      if (targetShipId == null || targetShipId === 0n) return null;
      return targetShipId;
    }
    return targetShipId || lastMoveTargetShipId || null;
  }, [
    selectedShipId,
    previewPosition,
    draggedShipId,
    dragOverCell,
    targetShipId,
    lastMoveTargetShipId,
  ]);

  /** Set of `"row,col"` keys for `tutorialHighlightCells` (tutorial highlight). */
  const tutorialHighlightKeySet = React.useMemo(() => {
    if (!tutorialHighlightCells?.length) return null;
    return new Set(
      tutorialHighlightCells.map((p) => `${p.row},${p.col}`),
    );
  }, [tutorialHighlightCells]);

  const flakEffectCells = React.useMemo(() => {
    // Flak should show explosions across all in-range tiles, including tiles
    // that contain ships. `shootingRange` excludes occupied tiles, so union with
    // target positions.
    const rangeCells =
      draggedShipId && dragOverCell ? dragShootingRange : shootingRange;
    const targetCells = (
      draggedShipId && dragOverCell ? dragValidTargets : validTargets
    ).map((t) => t.position);
    return [...rangeCells, ...targetCells];
  }, [
    draggedShipId,
    dragOverCell,
    dragShootingRange,
    shootingRange,
    dragValidTargets,
    validTargets,
  ]);

  const projectedDamageByShipId = React.useMemo(() => {
    const map = new Map<bigint, number>();

    const shouldShowDamagePreview =
      selectedShipId != null &&
      isCurrentPlayerTurn &&
      isShipOwnedByCurrentPlayer(selectedShipId) &&
      (selectedWeaponType === "weapon" ||
        (selectedWeaponType === "special" && specialType === 3));

    if (!shouldShowDamagePreview) return map;

    const ids = new Set<bigint>();

    // Selected target (locked shot)
    if (targetShipId != null && targetShipId !== 0n) {
      ids.add(targetShipId);
    }

    // Same ships that get floating damage labels: labelTargets (GameDisplay threat range)
    // when not dragging / not only preview-origin, else drag or preview valid targets.
    if (draggedShipId && dragOverCell) {
      dragValidTargets.forEach((t) => ids.add(t.shipId));
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
    draggedShipId,
    dragOverCell,
    dragValidTargets,
    validTargets,
    previewPosition,
    labelTargets,
    calculateDamage,
  ]);

  const projectedRepairByShipId = React.useMemo(() => {
    const map = new Map<bigint, number>();

    const shouldShowRepairPreview =
      selectedShipId != null &&
      isCurrentPlayerTurn &&
      isShipOwnedByCurrentPlayer(selectedShipId) &&
      selectedWeaponType === "special" &&
      specialType === 2;

    if (!shouldShowRepairPreview) return map;

    const ids = new Set<bigint>();

    if (targetShipId != null && targetShipId !== 0n) {
      ids.add(targetShipId);
    }

    if (draggedShipId && dragOverCell) {
      dragValidTargets.forEach((t) => ids.add(t.shipId));
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
    draggedShipId,
    dragOverCell,
    dragValidTargets,
    validTargets,
    previewPosition,
    labelTargets,
    calculateDamage,
  ]);

  const destroyPreviewShipIds = React.useMemo(() => {
    const ids = new Set<bigint>();
    const targetsToShow = collectDamageLabelTargets({
      grid,
      allShipPositions,
      selectedShipId,
      targetShipId,
      draggedShipId,
      dragOverCell,
      dragValidTargets,
      validTargets,
      labelTargets,
      selectedWeaponType,
      specialType,
    });

    for (const target of targetsToShow) {
      const damage = calculateDamage(
        target.shipId,
        selectedWeaponType,
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
    draggedShipId,
    dragOverCell,
    dragValidTargets,
    validTargets,
    labelTargets,
    selectedWeaponType,
    specialType,
    calculateDamage,
    getShipAttributes,
  ]);

  const findShipPositionById = React.useCallback(
    (shipId: bigint | null | undefined): { row: number; col: number } | null => {
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

  const handleGridContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setSelectedShipId(null);
      setPreviewPosition(null);
      setTargetShipId(null);
      setHoveredCell(null);
      setDraggedShipId(null);
      setDragOverCell(null);
      lastDragOverCellRef.current = null;
      onGridRightClickDeselect?.();
    },
    [
      onGridRightClickDeselect,
      setSelectedShipId,
      setPreviewPosition,
      setTargetShipId,
      setHoveredCell,
      setDraggedShipId,
      setDragOverCell,
    ],
  );

  return (
    <>
      {/* Map Grid */}
      <div
        className="w-full h-full min-h-0 px-0 lg:px-2"
        onContextMenu={handleGridContextMenu}
      >
        <div
          ref={gridContainerRef}
          key="game-grid"
          className="relative w-full h-full min-h-0"
        >
          <div
            ref={gridLayoutRef}
            className="relative z-0 grid gap-0 border border-near-black grid-cols-[repeat(17,1fr)] grid-rows-[repeat(11,1fr)] w-full h-full min-h-0"
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const ship = cell ? shipMap.get(cell.shipId) : null;
                const cellStatus = cell?.status ?? 0;
                const isCellDestroyed = cellStatus === 1;
                const isCellFled = cellStatus === 2;
                const isLastMoveDestroyedTargetCell =
                  !!cell &&
                  isCellDestroyed &&
                  lastMoveTargetShipId != null &&
                  cell.shipId === lastMoveTargetShipId;
                const isLastMoveAttackTargetCell =
                  !!cell &&
                  lastMoveTargetShipId != null &&
                  cell.shipId === lastMoveTargetShipId &&
                  (lastMoveActionNum === ActionType.Shoot ||
                    lastMoveActionNum === ActionType.Special);
                const shouldRenderShipContent =
                  !!cell && !isCellFled && (!isCellDestroyed || isLastMoveDestroyedTargetCell);
                const isSelected = selectedShipId === cell?.shipId;
                const isMovementTile = movementRange.some(
                  (pos) => pos.row === rowIndex && pos.col === colIndex,
                );
                const isHighlightedMove =
                  highlightedMovePosition &&
                  highlightedMovePosition.row === rowIndex &&
                  highlightedMovePosition.col === colIndex;
                const isShootingTile = shootingRange.some(
                  (pos) => pos.row === rowIndex && pos.col === colIndex,
                );
                const isTutorialHighlightCell =
                  tutorialHighlightKeySet?.has(
                    `${rowIndex},${colIndex}`,
                  ) ?? false;

                // Check if this ship has already moved this round
                const hasShipMoved = cell && movedShipIdsSet.has(cell.shipId);

                // Check if this cell contains a valid target
                // When dragging, use dragValidTargets; otherwise use validTargets
                const isValidTarget =
                  shouldRenderShipContent &&
                  selectedShipId &&
                  isCurrentPlayerTurn &&
                  isShipOwnedByCurrentPlayer(selectedShipId) &&
                  (() => {
                    // Check if this is a valid target based on weapon type
                    const isValidTargetType =
                      selectedWeaponType === "special"
                        ? specialType === 3 // Flak
                          ? cell.shipId !== selectedShipId // Flak hits ALL ships in range except itself
                          : specialType === 1 // EMP
                            ? !isShipOwnedByCurrentPlayer(cell.shipId) // EMP targets enemy ships
                            : isShipOwnedByCurrentPlayer(cell.shipId) // Other special abilities target friendly ships
                        : !isShipOwnedByCurrentPlayer(cell.shipId); // Weapons target enemy ships
                    return isValidTargetType;
                  })() &&
                  (draggedShipId && dragOverCell
                    ? dragValidTargets.some(
                        (target) => target.shipId === cell.shipId,
                      )
                    : validTargets.some(
                        (target) => target.shipId === cell.shipId,
                      ));

                // Check if this cell contains an assistable target (friendly ship with 0 HP)
                const isAssistableTarget =
                  shouldRenderShipContent &&
                  selectedShipId &&
                  isCurrentPlayerTurn &&
                  isShipOwnedByCurrentPlayer(selectedShipId) &&
                  (assistableTargets.some(
                    (target) => target.shipId === cell.shipId,
                  ) ||
                    assistableTargetsFromStart.some(
                      (target) => target.shipId === cell.shipId,
                    ));
                const isSelectedTarget = cell && targetShipId === cell.shipId;

                const handleCellClick = () => {
                  if (cell && !shouldRenderShipContent) return;
                  if (cell) {
                    // Destroyed ships are display-only and cannot be selected.
                    if (isCellDestroyed) {
                      return;
                    }
                    const canRamDisabledEnemy =
                      !!selectedShipId &&
                      isCurrentPlayerTurn &&
                      isShipOwnedByCurrentPlayer(selectedShipId) &&
                      isMovementTile &&
                      !isShipOwnedByCurrentPlayer(cell.shipId) &&
                      (() => {
                        const targetAttrs = getShipAttributes(cell.shipId);
                        return !!targetAttrs && targetAttrs.hullPoints === 0;
                      })();
                    if (canRamDisabledEnemy) {
                      setPreviewPosition({ row: rowIndex, col: colIndex });
                      setTargetShipId(null);
                      return;
                    }
                    // Check for repair drone auto-switch FIRST (before any other logic)
                    if (
                      selectedShipId &&
                      isCurrentPlayerTurn &&
                      isShipOwnedByCurrentPlayer(selectedShipId)
                    ) {
                      const isFriendlyShip = isShipOwnedByCurrentPlayer(
                        cell.shipId,
                      );
                      const selectedShip = shipMap.get(selectedShipId);
                      const hasRepairDrones =
                        selectedShip?.equipment.special === 2; // Repair special

                      if (isFriendlyShip && hasRepairDrones) {
                        // Check if the friendly ship is in repair range
                        const isInRepairRange = validTargets.some(
                          (target) => target.shipId === cell.shipId,
                        );
                        if (isInRepairRange) {
                          // Switch to repair drones and target this ship
                          setSelectedWeaponType("special");
                          setTargetShipId(cell.shipId);
                          return;
                        }
                      }
                    }

                    // If we have a selected ship and this is a valid target in range, select as target
                    if (
                      selectedShipId &&
                      isCurrentPlayerTurn &&
                      isShipOwnedByCurrentPlayer(selectedShipId)
                    ) {
                      // Check if this is a valid target based on weapon type
                      const isValidTargetType =
                        selectedWeaponType === "special"
                          ? specialType === 3 // Flak
                            ? cell.shipId !== selectedShipId // Flak hits ALL ships in range except itself
                            : specialType === 1 // EMP
                              ? !isShipOwnedByCurrentPlayer(cell.shipId) // EMP targets enemy ships
                              : isShipOwnedByCurrentPlayer(cell.shipId) // Other special abilities target friendly ships
                          : !isShipOwnedByCurrentPlayer(cell.shipId); // Weapons target enemy ships

                      if (isValidTargetType) {
                        const isInShootingRange = validTargets.some(
                          (target) => target.shipId === cell.shipId,
                        );
                        if (isInShootingRange) {
                          // If the player hasn't proposed a move yet, convert this into a
                          // "stay in place + fire" intent by setting previewPosition to the
                          // selected ship's current position. This enables shooting without moving.
                          if (
                            selectedWeaponType === "weapon" &&
                            previewPosition === null
                          ) {
                            let found = false;
                            for (let r = 0; r < grid.length && !found; r++) {
                              const gridRow = grid[r];
                              for (let c = 0; c < gridRow.length; c++) {
                                const cellAt = gridRow[c];
                                if (
                                  cellAt &&
                                  cellAt.shipId === selectedShipId &&
                                  !cellAt.isPreview
                                ) {
                                  setPreviewPosition({ row: r, col: c });
                                  found = true;
                                  break;
                                }
                              }
                            }
                          }
                          // For flak special, select all targets in range
                          if (
                            selectedWeaponType === "special" &&
                            specialType === 3
                          ) {
                            // Flak affects all targets in range, so we don't need to set a specific target
                            // Just indicate that flak is ready to fire
                            setTargetShipId(0n); // Use 0 to indicate area-of-effect
                          } else {
                            // EMP and other specials target individual ships
                            setTargetShipId(cell.shipId);
                          }
                          return;
                        }
                      }

                      // Check if this is a friendly ship with 0 hitpoints that can be assisted
                      const isAssistableTarget = assistableTargets.some(
                        (target) => target.shipId === cell.shipId,
                      );
                      const isAssistableFromStart =
                        assistableTargetsFromStart.some(
                          (target) => target.shipId === cell.shipId,
                        );
                      if (isAssistableTarget || isAssistableFromStart) {
                        setTargetShipId(cell.shipId);
                        return;
                      }
                    }

                    // If clicking on the same ship: cycle selection states for any ship
                    // 1st click: movement + threat (no previewPosition)
                    // 2nd click: guns only from current position (previewPosition at this cell)
                    // 3rd click: deselect (clear selection and preview)
                    // 4th click: back to movement + threat, and so on.
                    if (selectedShipId === cell.shipId) {
                      // If already showing gun-only preview from this cell, third click deselects.
                      if (
                        previewPosition &&
                        previewPosition.row === rowIndex &&
                        previewPosition.col === colIndex
                      ) {
                        setSelectedShipId(null);
                        setPreviewPosition(null);
                        setTargetShipId(null);
                      } else {
                        // Second (or subsequent) click: set guns-only preview from this cell.
                        // Movement tiles will hide because previewPosition is set; threat tiles
                        // are computed from this origin by the range helpers.
                        setPreviewPosition({ row: rowIndex, col: colIndex });
                        setTargetShipId(null);
                      }
                    } else {
                      // Check if this is the current player's turn and they're trying to select a moved ship.
                      // Exception: ships with 0 hull (disabled) should still be selectable so players can inspect reactor overload.
                      if (
                        isCurrentPlayerTurn &&
                        isShipOwnedByCurrentPlayer(cell.shipId) &&
                        movedShipIdsSet.has(cell.shipId)
                      ) {
                        const attrs = getShipAttributes(cell.shipId);
                        const isDisabled =
                          attrs && typeof attrs.hullPoints === "number"
                            ? attrs.hullPoints === 0
                            : false;
                        if (!isDisabled) {
                          // Don't allow selecting ships that have already moved this round (unless they are disabled)
                          return;
                        }
                      }

                      // Allow selecting any ship (for viewing stats/range); tutorial validates in wrapper
                      setSelectedShipId(cell.shipId);
                      setTargetShipId(null);
                      setPreviewPosition(null);
                      // Keep selectedWeaponType so it persists when switching ships
                      // Do not auto-set preview for ships on scoring tiles: first select shows movement + threat; second click does stay-in-place flow
                    }
                  } else if (
                    isMovementTile &&
                    selectedShipId &&
                    isCurrentPlayerTurn &&
                    isShipOwnedByCurrentPlayer(selectedShipId) &&
                    !movedShipIdsSet.has(selectedShipId)
                  ) {
                    // Only allow moving ships owned by the current player
                    setPreviewPosition({ row: rowIndex, col: colIndex });
                    setTargetShipId(null); // Clear target when moving
                  } else if (selectedShipId !== null) {
                    // Empty cell that is not a valid move and not a target: clear selection
                    setSelectedShipId(null);
                    setPreviewPosition(null);
                    setTargetShipId(null);
                  }
                };

                const canMoveShip = selectedShipId
                  ? isShipOwnedByCurrentPlayer(selectedShipId) && isMyTurn
                  : false;

                const scoringPoints =
                  scoringGrid[rowIndex]?.[colIndex] ?? 0;
                // Real ship, move-preview ghost, or last-move ghost on a scoring zone
                const hasShipLayerOnScoringTile =
                  cell != null && scoringPoints > 0;
                // Last-move "new position" highlight can sit on scoring before grid cell sync
                const isLastMoveHighlightedOnScoring =
                  highlightedMovePosition != null &&
                  highlightedMovePosition.row === rowIndex &&
                  highlightedMovePosition.col === colIndex &&
                  scoringPoints > 0;
                const showScoringOccupiedWash =
                  hasShipLayerOnScoringTile || isLastMoveHighlightedOnScoring;
                const isOnlyOnceScoringActive =
                  onlyOnceGrid[rowIndex][colIndex] && scoringPoints > 0;
                const showOnlyOnceOccupiedWash =
                  showScoringOccupiedWash && isOnlyOnceScoringActive;
                const showReusableScoringOccupiedWash =
                  showScoringOccupiedWash && !isOnlyOnceScoringActive;
                const isShipOnScoringTile =
                  cell != null && scoringPoints > 0;

                const showGridHullStrip = (() => {
                  if (!shouldRenderShipContent || !ship || !cell) return false;
                  const attributes = getShipAttributes(cell.shipId);
                  if (!attributes) return false;
                  const previewDamage =
                    projectedDamageByShipId.get(cell.shipId) ?? 0;
                  const previewRepair =
                    projectedRepairByShipId.get(cell.shipId) ?? 0;
                  const showDamagePreview = previewDamage > 0;
                  const showRepairPreview = previewRepair > 0;
                  const maxHp = attributes.maxHullPoints;
                  const currentHp = attributes.hullPoints;
                  const healthPercentage =
                    maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
                  const healedHp = Math.min(
                    maxHp,
                    Math.max(0, currentHp) + previewRepair,
                  );
                  const healedPct =
                    maxHp > 0 ? (healedHp / maxHp) * 100 : 0;
                  const healPct = Math.max(0, healedPct - healthPercentage);
                  if (currentHp <= 0 && !showRepairPreview) return false;
                  if (
                    currentHp >= maxHp &&
                    !showDamagePreview &&
                    !(showRepairPreview && healPct > 0)
                  ) {
                    return false;
                  }
                  return true;
                })();

                return (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    data-grid-row={rowIndex}
                    data-grid-col={colIndex}
                    className={`min-h-0 min-w-0 h-full w-full ${
                      isShipOnScoringTile
                        ? isOnlyOnceScoringActive
                          ? "border-2 border-teal-400"
                          : "border-2 border-amber"
                        : "border-0"
                    } outline outline-1 outline-near-black relative cursor-pointer ${(() => {
                      // Check if this is the "from" position (original position when proposing a move)
                      const isProposedMoveOriginal =
                        selectedShipId === cell?.shipId && previewPosition;
                      // Check if this is the "to" position (preview cell)
                      const isProposedMovePreview =
                        cell?.isPreview &&
                        previewPosition !== null &&
                        selectedShipId !== null;

                      // Show blue background for "from" or "to" positions
                      if (isProposedMoveOriginal || isProposedMovePreview) {
                        // Add blue background, but still need to handle other conditions
                        const baseBg = canMoveShip
                          ? "bg-cyan/20 ring-2 ring-inset ring-cyan"
                          : "bg-purple/20 ring-2 ring-inset ring-purple";

                        // Moved ships: base tile only; grey veil is an absolute layer (z-10) below tutorial (z-11).
                        if (hasShipMoved) {
                          return "bg-near-black cursor-not-allowed";
                        }
                        if (isSelectedTarget) {
                          const isAssistAction =
                            assistableTargets.some(
                              (target) => target.shipId === cell.shipId,
                            ) ||
                            assistableTargetsFromStart.some(
                              (target) => target.shipId === cell.shipId,
                            );
                          if (isAssistAction) {
                            return "bg-cyan/20 ring-2 ring-inset ring-cyan";
                          }
                          return selectedWeaponType === "special"
                            ? specialType === 3 // Flak
                              ? "bg-warning-red/20 ring-2 ring-inset ring-warning-red"
                              : "bg-cyan/20 ring-2 ring-inset ring-cyan"
                            : "bg-warning-red/20 ring-2 ring-inset ring-warning-red";
                        }
                        // Return blue background for from/to positions
                        return baseBg;
                      }

                      // Otherwise, apply normal selected styling
                      if (isSelected) {
                        return canMoveShip
                          ? "bg-cyan/20 ring-2 ring-inset ring-cyan"
                          : "bg-purple/20 ring-2 ring-inset ring-purple";
                      }

                      // Default styling chain - gray for any ship that has moved this round (both players see it)
                      let cursorSuffix = "";
                      if (cell != null && isCurrentPlayerTurn) {
                        if (isShipOwnedByCurrentPlayer(cell.shipId)) {
                          cursorSuffix = " cursor-not-allowed";
                        }
                      }
                      const movedStyle = "bg-near-black" + cursorSuffix;
                      return hasShipMoved
                        ? movedStyle
                        : isSelectedTarget && cell
                          ? (() => {
                              // Check if this is an assist action
                              const isAssistAction =
                                assistableTargets.some(
                                  (target) => target.shipId === cell.shipId,
                                ) ||
                                assistableTargetsFromStart.some(
                                  (target) => target.shipId === cell.shipId,
                                );
                              if (isAssistAction) {
                                return "bg-cyan/20 ring-2 ring-inset ring-cyan";
                              }
                              // Otherwise use weapon-based styling
                              return selectedWeaponType === "special"
                                ? specialType === 3 // Flak
                                  ? "bg-warning-red/20 ring-2 ring-inset ring-warning-red" // Flak uses red highlighting like regular weapons
                                  : "bg-cyan/20 ring-2 ring-inset ring-cyan" // Other specials use blue
                                : "bg-warning-red/20 ring-2 ring-inset ring-warning-red";
                            })()
                          : isValidTarget
                            ? selectedWeaponType === "special"
                              ? specialType === 3 // Flak
                                ? "bg-warning-red/10 ring-1 ring-inset ring-warning-red" // Flak
                                : "bg-cyan/10 ring-1 ring-inset ring-cyan" // Other specials
                              : "bg-amber/10 ring-1 ring-inset ring-amber"
                            : isAssistableTarget
                              ? "bg-cyan/10 ring-1 ring-inset ring-cyan"
                              : isMovementTile
                                ? "bg-phosphor-green/10"
                                : "bg-near-black";
                    })()}`}
                    onClick={handleCellClick}
                    onMouseEnter={
                      shouldRenderShipContent
                        ? (e) => {
                            const ship = shipMap.get(cell.shipId);
                            if (ship) {
                              setHoveredCell({
                                shipId: cell.shipId,
                                row: rowIndex,
                                col: colIndex,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                                isCreator: cell.isCreator,
                              });
                            }
                          }
                        : undefined
                    }
                    onMouseMove={
                      shouldRenderShipContent
                        ? (e) => {
                            if (
                              hoveredCell &&
                              hoveredCell.shipId === cell.shipId
                            ) {
                              setHoveredCell({
                                ...hoveredCell,
                                row: rowIndex,
                                col: colIndex,
                                mouseX: e.clientX,
                                mouseY: e.clientY,
                              });
                            }
                          }
                        : undefined
                    }
                    onMouseLeave={
                      shouldRenderShipContent ? () => setHoveredCell(null) : undefined
                    }
                    onDragOver={(e) => {
                      if (draggedShipId) {
                        e.preventDefault();
                        // Only update state if the cell actually changed
                        const newCell = { row: rowIndex, col: colIndex };
                        const lastCell = lastDragOverCellRef.current;
                        if (
                          !lastCell ||
                          lastCell.row !== newCell.row ||
                          lastCell.col !== newCell.col
                        ) {
                          lastDragOverCellRef.current = newCell;
                          setDragOverCell(newCell);
                        }
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedShipId && isMovementTile) {
                        // Update preview position - works whether dragging from original or preview position
                        setPreviewPosition({ row: rowIndex, col: colIndex });
                        setTargetShipId(null);
                        setDraggedShipId(null);
                        setDragOverCell(null);
                        lastDragOverCellRef.current = null;
                      }
                    }}
                    {...(!cell && {
                      title: onlyOnceGrid[rowIndex][colIndex]
                        ? `Crystal Deposit: ${scoringGrid[rowIndex][colIndex]} points (only once) (${rowIndex}, ${colIndex})`
                        : scoringGrid[rowIndex][colIndex] > 0
                          ? `Gold Deposit: ${scoringGrid[rowIndex][colIndex]} points (${rowIndex}, ${colIndex})`
                          : blockedGrid[rowIndex][colIndex]
                            ? `Blocked Line of Sight (${rowIndex}, ${colIndex})`
                            : isMovementTile
                              ? `Move here (${rowIndex}, ${colIndex})`
                              : isShootingTile
                                ? `Shooting range (${rowIndex}, ${colIndex})`
                                : isAssistableTarget
                                  ? `Click to assist this ship (${rowIndex}, ${colIndex})`
                                  : isValidTarget
                                    ? `Click to target this ship (${rowIndex}, ${colIndex})`
                                    : `Empty (${rowIndex}, ${colIndex})`,
                    })}
                  >
                    {/* Blocked line of sight tile - lowest layer */}
                    {blockedGrid[rowIndex][colIndex] && (
                      <div className="absolute inset-0 z-0">
                        <Image
                          src="/img/nebula-tile.png"
                          alt="Blocked line of sight"
                          fill
                          className="object-cover opacity-30"
                        />
                      </div>
                    )}

                    {/* Crystal for scoring positions that can only be claimed once */}
                    {onlyOnceGrid[rowIndex][colIndex] && (
                      <div className="absolute inset-0 z-[1]">
                        <Image
                          src="/img/crystal.png"
                          alt="Crystal deposit"
                          fill
                          className="object-cover opacity-80"
                        />
                      </div>
                    )}

                    {/* Gold deposit for regular scoring positions */}
                    {scoringGrid[rowIndex][colIndex] > 0 &&
                      !onlyOnceGrid[rowIndex][colIndex] && (
                        <div className="absolute inset-0 z-[1]">
                          <Image
                            src="/img/gold-deposit.png"
                            alt="Gold deposit"
                            fill
                            className="object-cover opacity-80"
                          />
                        </div>
                      )}

                    {/* Above crystal/gold art (z-[1]), below range highlights and ships */}
                    {showOnlyOnceOccupiedWash && (
                      <div
                        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-sky-400/58 via-cyan-500/72 to-teal-800/84 shadow-[inset_0_0_32px_rgba(34,211,238,0.34)]"
                        aria-hidden
                      />
                    )}
                    {showReusableScoringOccupiedWash && (
                      <div
                        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-amber-300/62 via-amber-500/75 to-amber-800/84 shadow-[inset_0_0_32px_rgba(252,211,77,0.35)]"
                        aria-hidden
                      />
                    )}

                    {/* Movement range highlight */}
                    {isMovementTile && (
                      <div
                        className={`absolute inset-0 z-[3] border-1 pointer-events-none ${
                          isHighlightedMove
                            ? "border-amber/50 bg-amber/20 animate-pulse"
                            : "border-phosphor-green/50 bg-phosphor-green/10"
                        }`}
                      />
                    )}

                    {/* Shooting range highlight */}
                    {isShootingTile && (
                      <div className="absolute inset-0 z-[3] border-1 border-amber/50 bg-amber/10 pointer-events-none" />
                    )}

                    {/* Drag range highlight - show range from drag position */}
                    {draggedShipId && dragOverCell && (
                      <>
                        {dragShootingRange.some(
                          (pos) => pos.row === rowIndex && pos.col === colIndex,
                        ) && (
                          <div className="absolute inset-0 z-[3] border-1 border-amber/50 bg-amber/10 pointer-events-none" />
                        )}
                        {/* Green outline on the cell being dragged over */}
                        {dragOverCell.row === rowIndex &&
                          dragOverCell.col === colIndex && (
                            <div className="absolute inset-0 z-[4] border-4 border-phosphor-green bg-phosphor-green/10 pointer-events-none" />
                          )}
                      </>
                    )}

                    {/* Critical hull glow effect for 0 HP ships (not last-move attack target; that uses team-colored border below) */}
                    {cell &&
                      (() => {
                        const attributes = getShipAttributes(cell.shipId);
                        return attributes && attributes.hullPoints === 0;
                      })() &&
                      !isLastMoveAttackTargetCell && (
                        <div className="absolute inset-0 z-[5] border-2 border-warning-red bg-warning-red/10 pointer-events-none animate-pulse" />
                      )}

                    {/* Retreat last move: outline on the cell (blue = current player, red = opponent) */}
                    {(lastMoveActionType as ActionType) ===
                      ActionType.Retreat &&
                      lastMoveOldPosition != null &&
                      rowIndex === lastMoveOldPosition.row &&
                      colIndex === lastMoveOldPosition.col && (
                        <div
                          className={`absolute inset-0 ring-4 border-2 border-dashed rounded-sm pointer-events-none z-20 ${
                            lastMoveIsCurrentPlayer === true
                              ? "ring-cyan border-cyan bg-cyan/20"
                              : lastMoveIsCurrentPlayer === false
                                ? "ring-warning-red border-warning-red bg-warning-red/20"
                                : "ring-amber border-amber bg-amber/20"
                          }`}
                        />
                      )}

                    {cell &&
                      (() => {
                        const shouldPreviewDestroyedTarget =
                          destroyPreviewShipIds.has(cell.shipId);
                        const shouldShowDestroyedArt =
                          isLastMoveDestroyedTargetCell || shouldPreviewDestroyedTarget;
                        if (!shouldShowDestroyedArt) return null;

                        // Keep destroyed art above moved-ship dim veil (z-[10]) so it
                        // remains visible in move preview and last-move states.
                        return (
                          <div className="absolute inset-0 z-[13] flex items-center justify-center pointer-events-none">
                            <img
                              src="/img/ship-destroyed.png"
                              alt="Predicted destroyed target ship"
                              className="w-[98%] h-[98%] object-contain opacity-75"
                              style={{
                                transform: cell.isCreator
                                  ? "scaleX(-1)"
                                  : "scaleX(1)",
                              }}
                            />
                          </div>
                        );
                      })()}
                    {/* Moved this round: grey veil (z-10), then tutorial pulse (z-11), then ship (z-12). */}
                    {cell && movedShipIdsSet.has(cell.shipId) && (
                      <div
                        className="absolute inset-0 z-[10] pointer-events-none bg-steel/60"
                        aria-hidden
                      />
                    )}
                    {/* Tutorial highlight: above moved veil (z-10), below ship stack (z-12). */}
                    {isTutorialHighlightCell && (
                      <div className="absolute inset-0 z-[11] pointer-events-none border border-amber/90 bg-amber/24 animate-pulse" />
                    )}
                    {shouldRenderShipContent && ship ? (
                      <>
                      <div
                        className="w-full h-full relative z-[12]"
                        draggable={
                          isCurrentPlayerTurn &&
                          isShipOwnedByCurrentPlayer(cell.shipId) &&
                          !movedShipIdsSet.has(cell.shipId)
                        }
                        onDragStart={(e) => {
                          if (
                            isCurrentPlayerTurn &&
                            isShipOwnedByCurrentPlayer(cell.shipId) &&
                            !movedShipIdsSet.has(cell.shipId)
                          ) {
                            setDraggedShipId(cell.shipId);
                            setSelectedShipId(cell.shipId);

                            // If dragging from preview position, capture it and use as starting point
                            // Otherwise start at current cell position
                            const startPosition =
                              cell.isPreview && previewPosition
                                ? {
                                    row: previewPosition.row,
                                    col: previewPosition.col,
                                  }
                                : { row: rowIndex, col: colIndex };

                            // Clear preview position when starting drag - enter positioning state
                            // The preview will be replaced by the drag state
                            setPreviewPosition(null);
                            // Start dragOverCell at the position we're dragging from (preview or original)
                            // This ensures ranges calculate from the correct starting position
                            setDragOverCell(startPosition);
                            lastDragOverCellRef.current = startPosition;
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData(
                              "text/plain",
                              cell.shipId.toString(),
                            );

                            // Create custom drag image that preserves ship orientation
                            // Find the ship image element (it's inside a div with class "relative")
                            const shipImageContainer =
                              e.currentTarget.querySelector(
                                ".relative img",
                              ) as HTMLImageElement;
                            if (
                              shipImageContainer &&
                              shipImageContainer.complete &&
                              shipImageContainer.naturalWidth > 0
                            ) {
                              // Create a canvas to capture the ship image with its current transform
                              const canvas = document.createElement("canvas");
                              canvas.width = 64;
                              canvas.height = 64;
                              const ctx = canvas.getContext("2d");

                              if (ctx) {
                                // Apply flip transformation if needed (creator ships are flipped)
                                if (cell.isCreator) {
                                  ctx.translate(64, 0);
                                  ctx.scale(-1, 1);
                                }

                                // Draw the ship image
                                ctx.drawImage(shipImageContainer, 0, 0, 64, 64);

                                // Create a temporary element for the drag image
                                const dragImage = document.createElement("img");
                                dragImage.src = canvas.toDataURL();
                                dragImage.style.position = "absolute";
                                dragImage.style.top = "-1000px";
                                dragImage.style.width = "64px";
                                dragImage.style.height = "64px";
                                document.body.appendChild(dragImage);

                                // Set the drag image with offset to center it
                                e.dataTransfer.setDragImage(dragImage, 32, 32);

                                // Clean up after a short delay
                                setTimeout(() => {
                                  if (document.body.contains(dragImage)) {
                                    document.body.removeChild(dragImage);
                                  }
                                }, 0);
                              }
                            }
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedShipId(null);
                          setDragOverCell(null);
                          lastDragOverCellRef.current = null;
                          // If we were dragging from preview position and didn't drop, keep preview
                          // If we dropped, previewPosition will be updated in onDrop handler
                        }}
                      >
                        {/* SOS on cell for 0 HP disabled ships (not permanent destroy) */}
                        {(() => {
                          const attributes = getShipAttributes(cell.shipId);
                          if (
                            !attributes ||
                            typeof attributes.hullPoints !== "number" ||
                            attributes.hullPoints > 0
                          )
                            return null;
                          // Destroyed ships (status 1) use destroyed art only, not the SOS label
                          if ((cell.status ?? 0) === 1) return null;
                          return (
                            <div
                              className="absolute top-0 left-1/2 -translate-x-1/2 mt-0.5 z-20 flex items-center justify-center pointer-events-none"
                              title="Disabled (0 HP)"
                            >
                              <div className="w-5 h-5 flex items-center justify-center">
                                <span className="text-xs leading-none font-mono">[SOS]</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Retreat prep: flip + engine glow when player selected Retreat (before tx) */}
                        {retreatPrepShipId === cell.shipId &&
                          retreatPrepIsCreator != null && (
                            <RetreatPrepAnimation
                              ship={ship}
                              isCreator={retreatPrepIsCreator}
                              selectionOutlineClassName={
                                canMoveShip
                                  ? "ring-2 ring-inset ring-blue-400"
                                  : "ring-2 ring-inset ring-purple-400"
                              }
                            />
                          )}
                        {(() => {
                          const shouldPreviewDestroyedTarget =
                            destroyPreviewShipIds.has(cell.shipId);
                          const imageClassName = `w-full h-full relative z-0 ${
                            retreatPrepShipId === cell.shipId
                              ? "opacity-0 pointer-events-none"
                              : cell.isCreator
                                ? "scale-x-[-1]"
                                : ""
                          } ${(() => {
                            // Last move old position: hide ghost when showing Retreat zoom-off
                            if (
                              lastMoveShipId === cell.shipId &&
                              lastMoveOldPosition &&
                              rowIndex === lastMoveOldPosition.row &&
                              colIndex === lastMoveOldPosition.col &&
                              lastMoveActionType === ActionType.Retreat
                            ) {
                              return "opacity-0 pointer-events-none";
                            }
                            // Last move old position: 50% opacity, no animation (check first)
                            if (
                              lastMoveShipId === cell.shipId &&
                              lastMoveOldPosition &&
                              rowIndex === lastMoveOldPosition.row &&
                              colIndex === lastMoveOldPosition.col
                            ) {
                              return "opacity-50";
                            }

                            // Last move new position: 100% opacity (no class = default 100%)
                            if (
                              lastMoveShipId &&
                              lastMoveShipId === cell.shipId &&
                              lastMoveOldPosition &&
                              (rowIndex !== lastMoveOldPosition.row ||
                                colIndex !== lastMoveOldPosition.col) &&
                              !cell.isPreview
                            ) {
                              return ""; // No opacity class = 100% opacity
                            }

                            // Staging a move: dim only the ship's current tile, not the preview/destination tile
                            // (and not a non-preview ship already at the destination after optimistic placement).
                            if (
                              selectedShipId === cell.shipId &&
                              previewPosition &&
                              !cell.isPreview &&
                              (rowIndex !== previewPosition.row ||
                                colIndex !== previewPosition.col)
                            ) {
                              return "opacity-50";
                            }

                            // Proposed move preview (to position): 100% opacity
                            if (
                              cell.isPreview &&
                              previewPosition !== null &&
                              selectedShipId !== null &&
                              !(
                                lastMoveShipId === cell.shipId &&
                                lastMoveOldPosition &&
                                rowIndex === lastMoveOldPosition.row &&
                                colIndex === lastMoveOldPosition.col
                              )
                            ) {
                              return ""; // No opacity class = 100% opacity
                            }

                            // Preview cells: animation only
                            if (cell.isPreview) {
                              return "animate-pulse-preview";
                            }

                            return "";
                          })()}`;
                          const shouldHideShipArt =
                            isLastMoveDestroyedTargetCell || shouldPreviewDestroyedTarget;

                          return (
                            <ShipImage
                              ship={ship}
                              className={`${imageClassName} ${
                                shouldHideShipArt
                                  ? "opacity-0 pointer-events-none"
                                  : ""
                              }`}
                              showLoadingState={true}
                              hideRankStars
                            />
                          );
                        })()}
                        {/* Hull strip: inside cell top edge (team dot + stars sit below when visible) */}
                        {(() => {
                          const attributes = getShipAttributes(cell.shipId);
                          if (!attributes) return null;

                          const previewDamage =
                            projectedDamageByShipId.get(cell.shipId) ?? 0;
                          const previewRepair =
                            projectedRepairByShipId.get(cell.shipId) ?? 0;
                          const showDamagePreview = previewDamage > 0;
                          const showRepairPreview = previewRepair > 0;

                          const maxHp = attributes.maxHullPoints;
                          const currentHp = attributes.hullPoints;
                          const healthPercentage =
                            maxHp > 0 ? (currentHp / maxHp) * 100 : 0;
                          const healedHp = Math.min(
                            maxHp,
                            Math.max(0, currentHp) + previewRepair,
                          );
                          const healedPct =
                            maxHp > 0 ? (healedHp / maxHp) * 100 : 0;
                          const healPct = Math.max(
                            0,
                            healedPct - healthPercentage,
                          );

                          if (currentHp <= 0 && !showRepairPreview) return null;
                          if (
                            currentHp >= maxHp &&
                            !showDamagePreview &&
                            !(showRepairPreview && healPct > 0)
                          ) {
                            return null;
                          }

                          const isLowHealth = healthPercentage <= 25;

                          const remainingHp = showDamagePreview
                            ? Math.max(0, currentHp - previewDamage)
                            : currentHp;
                          const remainingPct = showDamagePreview
                            ? (remainingHp / maxHp) * 100
                            : healthPercentage;
                          const damagePct = showDamagePreview
                            ? Math.max(0, healthPercentage - remainingPct)
                            : 0;

                          const trackStyle: React.CSSProperties = {
                            backgroundColor: "var(--color-gunmetal)",
                            borderRadius: 0,
                          };
                          const fillGreen = "var(--color-phosphor-green)";
                          const fillRed = "var(--color-warning-red)";

                          return (
                            <div
                              className="pointer-events-none absolute top-0 left-0 right-0 z-[30] px-0.5"
                              dir="ltr"
                            >
                              <div
                                className="relative h-1 w-full overflow-hidden"
                                style={trackStyle}
                              >
                                {showDamagePreview && damagePct > 0 ? (
                                  <>
                                    <div
                                      className="absolute left-0 top-0 h-full transition-all duration-300"
                                      style={{
                                        width: `${remainingPct}%`,
                                        backgroundColor: fillGreen,
                                      }}
                                      title={`${remainingHp} HP after hit`}
                                    />
                                    <div
                                      className="absolute top-0 h-full animate-damage-preview-red"
                                      style={{
                                        left: `${remainingPct}%`,
                                        width: `${damagePct}%`,
                                      }}
                                      title={`-${Math.floor(previewDamage)} damage`}
                                    />
                                  </>
                                ) : showRepairPreview && healPct > 0 ? (
                                  <>
                                    <div
                                      className="absolute left-0 top-0 h-full transition-all duration-300"
                                      style={{
                                        width: `${healthPercentage}%`,
                                        backgroundColor:
                                          currentHp > 0 && isLowHealth
                                            ? fillRed
                                            : fillGreen,
                                      }}
                                      title={`${currentHp} HP now`}
                                    />
                                    <div
                                      className="absolute top-0 h-full animate-damage-preview-blue"
                                      style={{
                                        left: `${healthPercentage}%`,
                                        width: `${healPct}%`,
                                      }}
                                      title={`+${Math.floor(previewRepair)} repair`}
                                    />
                                  </>
                                ) : (
                                  <div
                                    className="absolute left-0 top-0 h-full transition-all duration-300"
                                    style={{
                                      width: `${healthPercentage}%`,
                                      backgroundColor: isLowHealth
                                        ? fillRed
                                        : fillGreen,
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {/* Moved badge */}
                        {movedShipIdsSet.has(cell.shipId) && (
                          <div
                            className={`absolute z-20 flex items-center justify-center rounded-full font-mono text-white ${
                              cell.isCreator
                                ? "bottom-0 right-0"
                                : "bottom-0 left-0"
                            } ${
                              isShipOwnedByCurrentPlayer(cell.shipId)
                                ? "bg-cyan/60"
                                : "bg-warning-red/60"
                            }`}
                            style={{
                              width: "clamp(8px, 14cqw, 12px)",
                              height: "clamp(8px, 14cqw, 12px)",
                              margin: "clamp(1px, 2cqw, 2px)",
                              fontSize: "clamp(6px, 9cqw, 8px)",
                            }}
                          >
                            M
                          </div>
                        )}
                        {/* Team dot + rank stars: same top row, opposite corners (not inside mirrored ShipImage) */}
                        {(() => {
                          const isProposedMoveOriginal =
                            selectedShipId === cell.shipId &&
                            previewPosition &&
                            !cell.isPreview &&
                            (rowIndex !== previewPosition.row ||
                              colIndex !== previewPosition.col);

                          const isProposedMovePreview =
                            cell.isPreview &&
                            previewPosition !== null &&
                            selectedShipId !== null &&
                            !(
                              lastMoveShipId === cell.shipId &&
                              lastMoveOldPosition &&
                              rowIndex === lastMoveOldPosition.row &&
                              colIndex === lastMoveOldPosition.col
                            );

                          let teamPulseClasses = "";
                          if (isProposedMoveOriginal) {
                            teamPulseClasses = "opacity-50";
                          } else if (isProposedMovePreview) {
                            teamPulseClasses = "";
                          } else if (
                            lastMoveShipId === cell.shipId &&
                            lastMoveOldPosition &&
                            rowIndex === lastMoveOldPosition.row &&
                            colIndex === lastMoveOldPosition.col
                          ) {
                            teamPulseClasses = "opacity-50";
                          } else if (cell.isPreview) {
                            teamPulseClasses = "animate-pulse-preview";
                          }

                          const rank = ship.shipData.constructed
                            ? calculateShipRank(ship).rank
                            : 0;

                          const dot = (
                            <div
                              className={`shrink-0 rounded-full ${
                                isShipOwnedByCurrentPlayer(cell.shipId)
                                  ? "bg-cyan"
                                  : "bg-warning-red"
                              }`}
                              style={{
                                width: "clamp(4px, 7cqw, 8px)",
                                height: "clamp(4px, 7cqw, 8px)",
                              }}
                            />
                          );

                          const stars =
                            rank > 0 ? (
                              <div
                                className="flex shrink-0 flex-row items-center gap-px leading-none text-amber"
                                style={{
                                  // Use container-relative sizing so desktop viewport size
                                  // does not inflate in-cell rank stars.
                                  fontSize: "clamp(7.5px, 9cqw, 12px)",
                                }}
                              >
                                {Array.from({ length: rank }, (_, i) => (
                                  <span key={i}>⭐</span>
                                ))}
                              </div>
                            ) : (
                              <span
                                className="inline-block w-0 shrink-0"
                                style={{ height: "clamp(4px, 7cqw, 8px)" }}
                                aria-hidden
                              />
                            );

                          return (
                            <div className="pointer-events-none absolute inset-0 z-20 min-h-0 [container-type:size]">
                              <div
                                className={`absolute flex flex-row items-start justify-between ${teamPulseClasses}`}
                                style={{
                                  left: "5%",
                                  right: "5%",
                                  top: showGridHullStrip ? "17%" : "4%",
                                  gap: "clamp(1px, 2cqw, 2px)",
                                }}
                              >
                                {cell.isCreator ? (
                                  <>
                                    {dot}
                                    {stars}
                                  </>
                                ) : (
                                  <>
                                    {stars}
                                    {dot}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        {/* Movement path borders */}
                        {(() => {
                          const isPreviewCell = cell.isPreview;
                          const isProposedMoveOriginal =
                            selectedShipId === cell.shipId &&
                            previewPosition &&
                            !isPreviewCell &&
                            (rowIndex !== previewPosition.row ||
                              colIndex !== previewPosition.col);
                          const isLastMoveOldPosition =
                            lastMoveShipId === cell.shipId &&
                            lastMoveOldPosition &&
                            rowIndex === lastMoveOldPosition.row &&
                            colIndex === lastMoveOldPosition.col;
                          const isLastMoveNewPosition =
                            lastMoveShipId === cell.shipId &&
                            lastMoveOldPosition &&
                            !isLastMoveOldPosition; // New position is where the ship is but not at old position

                          // Check if this is a proposed move preview (to position)
                          // It's a proposed move preview if: it's a preview cell AND there's an active proposed move (previewPosition exists) AND it's not the last move old position
                          const isProposedMovePreview =
                            isPreviewCell &&
                            previewPosition !== null &&
                            selectedShipId !== null &&
                            !isLastMoveOldPosition;

                          const shouldShowBorder =
                            isPreviewCell ||
                            isProposedMoveOriginal ||
                            isLastMoveOldPosition ||
                            isLastMoveNewPosition ||
                            isLastMoveAttackTargetCell;

                          if (!shouldShowBorder) return null;

                          // For proposed moves: preview (to) is solid, original (from) is dashed
                          // For last move: old position is dashed, new position is solid
                          // Dashed for: proposed move original position, last move old position
                          // Solid for: proposed move preview (to), last move new position, last move target
                          const isDashed =
                            (isProposedMoveOriginal || isLastMoveOldPosition) &&
                            !isLastMoveAttackTargetCell;
                          // Don't animate "from" position, new position of last move, or last move old position
                          const shouldAnimate =
                            isPreviewCell &&
                            !isProposedMovePreview &&
                            !isLastMoveOldPosition;

                          // Explicitly ensure proposed move previews are solid
                          const borderStyle = isProposedMovePreview
                            ? "border-solid"
                            : isDashed
                              ? "border-dashed"
                              : "border-solid";

                          // Make proposed move preview borders thicker
                          const borderWidth = isProposedMovePreview
                            ? "border-4"
                            : "border-2";

                          // Don't animate proposed move previews (to position), but animate others
                          const animationClass = isProposedMovePreview
                            ? ""
                            : shouldAnimate
                              ? isPreviewCell
                                ? "animate-pulse-preview"
                                : "animate-pulse-original"
                              : "";

                          // Last move outline: mover old/new tiles use the moving ship's team (viewer =
                          // current player). Attack/special *target* tile uses the *target* ship's team
                          // so a shot into an enemy cell stays red and a shot into your ship stays blue.
                          const isLastMoveCell =
                            isLastMoveOldPosition || isLastMoveNewPosition;
                          const borderColor = isLastMoveAttackTargetCell
                            ? !address
                              ? "border-amber"
                              : isShipOwnedByCurrentPlayer(cell.shipId)
                                ? "border-cyan"
                                : "border-warning-red"
                            : isLastMoveCell
                              ? lastMoveIsCurrentPlayer === true
                                ? "border-cyan"
                                : lastMoveIsCurrentPlayer === false
                                  ? "border-warning-red"
                                  : "border-amber"
                              : "border-amber";

                          return (
                            <div
                              className={`absolute inset-0 z-20 ${borderWidth} ${borderColor} rounded-sm pointer-events-none ${borderStyle} ${animationClass}`}
                            />
                          );
                        })()}
                      </div>
                        {/* Reactor damage skulls: anchor to the grid cell (not the ship stack) so bottom-0
                            stays correct when the inner stack height is ambiguous on small viewports. */}
                        {(() => {
                          const attributes = getShipAttributes(cell.shipId);
                          if (!attributes) return null;

                          const isRammingToCell =
                            isRammingMovePreview &&
                            rammingPreviewPosition != null &&
                            rowIndex === rammingPreviewPosition.row &&
                            colIndex === rammingPreviewPosition.col;
                          const previewReactorLevel =
                            attributes.reactorCriticalTimer +
                            (isRammingToCell ? 1 : 0);
                          if (previewReactorLevel <= 0) return null;
                          const skullCount = Math.min(previewReactorLevel, 3);
                          const skullLevels = Array.from(
                            { length: skullCount },
                            (_, index) => index,
                          );

                          const skullAnchorIsCreator = isRammingToCell
                            ? (selectedShipCreatorSide ?? cell.isCreator)
                            : cell.isCreator;
                          return (
                            <div
                              className={`pointer-events-none absolute z-[22] ${
                                skullAnchorIsCreator
                                  ? "bottom-0 left-0"
                                  : "bottom-0 right-0"
                              } flex items-end`}
                              style={{
                                margin: "clamp(1px, 0.35vmin, 2px)",
                                gap: "clamp(1px, 0.35vmin, 2px)",
                              }}
                            >
                              {skullLevels.map((level) => (
                                <div
                                  key={level}
                                  className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-warning-red/90 leading-none"
                                  style={{
                                    width: "clamp(8px, 2.2vmin, 12px)",
                                    height: "clamp(8px, 2.2vmin, 12px)",
                                  }}
                                >
                                  <span
                                    className="font-mono leading-none"
                                    style={{ fontSize: "clamp(6px, 1.6vmin, 8px)" }}
                                  >
                                    ✕
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    ) : null}
                  </div>
                );
              }),
            )}
          </div>

          {/* Overlays: positioned above grid via z-50 so they always paint on top */}
          <div className="absolute inset-0 z-50 pointer-events-none">
            {/* Retreat last move: warp field collapsing at the position (no ship data needed) */}
            {(lastMoveActionType as ActionType) === ActionType.Retreat &&
              lastMoveOldPosition != null && (
                <WarpFieldCollapseAnimation
                  gridContainerRef={gridContainerRef}
                  row={lastMoveOldPosition.row}
                  col={lastMoveOldPosition.col}
                />
              )}

            {/* Move path arrow: proposed move or last completed move with a spatial path, same geometry. */}
            {(() => {
                const proposedDestination =
                  draggedShipId && dragOverCell ? dragOverCell : previewPosition;
                const useProposedMoveArrow =
                  selectedShipId !== null && proposedDestination !== null;

                const lastMoveHasPath =
                  lastMoveOldPosition != null &&
                  lastMoveNewPosition != null &&
                  lastMoveNewPosition.row >= 0 &&
                  lastMoveNewPosition.col >= 0 &&
                  (lastMoveOldPosition.row !== lastMoveNewPosition.row ||
                    lastMoveOldPosition.col !== lastMoveNewPosition.col);

                const useLastMoveArrow =
                  !useProposedMoveArrow &&
                  lastMoveShipId != null &&
                  lastMoveHasPath &&
                  lastMoveActionType !== ActionType.Retreat;

                if (!useProposedMoveArrow && !useLastMoveArrow) return null;

                const destination = useProposedMoveArrow
                  ? proposedDestination!
                  : lastMoveNewPosition!;

                const movingShipId = useProposedMoveArrow
                  ? selectedShipId!
                  : lastMoveShipId!;

                const fromPos = useLastMoveArrow
                  ? lastMoveOldPosition
                  : allShipPositions?.find((sp) => sp.shipId === movingShipId)
                      ?.position ??
                    (() => {
                      for (let r = 0; r < grid.length; r++) {
                        const row = grid[r];
                        for (let c = 0; c < row.length; c++) {
                          const cell = row[c];
                          if (cell?.shipId === movingShipId && !cell.isPreview) {
                            return { row: r, col: c };
                          }
                        }
                      }
                      return null;
                    })();

                if (!fromPos) return null;
                if (
                  fromPos.row === destination.row &&
                  fromPos.col === destination.col
                ) {
                  return null;
                }
                if (!gridContainerRef.current) return null;

                const containerRect =
                  gridContainerRef.current.getBoundingClientRect();
                const layoutEl = gridLayoutRef.current;
                const layoutRect = layoutEl?.getBoundingClientRect();
                // Overlay SVG uses container (0,0); the bordered grid's *tracks* use the content
                // box — clientWidth/Height and clientLeft/Top account for border so cell math
                // matches painted cells (fixes systematic horizontal offset).
                const originX =
                  layoutEl && layoutRect
                    ? layoutRect.left - containerRect.left + layoutEl.clientLeft
                    : 0;
                const originY =
                  layoutEl && layoutRect
                    ? layoutRect.top - containerRect.top + layoutEl.clientTop
                    : 0;
                const cellWidth = layoutEl
                  ? layoutEl.clientWidth / 17
                  : containerRect.width / 17;
                const cellHeight = layoutEl
                  ? layoutEl.clientHeight / 11
                  : containerRect.height / 11;

                const toPx = (p: { row: number; col: number }) => ({
                  x: originX + p.col * cellWidth + cellWidth / 2,
                  y: originY + p.row * cellHeight + cellHeight / 2,
                });

                const destinationCenter = toPx(destination);
                const fromCenter = toPx(fromPos);
                const arrowHeadLength = 24;
                const arrowStrokeWidth = 6;
                const startOutsideOffset = arrowStrokeWidth / 2 + 1;

                const layoutRoot = gridLayoutRef.current;
                const cellEl = (r: number, c: number) =>
                  layoutRoot?.querySelector(
                    `[data-grid-row="${r}"][data-grid-col="${c}"]`,
                  ) as HTMLElement | null;
                const cellRectPx = (r: number, c: number) => {
                  const el = cellEl(r, c);
                  if (!el) return null;
                  const rect = el.getBoundingClientRect();
                  const left = rect.left - containerRect.left;
                  const right = rect.right - containerRect.left;
                  const top = rect.top - containerRect.top;
                  const bottom = rect.bottom - containerRect.top;
                  return {
                    left,
                    right,
                    top,
                    bottom,
                    cx: (left + right) / 2,
                    cy: (top + bottom) / 2,
                    w: right - left,
                    h: bottom - top,
                  };
                };
                const deltaRow = destination.row - fromPos.row;
                const deltaCol = destination.col - fromPos.col;
                const isOneStepMove =
                  Math.abs(deltaRow) + Math.abs(deltaCol) === 1;

                if (isOneStepMove) {
                  // Prefer DOM-measured cell rects: tracks are not always the same as the
                  // visible square (cells use aspect-square), so grid math can sit left/right of
                  // the drawn tile. Measure the shared edge midpoint from actual elements.
                  let sharedEdgeCenter: { x: number; y: number };
                  const upperRow = Math.min(fromPos.row, destination.row);
                  const lowerRow = Math.max(fromPos.row, destination.row);
                  const leftCol = Math.min(fromPos.col, destination.col);
                  const rightCol = Math.max(fromPos.col, destination.col);
                  if (deltaCol !== 0) {
                    const leftTile = cellEl(fromPos.row, leftCol);
                    const rightTile = cellEl(fromPos.row, rightCol);
                    if (leftTile && rightTile) {
                      const L = leftTile.getBoundingClientRect();
                      const R = rightTile.getBoundingClientRect();
                      sharedEdgeCenter = {
                        x: (L.right + R.left) / 2 - containerRect.left,
                        y: (L.top + L.bottom) / 2 - containerRect.top,
                      };
                    } else {
                      sharedEdgeCenter = {
                        x:
                          originX +
                          (leftCol + 1) * cellWidth,
                        y:
                          originY +
                          fromPos.row * cellHeight +
                          cellHeight / 2,
                      };
                    }
                  } else {
                    const upperTile = cellEl(upperRow, fromPos.col);
                    const lowerTile = cellEl(lowerRow, fromPos.col);
                    if (upperTile && lowerTile) {
                      const U = upperTile.getBoundingClientRect();
                      const Lo = lowerTile.getBoundingClientRect();
                      sharedEdgeCenter = {
                        x: (U.left + U.right) / 2 - containerRect.left,
                        y: (U.bottom + Lo.top) / 2 - containerRect.top,
                      };
                    } else {
                      sharedEdgeCenter = {
                        x:
                          originX +
                          fromPos.col * cellWidth +
                          cellWidth / 2,
                        y:
                          originY +
                          (upperRow + 1) * cellHeight,
                      };
                    }
                  }
                  // wf-move-arrow-head shape (viewBox 0 0 10 10), scaled; centroid at origin.
                  const headScale = arrowHeadLength / 10;
                  const vx0 = 0;
                  const vy0 = 0;
                  const vx1 = 0;
                  const vy1 = 10 * headScale;
                  const vx2 = 10 * headScale;
                  const vy2 = 5 * headScale;
                  const centroidX = (vx0 + vx1 + vx2) / 3;
                  const centroidY = (vy0 + vy1 + vy2) / 3;
                  const locals = [
                    { x: vx0 - centroidX, y: vy0 - centroidY },
                    { x: vx1 - centroidX, y: vy1 - centroidY },
                    { x: vx2 - centroidX, y: vy2 - centroidY },
                  ];
                  // Four Manhattan neighbors only: map canonical "tip +x" triangle with sign flips
                  // and axis swaps (no trig).
                  const mapLocalToWorld = (lx: number, ly: number) => {
                    const mx = sharedEdgeCenter.x;
                    const my = sharedEdgeCenter.y;
                    if (deltaCol === 1) {
                      return { x: mx + lx, y: my + ly };
                    }
                    if (deltaCol === -1) {
                      return { x: mx - lx, y: my - ly };
                    }
                    if (deltaRow === 1) {
                      return { x: mx + ly, y: my + lx };
                    }
                    return { x: mx - ly, y: my - lx };
                  };
                  const [p0, p1, p2] = locals.map((p) =>
                    mapLocalToWorld(p.x, p.y),
                  );
                  const pathD = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z`;

                  return (
                    <svg
                      className="absolute left-0 top-0 block overflow-visible"
                      width={containerRect.width}
                      height={containerRect.height}
                    >
                      <path d={pathD} fill="#facc15" />
                    </svg>
                  );
                }

                let start: { x: number; y: number };
                let turnPoint: { x: number; y: number } | null = null;
                let tip: { x: number; y: number };
                let lineEnd: { x: number; y: number };

                if (fromPos.row !== destination.row && fromPos.col !== destination.col) {
                  const firstDirCol = Math.sign(destination.col - fromPos.col);
                  const secondDirRow = Math.sign(destination.row - fromPos.row);
                  const fromR = cellRectPx(fromPos.row, fromPos.col);
                  const destR = cellRectPx(destination.row, destination.col);
                  if (fromR && destR) {
                    // Same horizontal line as one-tile *vertical* move: x at destination column
                    // tile center (DOM), not the edge between columns.
                    const vertX = destR.cx;
                    start = {
                      x:
                        firstDirCol > 0
                          ? fromR.right + startOutsideOffset
                          : fromR.left - startOutsideOffset,
                      y: fromR.cy,
                    };
                    turnPoint = { x: vertX, y: start.y };
                    tip = {
                      x: vertX,
                      y: destR.cy - (secondDirRow * destR.h) / 2,
                    };
                    lineEnd = {
                      x: tip.x,
                      y: tip.y - secondDirRow * arrowHeadLength,
                    };
                  } else {
                    start = {
                      x:
                        fromCenter.x +
                        firstDirCol * (cellWidth / 2 + startOutsideOffset),
                      y: fromCenter.y,
                    };
                    turnPoint = { x: destinationCenter.x, y: start.y };
                    tip = {
                      x: destinationCenter.x,
                      y: destinationCenter.y - (secondDirRow * cellHeight) / 2,
                    };
                    lineEnd = {
                      x: tip.x,
                      y: tip.y - secondDirRow * arrowHeadLength,
                    };
                  }
                } else if (fromPos.row === destination.row) {
                  const dirCol = Math.sign(destination.col - fromPos.col);
                  const fromR = cellRectPx(fromPos.row, fromPos.col);
                  const destR = cellRectPx(destination.row, destination.col);
                  if (fromR && destR) {
                    start = {
                      x:
                        dirCol > 0
                          ? fromR.right + startOutsideOffset
                          : fromR.left - startOutsideOffset,
                      y: fromR.cy,
                    };
                    tip = {
                      x: dirCol > 0 ? destR.left : destR.right,
                      y: destR.cy,
                    };
                    lineEnd = {
                      x: tip.x - dirCol * arrowHeadLength,
                      y: tip.y,
                    };
                  } else {
                    start = {
                      x:
                        fromCenter.x +
                        dirCol * (cellWidth / 2 + startOutsideOffset),
                      y: fromCenter.y,
                    };
                    tip = {
                      x: destinationCenter.x - (dirCol * cellWidth) / 2,
                      y: destinationCenter.y,
                    };
                    lineEnd = {
                      x: tip.x - dirCol * arrowHeadLength,
                      y: tip.y,
                    };
                  }
                } else {
                  const dirRow = Math.sign(destination.row - fromPos.row);
                  const fromR = cellRectPx(fromPos.row, fromPos.col);
                  const destR = cellRectPx(destination.row, destination.col);
                  if (fromR && destR) {
                    start = {
                      x: fromR.cx,
                      y:
                        dirRow > 0
                          ? fromR.bottom + startOutsideOffset
                          : fromR.top - startOutsideOffset,
                    };
                    tip = {
                      x: destR.cx,
                      y: destR.cy - (dirRow * destR.h) / 2,
                    };
                    lineEnd = {
                      x: tip.x,
                      y: tip.y - dirRow * arrowHeadLength,
                    };
                  } else {
                    start = {
                      x: fromCenter.x,
                      y:
                        fromCenter.y +
                        dirRow * (cellHeight / 2 + startOutsideOffset),
                    };
                    tip = {
                      x: destinationCenter.x,
                      y: destinationCenter.y - (dirRow * cellHeight) / 2,
                    };
                    lineEnd = {
                      x: tip.x,
                      y: tip.y - dirRow * arrowHeadLength,
                    };
                  }
                }

                const pathD =
                  turnPoint
                    ? `M ${start.x} ${start.y} L ${turnPoint.x} ${turnPoint.y} L ${lineEnd.x} ${lineEnd.y}`
                    : `M ${start.x} ${start.y} L ${lineEnd.x} ${lineEnd.y}`;

                return (
                  <svg
                    className="absolute left-0 top-0 block overflow-visible"
                    width={containerRect.width}
                    height={containerRect.height}
                  >
                    <defs>
                      <marker
                        id="wf-move-arrow-head"
                        viewBox="0 0 10 10"
                        refX="0"
                        refY="5"
                        markerWidth="24"
                        markerHeight="24"
                        markerUnits="userSpaceOnUse"
                        orient="auto"
                      >
                        <path d="M 0 0 L 0 10 L 10 5 z" fill="#facc15" />
                      </marker>
                    </defs>
                    <path
                      d={pathD}
                      stroke="#facc15"
                      strokeWidth={arrowStrokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      markerEnd="url(#wf-move-arrow-head)"
                    />
                  </svg>
                );
              })()}

            {/* Laser Shooting Animation */}
            {(selectedShipId || lastMoveShipId) &&
              directedWeaponBeamTargetId &&
              selectedWeaponType === "weapon" &&
              (() => {
                // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
                const shipId = selectedShipId || lastMoveShipId;
                if (!shipId) return null;

                // When replaying a last move that was a Special (e.g. EMP),
                // do not show any weapon beam animation.
                if (!selectedShipId && lastMoveActionType === ActionType.Special) {
                  return null;
                }

                // Check if the ship has a Laser weapon (mainWeapon === 0)
                const ship = shipMap.get(shipId);
                if (!ship || ship.equipment.mainWeapon !== 0) {
                  return null;
                }

                // Find positions of attacking and target ships.
                // - When a move is being previewed or dragged, use that "to" position.
                // - When replaying the last move, weapon effects should always
                //   originate from the "to" position of the last move, not the
                //   old position, so prefer lastMoveNewPosition when available.
                let attackerRow = -1;
                let attackerCol = -1;

                if (previewPosition) {
                  attackerRow = previewPosition.row;
                  attackerCol = previewPosition.col;
                } else if (draggedShipId && dragOverCell) {
                  attackerRow = dragOverCell.row;
                  attackerCol = dragOverCell.col;
                } else if (lastMoveShipId && shipId === lastMoveShipId) {
                  // For last move display, use the explicit "to" position
                  // when provided; this ensures the beam originates from
                  // the correct tile even if the grid or selection state
                  // has changed since the move.
                  if (lastMoveNewPosition) {
                    attackerRow = lastMoveNewPosition.row;
                    attackerCol = lastMoveNewPosition.col;
                  } else {
                    // Fallback: derive from current grid position
                    grid.forEach((row, r) => {
                      row.forEach((cell, c) => {
                        if (cell?.shipId === shipId) {
                          attackerRow = r;
                          attackerCol = c;
                        }
                      });
                    });
                  }
                  if (attackerRow === -1 || attackerCol === -1) return null;
                } else {
                  // No preview or drag position - don't show animation
                  return null;
                }

                if (!directedWeaponBeamTargetId) return null;
                const targetPosition = findShipPositionById(
                  directedWeaponBeamTargetId,
                );
                if (!targetPosition) return null;

                return (
                  <LaserShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />
                );
              })()}

            {/* Missile Shooting Animation */}
            {(selectedShipId || lastMoveShipId) &&
              targetShipId &&
              selectedWeaponType === "weapon" &&
              (() => {
                // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
                const shipId = selectedShipId || lastMoveShipId;
                if (!shipId) return null;

                if (!selectedShipId && lastMoveActionType === ActionType.Special) {
                  return null;
                }

                // Check if the ship has a Missile weapon (mainWeapon === 2)
                const ship = shipMap.get(shipId);
                if (!ship || ship.equipment.mainWeapon !== 2) {
                  return null;
                }

                // Find positions of attacking and target ships.
                // See Laser block above for details - same origin rules.
                let attackerRow = -1;
                let attackerCol = -1;

                if (previewPosition) {
                  attackerRow = previewPosition.row;
                  attackerCol = previewPosition.col;
                } else if (draggedShipId && dragOverCell) {
                  attackerRow = dragOverCell.row;
                  attackerCol = dragOverCell.col;
                } else if (lastMoveShipId && shipId === lastMoveShipId) {
                  if (lastMoveNewPosition) {
                    attackerRow = lastMoveNewPosition.row;
                    attackerCol = lastMoveNewPosition.col;
                  } else {
                    grid.forEach((row, r) => {
                      row.forEach((cell, c) => {
                        if (cell?.shipId === shipId) {
                          attackerRow = r;
                          attackerCol = c;
                        }
                      });
                    });
                  }
                  if (attackerRow === -1 || attackerCol === -1) return null;
                } else {
                  // No preview or drag position - don't show animation
                  return null;
                }

                const targetPosition = findShipPositionById(targetShipId);
                if (!targetPosition) return null;

                return (
                  <MissileShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />
                );
              })()}

            {/* Plasma Shooting Animation */}
            {(selectedShipId || lastMoveShipId) &&
              directedWeaponBeamTargetId &&
              selectedWeaponType === "weapon" &&
              (() => {
                // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
                const shipId = selectedShipId || lastMoveShipId;
                if (!shipId) return null;

                if (!selectedShipId && lastMoveActionType === ActionType.Special) {
                  return null;
                }

                // Check if the ship has a Plasma weapon (mainWeapon === 3)
                const ship = shipMap.get(shipId);
                if (!ship || ship.equipment.mainWeapon !== 3) {
                  return null;
                }

                // Find positions of attacking and target ships.
                // See Laser block above for details - same origin rules.
                let attackerRow = -1;
                let attackerCol = -1;

                if (previewPosition) {
                  attackerRow = previewPosition.row;
                  attackerCol = previewPosition.col;
                } else if (draggedShipId && dragOverCell) {
                  attackerRow = dragOverCell.row;
                  attackerCol = dragOverCell.col;
                } else if (lastMoveShipId && shipId === lastMoveShipId) {
                  if (lastMoveNewPosition) {
                    attackerRow = lastMoveNewPosition.row;
                    attackerCol = lastMoveNewPosition.col;
                  } else {
                    grid.forEach((row, r) => {
                      row.forEach((cell, c) => {
                        if (cell?.shipId === shipId) {
                          attackerRow = r;
                          attackerCol = c;
                        }
                      });
                    });
                  }
                  if (attackerRow === -1 || attackerCol === -1) return null;
                } else {
                  // No preview or drag position - don't show animation
                  return null;
                }

                if (!directedWeaponBeamTargetId) return null;
                const targetPosition = findShipPositionById(
                  directedWeaponBeamTargetId,
                );
                if (!targetPosition) return null;

                return (
                  <PlasmaShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />
                );
              })()}

            {/* Railgun Shooting Animation */}
            {(selectedShipId || lastMoveShipId) &&
              directedWeaponBeamTargetId &&
              selectedWeaponType === "weapon" &&
              (() => {
                // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
                const shipId = selectedShipId || lastMoveShipId;
                if (!shipId) return null;

                if (!selectedShipId && lastMoveActionType === ActionType.Special) {
                  return null;
                }

                // Check if the ship has a Railgun weapon (mainWeapon === 1)
                const ship = shipMap.get(shipId);
                if (!ship || ship.equipment.mainWeapon !== 1) {
                  return null;
                }

                // Find positions of attacking and target ships.
                // See Laser block above for details - same origin rules.
                let attackerRow = -1;
                let attackerCol = -1;

                if (previewPosition) {
                  attackerRow = previewPosition.row;
                  attackerCol = previewPosition.col;
                } else if (draggedShipId && dragOverCell) {
                  attackerRow = dragOverCell.row;
                  attackerCol = dragOverCell.col;
                } else if (lastMoveShipId && shipId === lastMoveShipId) {
                  if (lastMoveNewPosition) {
                    attackerRow = lastMoveNewPosition.row;
                    attackerCol = lastMoveNewPosition.col;
                  } else {
                    grid.forEach((row, r) => {
                      row.forEach((cell, c) => {
                        if (cell?.shipId === shipId) {
                          attackerRow = r;
                          attackerCol = c;
                        }
                      });
                    });
                  }
                  if (attackerRow === -1 || attackerCol === -1) return null;
                } else {
                  // No preview or drag position - don't show animation
                  return null;
                }

                if (!directedWeaponBeamTargetId) return null;
                const targetPosition = findShipPositionById(
                  directedWeaponBeamTargetId,
                );
                if (!targetPosition) return null;

                return (
                  <RailgunShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />
                );
              })()}

            {/* Flak Area-of-Effect animation */}
            {selectedShipId &&
              selectedWeaponType === "special" &&
              specialType === 3 &&
              targetShipId === 0n && (
                <FlakExplosionAnimation
                  gridContainerRef={gridContainerRef}
                  targetCells={flakEffectCells}
                />
              )}

            {/* EMP wave animation (selected + has a target ship) */}
            {selectedShipId &&
              selectedWeaponType === "special" &&
              specialType === 1 &&
              targetShipId != null &&
              targetShipId !== 0n &&
              !showLastMoveEmpReplayWhenSelected &&
              (() => {
                // Determine attacker position: preview > drag > current
                let attackerRow = -1;
                let attackerCol = -1;
                if (previewPosition) {
                  attackerRow = previewPosition.row;
                  attackerCol = previewPosition.col;
                } else if (draggedShipId && dragOverCell) {
                  attackerRow = dragOverCell.row;
                  attackerCol = dragOverCell.col;
                } else {
                  grid.forEach((row, r) => {
                    row.forEach((cell, c) => {
                      if (cell?.shipId === selectedShipId && !cell.isPreview) {
                        attackerRow = r;
                        attackerCol = c;
                      }
                    });
                  });
                }

                const targetPosition = findShipPositionById(targetShipId);

                if (
                  attackerRow === -1 ||
                  attackerCol === -1 ||
                  !targetPosition
                ) {
                  return null;
                }

                return (
                  <EmpWaveAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />
                );
              })()}

            {/* EMP wave animation for last move (hidden while selecting unless tutorial replay) */}
            {showLastMoveEmpReplay &&
              lastMoveActionType != null &&
              Number(lastMoveActionType) === ActionType.Special &&
              lastMoveShipId != null &&
              lastMoveTargetShipId != null &&
              Number(shipMap.get(lastMoveShipId)?.equipment.special) === 1 &&
              (() => {
                // Use the explicit "to" position for the last move when available.
                // Fallback to current grid position if needed.
                let attackerRow = -1;
                let attackerCol = -1;
                if (lastMoveNewPosition) {
                  attackerRow = lastMoveNewPosition.row;
                  attackerCol = lastMoveNewPosition.col;
                } else {
                  grid.forEach((row, r) => {
                    row.forEach((cell, c) => {
                      if (cell?.shipId === lastMoveShipId && !cell.isPreview) {
                        attackerRow = r;
                        attackerCol = c;
                      }
                    });
                  });
                }

                if (
                  (attackerRow === -1 || attackerCol === -1) &&
                  lastMoveShipId != null &&
                  allShipPositions?.length
                ) {
                  const sp = allShipPositions.find(
                    (p) => p.shipId === lastMoveShipId,
                  );
                  if (sp) {
                    attackerRow = sp.position.row;
                    attackerCol = sp.position.col;
                  }
                }

                let targetPosition = findShipPositionById(lastMoveTargetShipId);
                if (!targetPosition && lastMoveTargetShipId != null && allShipPositions?.length) {
                  const sp = allShipPositions.find(
                    (p) => p.shipId === lastMoveTargetShipId,
                  );
                  if (sp) {
                    targetPosition = {
                      row: sp.position.row,
                      col: sp.position.col,
                    };
                  }
                }

                if (
                  attackerRow === -1 ||
                  attackerCol === -1 ||
                  !targetPosition
                ) {
                  return null;
                }

                return (
                  <EmpWaveAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />
                );
              })()}

            {/* Repair drones animation (selected + has a target ship) */}
            {selectedShipId &&
              selectedWeaponType === "special" &&
              specialType === 2 &&
              targetShipId != null &&
              targetShipId !== 0n &&
              (() => {
                // Determine attacker position: preview > drag > current
                let attackerRow = -1;
                let attackerCol = -1;
                if (previewPosition) {
                  attackerRow = previewPosition.row;
                  attackerCol = previewPosition.col;
                } else if (draggedShipId && dragOverCell) {
                  attackerRow = dragOverCell.row;
                  attackerCol = dragOverCell.col;
                } else {
                  grid.forEach((row, r) => {
                    row.forEach((cell, c) => {
                      if (cell?.shipId === selectedShipId && !cell.isPreview) {
                        attackerRow = r;
                        attackerCol = c;
                      }
                    });
                  });
                }

                const targetPosition = findShipPositionById(targetShipId);

                if (
                  attackerRow === -1 ||
                  attackerCol === -1 ||
                  !targetPosition
                ) {
                  return null;
                }

                return (
                  <RepairDroneAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />
                );
              })()}

            {/* Repair drones animation for last move (when last move was repair) */}
            {lastMoveShipId != null &&
              (lastMoveActionType as ActionType) === ActionType.Special &&
              lastMoveTargetShipId != null &&
              lastMoveTargetShipId !== 0n &&
              shipMap.get(lastMoveShipId)?.equipment.special === 2 &&
              (() => {
                let attackerRow = -1;
                let attackerCol = -1;
                let targetPosition: { row: number; col: number } | null = null;
                grid.forEach((row, r) => {
                  row.forEach((cell, c) => {
                    if (cell?.shipId === lastMoveShipId) {
                      attackerRow = r;
                      attackerCol = c;
                    }
                  });
                });
                if (!targetPosition) {
                  targetPosition = findShipPositionById(lastMoveTargetShipId);
                }
                if (
                  attackerRow === -1 ||
                  attackerCol === -1 ||
                  !targetPosition
                )
                  return null;
                return (
                  <RepairDroneAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />
                );
              })()}

            {/* Damage Labels - grid level; z-40 so tutorial "Click here" overlay (z-[60]) can sit above */}
            {gridContainerRef.current &&
              (() => {
                const targetsToShow = collectDamageLabelTargets({
                  grid,
                  allShipPositions,
                  selectedShipId,
                  targetShipId,
                  draggedShipId,
                  dragOverCell,
                  dragValidTargets,
                  validTargets,
                  labelTargets,
                  selectedWeaponType,
                  specialType,
                });

                const shouldShowRammingLabels =
                  isRammingMovePreview && rammingPreviewPosition != null;
                const shouldShowHoldPositionLabel =
                  lastMoveActionType != null &&
                  Number(lastMoveActionType) !== ActionType.Retreat &&
                  lastMoveOldPosition != null &&
                  lastMoveNewPosition != null &&
                  lastMoveOldPosition.row >= 0 &&
                  lastMoveOldPosition.col >= 0 &&
                  lastMoveNewPosition.row >= 0 &&
                  lastMoveNewPosition.col >= 0 &&
                  lastMoveOldPosition.row === lastMoveNewPosition.row &&
                  lastMoveOldPosition.col === lastMoveNewPosition.col;
                if (
                  targetsToShow.length === 0 &&
                  !shouldShowRammingLabels &&
                  !shouldShowHoldPositionLabel
                )
                  return null;

                const containerRect =
                  gridContainerRef.current.getBoundingClientRect();
                const layoutEl = gridLayoutRef.current;
                const layoutRect = layoutEl?.getBoundingClientRect();
                // Match move-arrow overlay: bordered grid tracks use the content box
                // (clientLeft/Top + clientWidth/Height), not the container rect alone.
                const originX =
                  layoutEl && layoutRect
                    ? layoutRect.left - containerRect.left + layoutEl.clientLeft
                    : 0;
                const originY =
                  layoutEl && layoutRect
                    ? layoutRect.top - containerRect.top + layoutEl.clientTop
                    : 0;
                const cellWidth = layoutEl
                  ? layoutEl.clientWidth / 17
                  : containerRect.width / 17;
                const cellHeight = layoutEl
                  ? layoutEl.clientHeight / 11
                  : containerRect.height / 11;

                return (
                  <div
                    className="absolute pointer-events-none z-40"
                    style={{
                      left: `0px`,
                      top: `0px`,
                      width: `${containerRect.width}px`,
                      height: `${containerRect.height}px`,
                    }}
                  >
                    {targetsToShow.map((target) => {
                      const isLastMoveTarget =
                        lastMoveShipId != null &&
                        targetShipId != null &&
                        target.shipId === targetShipId;

                      // Don't show damage labels for the prior move (we don't have actual damage/overload data)
                      if (isLastMoveTarget) {
                        return null;
                      }

                      const damage = calculateDamage(
                        target.shipId,
                        selectedWeaponType,
                        selectedWeaponType === "special" && specialType === 3
                          ? true
                          : undefined,
                      );

                      const showAsKill = damage.willKill;
                      const targetAttributes = getShipAttributes(target.shipId);
                      const willDestroyByReactor =
                        damage.reactorCritical &&
                        !!targetAttributes &&
                        targetAttributes.reactorCriticalTimer + 1 >= 3;
                      let labelText: string;
                      if (useCompactMobileDamageLabels) {
                        labelText = String(damage.reducedDamage);
                      } else if (selectedWeaponType === "special") {
                        // Flak does damage, other special abilities repair/heal
                        if (specialType === 3) {
                          // Flak special - show damage effect
                          if (willDestroyByReactor) {
                            labelText = "[DESTROY]";
                          } else if (damage.reactorCritical) {
                            labelText = "REACTOR +1";
                          } else if (showAsKill) {
                            labelText = `[✕] ${damage.reducedDamage} DMG`;
                          } else {
                            labelText = `${damage.reducedDamage} DMG`;
                          }
                        } else if (specialType === 1) {
                          // EMP: show reactor damage label (not repair)
                          labelText = willDestroyByReactor
                            ? "[DESTROY]"
                            : "REACTOR DMG";
                        } else {
                          // Other special abilities - show repair/heal effect
                          labelText = `REPAIR ${damage.reducedDamage} HP`;
                        }
                      } else if (willDestroyByReactor) {
                        labelText = "[DESTROY]";
                      } else if (damage.reactorCritical) {
                        labelText = "REACTOR +1";
                      } else if (showAsKill) {
                        labelText = `[✕] ${damage.reducedDamage} DMG`;
                      } else {
                        labelText = `${damage.reducedDamage} DMG`;
                      }

                      const { cx: cellX, cellTop, cellBottom } =
                        measureGridCellLabelAnchor(
                          containerRect,
                          gridLayoutRef.current,
                          target.row,
                          target.col,
                          {
                            originX,
                            originY,
                            cellWidth,
                            cellHeight,
                          },
                        );

                      // Default: label sits above the cell (label bottom = cell top). Top row: below
                      // the cell (label top = cell bottom) so labels are not clipped above the grid.
                      const isTopGridRow = target.row === 0;
                      const labelTopPx = isTopGridRow ? cellBottom : cellTop;
                      const labelTransform = isTopGridRow
                        ? "translate(-50%, 0)"
                        : "translate(-50%, -100%)";

                      return (
                        <div
                          key={target.shipId.toString()}
                          className={`absolute rounded-none font-mono text-center text-white whitespace-nowrap ${
                            useCompactMobileDamageLabels
                              ? "px-1.5 py-0.5 text-[11px] font-bold"
                              : "px-2 py-1 text-xs"
                          } ${
                            selectedWeaponType === "special"
                              ? specialType === 3 // Flak
                                ? "bg-amber/20 border border-amber" // Flak
                                : specialType === 1 // EMP
                                  ? "bg-warning-red/20 border border-warning-red" // EMP reactor damage
                                  : "bg-cyan/20 border border-cyan" // Other specials
                              : "bg-warning-red/20 border border-warning-red"
                          }`}
                          style={{
                            left: `${cellX}px`,
                            top: `${labelTopPx}px`,
                            transform: labelTransform,
                          }}
                        >
                          {labelText}
                        </div>
                      );
                    })}
                    {(() => {
                      if (!isRammingMovePreview || !rammingPreviewPosition) {
                        return null;
                      }
                      const { cx: cellX, cellTop, cellBottom } =
                        measureGridCellLabelAnchor(
                          containerRect,
                          gridLayoutRef.current,
                          rammingPreviewPosition.row,
                          rammingPreviewPosition.col,
                          {
                            originX,
                            originY,
                            cellWidth,
                            cellHeight,
                          },
                        );
                      const isTopGridRow = rammingPreviewPosition.row === 0;
                      const labelTopPx = isTopGridRow ? cellBottom : cellTop;
                      const labelTransform = isTopGridRow
                        ? "translate(-50%, 0)"
                        : "translate(-50%, -100%)";
                      return (
                        <>
                          <div
                            className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-cyan whitespace-nowrap border border-cyan bg-cyan/15"
                            style={{
                              left: `${cellX}px`,
                              top: `${labelTopPx}px`,
                              transform: `${labelTransform} translateY(${
                                isTopGridRow ? 0 : -22
                              }px)`,
                            }}
                          >
                            Ramming Speed
                          </div>
                          <div
                            className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-white whitespace-nowrap border border-warning-red bg-warning-red/20"
                            style={{
                              left: `${cellX}px`,
                              top: `${labelTopPx}px`,
                              transform: labelTransform,
                            }}
                          >
                            REACTOR CRITICAL +1
                          </div>
                        </>
                      );
                    })()}
                    {(() => {
                      if (
                        lastMoveActionType == null ||
                        Number(lastMoveActionType) === ActionType.Retreat ||
                        !lastMoveOldPosition ||
                        !lastMoveNewPosition ||
                        lastMoveOldPosition.row < 0 ||
                        lastMoveOldPosition.col < 0 ||
                        lastMoveNewPosition.row < 0 ||
                        lastMoveNewPosition.col < 0 ||
                        lastMoveOldPosition.row !== lastMoveNewPosition.row ||
                        lastMoveOldPosition.col !== lastMoveNewPosition.col
                      ) {
                        return null;
                      }
                      const { cx: cellX, cellTop, cellBottom } =
                        measureGridCellLabelAnchor(
                          containerRect,
                          gridLayoutRef.current,
                          lastMoveNewPosition.row,
                          lastMoveNewPosition.col,
                          {
                            originX,
                            originY,
                            cellWidth,
                            cellHeight,
                          },
                        );
                      const isTopGridRow = lastMoveNewPosition.row === 0;
                      const labelTopPx = isTopGridRow ? cellBottom : cellTop;
                      const labelTransform = isTopGridRow
                        ? "translate(-50%, 0)"
                        : "translate(-50%, -100%)";
                      return (
                        <div
                          className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-amber whitespace-nowrap border border-amber bg-amber/10"
                          style={{
                            left: `${cellX}px`,
                            top: `${labelTopPx}px`,
                            transform: labelTransform,
                          }}
                        >
                          Hold Position
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

            {/* Tutorial "Click here": grid-level z-[60] so it appears above damage labels (z-40).
                Same vertical rules as damage labels: above the cell except row 0 (below). Nudge up when
                a damage label shares the cell on non-top rows. */}
            {(() => {
              const container = gridContainerRef.current;
              if (
                !container ||
                !tutorialHighlightCells?.length
              ) {
                return null;
              }
              const containerRect = container.getBoundingClientRect();
              const layoutEl = gridLayoutRef.current;
              const layoutRect = layoutEl?.getBoundingClientRect();
              const originX =
                layoutEl && layoutRect
                  ? layoutRect.left - containerRect.left + layoutEl.clientLeft
                  : 0;
              const originY =
                layoutEl && layoutRect
                  ? layoutRect.top - containerRect.top + layoutEl.clientTop
                  : 0;
              const cellWidth = layoutEl
                ? layoutEl.clientWidth / 17
                : containerRect.width / 17;
              const cellHeight = layoutEl
                ? layoutEl.clientHeight / 11
                : containerRect.height / 11;

              return (
                <div
                  className="absolute pointer-events-none z-[60]"
                  style={{
                    left: 0,
                    top: 0,
                    width: `${containerRect.width}px`,
                    height: `${containerRect.height}px`,
                  }}
                >
                  {tutorialHighlightCells.map((p, i) => {
                    if (p.hideLabel) return null;
                    const { cx: cellX, cellTop, cellBottom } =
                      measureGridCellLabelAnchor(
                        containerRect,
                        gridLayoutRef.current,
                        p.row,
                        p.col,
                        {
                          originX,
                          originY,
                          cellWidth,
                          cellHeight,
                        },
                      );
                    const cell = grid[p.row]?.[p.col];
                    const shipId = cell?.shipId;
                    const targetsForLabels = labelTargets ?? validTargets;
                    const hasSingleSelectedTarget =
                      targetShipId != null && targetShipId !== 0n;
                    const damageLabelOnThisShip =
                      shipId != null &&
                      selectedShipId != null &&
                      !isShipOwnedByCurrentPlayer(shipId) &&
                      (hasSingleSelectedTarget
                        ? targetShipId === shipId
                        : targetsForLabels.some((t) => t.shipId === shipId));
                    const isTopGridRow = p.row === 0;
                    /** Stack below damage when both sit under the cell (row 0). */
                    const tutorialTopPx = isTopGridRow
                      ? cellBottom + (damageLabelOnThisShip ? 28 : 0)
                      : cellTop - (damageLabelOnThisShip ? 32 : 0);
                    const tutorialTransform = isTopGridRow
                      ? "translate(-50%, 0)"
                      : "translate(-50%, -100%)";
                    return (
                      <div
                        key={`tutorial-click-${p.row}-${p.col}-${i}`}
                        className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-amber whitespace-nowrap bg-amber/10 border border-amber"
                        style={{
                          left: `${cellX}px`,
                          top: `${tutorialTopPx}px`,
                          transform: tutorialTransform,
                        }}
                      >
                        {p.label ?? tutorialDefaultLabel}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Ship tooltip: absolute inside grid container so it tracks dynamic layout */}
          {hoveredCell &&
            !disableTooltips &&
            !draggedShipId &&
            (() => {
              const ship = shipMap.get(hoveredCell.shipId);
              const attributes = getShipAttributes(hoveredCell.shipId);
              if (!ship) return null;

              const gridEl = gridContainerRef.current;
              if (!gridEl) return null;

              const tooltipWidth = 384;
              const tooltipHeight = 400;
              const offset = 15;
              const leftPlacementOffset = 28;

              const cr = gridEl.getBoundingClientRect();
              const layoutEl = gridLayoutRef.current;
              const layoutRect = layoutEl?.getBoundingClientRect();
              const originX =
                layoutEl && layoutRect
                  ? layoutRect.left - cr.left + layoutEl.clientLeft
                  : 0;
              const originY =
                layoutEl && layoutRect
                  ? layoutRect.top - cr.top + layoutEl.clientTop
                  : 0;
              const cellWidth = layoutEl
                ? layoutEl.clientWidth / 17
                : cr.width / 17;
              const cellHeight = layoutEl
                ? layoutEl.clientHeight / 11
                : cr.height / 11;

              const vb = measureGridCellViewportBounds(
                layoutEl,
                hoveredCell.row,
                hoveredCell.col,
                {
                  gridContainerViewportLeft: cr.left,
                  gridContainerViewportTop: cr.top,
                  originX,
                  originY,
                  cellWidth,
                  cellHeight,
                },
              );

              const shipLeft = vb.left - cr.left;
              const shipTop = vb.top - cr.top;
              const shipRight = vb.right - cr.left;
              const shipBottom = vb.bottom - cr.top;

              const mouseX = hoveredCell.mouseX - cr.left;
              const mouseY = hoveredCell.mouseY - cr.top;

              let tooltipLeft = mouseX + offset;
              let tooltipTop = mouseY + offset;

              const tooltipRight = tooltipLeft + tooltipWidth;
              const wouldCoverHorizontally =
                tooltipLeft < shipRight && tooltipRight > shipLeft;

              const tooltipBottom = tooltipTop + tooltipHeight;
              const wouldCoverVertically =
                tooltipTop < shipBottom && tooltipBottom > shipTop;

              const isCreatorShip = hoveredCell.isCreator;
              const maxLeft = Math.max(0, cr.width - tooltipWidth);
              const maxTop = Math.max(0, cr.height - tooltipHeight);

              if (wouldCoverHorizontally && wouldCoverVertically) {
                if (isCreatorShip) {
                  if (shipLeft - tooltipWidth - leftPlacementOffset >= 0) {
                    tooltipLeft = shipLeft - tooltipWidth - leftPlacementOffset;
                  } else if (shipRight + tooltipWidth + offset <= cr.width) {
                    tooltipLeft = shipRight + offset;
                  } else if (shipTop - tooltipHeight - offset >= 0) {
                    tooltipTop = shipTop - tooltipHeight - offset;
                    tooltipLeft = mouseX;
                  } else if (
                    shipBottom + tooltipHeight + offset <=
                    cr.height
                  ) {
                    tooltipTop = shipBottom + offset;
                    tooltipLeft = mouseX;
                  }
                } else {
                  if (shipRight + tooltipWidth + offset <= cr.width) {
                    tooltipLeft = shipRight + offset;
                  } else if (shipLeft - tooltipWidth - leftPlacementOffset >= 0) {
                    tooltipLeft = shipLeft - tooltipWidth - leftPlacementOffset;
                  } else if (shipTop - tooltipHeight - offset >= 0) {
                    tooltipTop = shipTop - tooltipHeight - offset;
                    tooltipLeft = mouseX;
                  } else if (
                    shipBottom + tooltipHeight + offset <=
                    cr.height
                  ) {
                    tooltipTop = shipBottom + offset;
                    tooltipLeft = mouseX;
                  }
                }
              } else if (wouldCoverHorizontally) {
                if (isCreatorShip) {
                  if (shipLeft - tooltipWidth - leftPlacementOffset >= 0) {
                    tooltipLeft = shipLeft - tooltipWidth - leftPlacementOffset;
                  } else {
                    tooltipLeft = shipRight + offset;
                  }
                } else {
                  if (shipRight + tooltipWidth + offset <= cr.width) {
                    tooltipLeft = shipRight + offset;
                  } else {
                    tooltipLeft = shipLeft - tooltipWidth - leftPlacementOffset;
                  }
                }
              } else if (wouldCoverVertically) {
                if (shipTop - tooltipHeight - offset >= 0) {
                  tooltipTop = shipTop - tooltipHeight - offset;
                } else {
                  tooltipTop = shipBottom + offset;
                }
              }

              tooltipLeft = Math.max(0, Math.min(tooltipLeft, maxLeft));
              tooltipTop = Math.max(0, Math.min(tooltipTop, maxTop));

              return (
                <div
                  className="absolute z-[10000] pointer-events-none opacity-100"
                  style={{
                    left: `${tooltipLeft}px`,
                    top: `${tooltipTop}px`,
                  }}
                >
                  <div className="min-w-[22rem] w-[24rem] opacity-100">
                    <ShipCard
                      ship={ship}
                      isStarred={false}
                      onToggleStar={() => {}}
                      isSelected={false}
                      onToggleSelection={() => {}}
                      onRecycleClick={() => {}}
                      showInGameProperties={true}
                      inGameAttributes={attributes || undefined}
                      attributesLoading={!attributes}
                      hideRecycle={true}
                      hideCheckbox={true}
                      tooltipMode={true}
                      isCurrentPlayerShip={isShipOwnedByCurrentPlayer(
                        hoveredCell.shipId,
                      )}
                      flipShip={hoveredCell.isCreator}
                      hasMoved={movedShipIdsSet.has(hoveredCell.shipId)}
                      gameViewMode={true}
                      tooltipGridPosition={{
                        row: hoveredCell.row,
                        col: hoveredCell.col,
                      }}
                    />
                  </div>
                </div>
              );
            })()}
        </div>
      </div>
    </>
  );
}
