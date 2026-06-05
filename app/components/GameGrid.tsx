"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { ShipPosition, Attributes, Ship, ActionType, getMainWeaponName, getSpecialName } from "../types/types";
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
import { useGridCellSets } from "../hooks/useGridCellSets";
import { GameGridTooltip } from "./GameGridTooltip";
import { GameGridConfirmWidget } from "./GameGridConfirmWidget";

/** Viewport bounds for a grid cell (fixed tooltip placement vs the moused tile). */
export function measureGridCellViewportBounds(
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
  selectedWeaponType: "weapon" | "special" | "ram";
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

  // RAM mode has no weapon damage labels; ram-specific labels are rendered separately.
  if (selectedWeaponType === "ram") return [];

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

  // When a specific destination is active (drag or hover), only show labels for that
  // destination's valid targets — not the full multi-origin threat range.
  if (selectedShipId && !hasSingleSelectedTarget && !(draggedShipId && dragOverCell)) {
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
  selectedWeaponType: "weapon" | "special" | "ram";
  hoveredCell: {
    shipId: bigint;
    row: number;
    col: number;
    isCreator: boolean;
    fromFleet?: boolean;
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
  lastMoveShipId?: bigint | null;
  lastMoveOldPosition?: { row: number; col: number } | null; // Old position for last move preview
  // New position for the last move (to position). When playing back weapon
  // effects for the last move, the beam should originate from this "to"
  // position rather than the old position.
  lastMoveNewPosition?: { row: number; col: number } | null;
  lastMoveActionType?: ActionType | null; // When Retreat, show warp collapse at old position
  lastMoveTargetShipId?: bigint | null;
  lastMoveIsCurrentPlayer?: boolean | undefined; // true = blue outline, false = red outline
  /** Ramming preview destination tile. */
  rammingPreviewPosition?: { row: number; col: number } | null;
  /** True when the staged move is a ramming move. */
  isRammingMovePreview?: boolean;
  /** When set, last-move EMP replay still shows while a ship is selected (e.g. tutorial ship-destruction). */
  showLastMoveEmpReplayWhenSelected?: boolean;
  retreatPrepShipId?: bigint | null;
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
  setSelectedWeaponType: (type: "weapon" | "special" | "ram") => void;
  setHoveredCell: (
    cell: {
      shipId: bigint;
      row: number;
      col: number;
      isCreator: boolean;
      fromFleet?: boolean;
    } | null,
  ) => void;
  setDraggedShipId: (shipId: bigint | null) => void;
  setDragOverCell: (cell: { row: number; col: number } | null) => void;
  /** Shooting-range overlay from the hovered movement tile (parent-computed). */
  hoverShootingRange?: Array<{ row: number; col: number }>;
  /** Valid targets from the hovered movement tile (parent-computed). */
  hoverValidTargets?: Array<{ shipId: bigint; position: { row: number; col: number } }>;
  /** Called when the pointer enters or leaves a movement tile (passes null on leave). */
  onMoveTileHover?: (cell: { row: number; col: number } | null) => void;
  showConfirmWidget?: boolean;
  confirmWidgetLabel?: string;
  onConfirmMove?: () => void;
  onCancelMove?: () => void;
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
  hoverShootingRange = [],
  hoverValidTargets = [],
  onMoveTileHover,
  showConfirmWidget = false,
  confirmWidgetLabel = "SUBMIT",
  onConfirmMove,
  onCancelMove,
}: GameGridProps) {
  const gridContainerRef = useRef<HTMLDivElement>(null);
  /** The bordered CSS grid (cells); tracks are inset by border — use for cell math vs overlay. */
  const gridLayoutRef = useRef<HTMLDivElement>(null);
  // Track last drag over cell to prevent excessive state updates
  const lastDragOverCellRef = useRef<{ row: number; col: number } | null>(null);

  const [hoveredMoveTile, setHoveredMoveTile] = useState<{ row: number; col: number } | null>(null);

  // Effective "drag-like" preview: real drag destination OR hovered movement tile (when no committed
  // previewPosition — the click path already drives all visuals via previewPosition).
  const effectiveDragCell = (draggedShipId && dragOverCell) ? dragOverCell
    : (selectedShipId !== null && !previewPosition && retreatPrepShipId == null ? hoveredMoveTile : null);
  const effectiveDragShipId = draggedShipId ?? (effectiveDragCell ? selectedShipId : null);
  const effectiveShootingRange = effectiveDragCell
    ? (draggedShipId ? dragShootingRange : hoverShootingRange)
    : [];
  const effectiveValidTargets: Array<{ shipId: bigint; position: { row: number; col: number } }> =
    effectiveDragCell
      ? (draggedShipId ? dragValidTargets : hoverValidTargets)
      : [];

  const outerWrapperRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState({ scale: 1, tx: 0, ty: 0 });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Right-click pan state
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const panDidMoveRef = useRef(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const outer = outerWrapperRef.current;
    const el = gridContainerRef.current;
    if (!outer || !el) return;

    // Use the outer wrapper's rect (no transform applied) + the element's untransformed
    // offsetLeft/offsetTop (= padding) to get the element's natural screen position.
    const outerRect = outer.getBoundingClientRect();
    const naturalLeft = outerRect.left + el.offsetLeft;
    const naturalTop = outerRect.top + el.offsetTop;

    // Cursor in natural (pre-transform) element coordinates
    const mx = e.clientX - naturalLeft;
    const my = e.clientY - naturalTop;

    const { scale, tx, ty } = zoomRef.current;

    const ZOOM_FACTOR = 1.15;
    const MIN_SCALE = 1;
    const MAX_SCALE = 5;

    const delta = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * delta));
    if (newScale === scale) return;

    // Keep the point under the cursor fixed:
    // contentPt = (cursor - translate) / scale  →  after zoom: translate' = cursor - contentPt * newScale
    const contentX = (mx - tx) / scale;
    const contentY = (my - ty) / scale;
    let newTx = mx - contentX * newScale;
    let newTy = my - contentY * newScale;

    // Clamp so you can't pan the grid fully off-screen
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const maxTx = 0;
    const minTx = w * (1 - newScale);
    const maxTy = 0;
    const minTy = h * (1 - newScale);
    newTx = Math.min(maxTx, Math.max(minTx, newTx));
    newTy = Math.min(maxTy, Math.max(minTy, newTy));

    // Reset translate when returning to scale 1
    if (newScale === MIN_SCALE) { newTx = 0; newTy = 0; }

    setZoom({ scale: newScale, tx: newTx, ty: newTy });
  }, []);

  useEffect(() => {
    const el = outerWrapperRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 2) return;
      panStartRef.current = { x: e.clientX, y: e.clientY, tx: zoomRef.current.tx, ty: zoomRef.current.ty };
      panDidMoveRef.current = false;
    };

    let rafId: number | null = null;
    const onMouseMove = (e: MouseEvent) => {
      if (!panStartRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      if (!panDidMoveRef.current && Math.hypot(dx, dy) < 4) return;
      panDidMoveRef.current = true;

      if (rafId !== null) return; // skip if a frame is already queued
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!panStartRef.current) return;
        const { scale } = zoomRef.current;
        const gridEl = gridContainerRef.current;
        const w = gridEl?.offsetWidth ?? el.offsetWidth;
        const h = gridEl?.offsetHeight ?? el.offsetHeight;
        const tdx = e.clientX - panStartRef.current.x;
        const tdy = e.clientY - panStartRef.current.y;
        let newTx = Math.min(0, Math.max(w * (1 - scale), panStartRef.current.tx + tdx));
        let newTy = Math.min(0, Math.max(h * (1 - scale), panStartRef.current.ty + tdy));
        setZoom((prev) => ({ ...prev, tx: newTx, ty: newTy }));
      });
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 2) return;
      panStartRef.current = null;
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (panDidMoveRef.current) e.preventDefault();
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("contextmenu", onContextMenu, { capture: true });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("contextmenu", onContextMenu, { capture: true });
    };
  }, [handleWheel]);

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
      (previewPosition != null || effectiveDragCell != null);
    if (stagingOwnShot) {
      if (targetShipId == null || targetShipId === 0n) return null;
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
    const ids = new Set<bigint>();
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

  // Compute the best placement for the confirm widget to avoid covering the target ship,
  // weapon beam path, and move arrow. Tries below → above → right → left in priority order
  // adjusted for movement direction, skipping positions that cover the target or leave the grid.
  const confirmWidgetAnchor = React.useMemo(() => {
    if (!showConfirmWidget) return null;

    // Resolve the anchor cell: target ship always wins when one is selected,
    // otherwise fall back to staged destination, then selected ship's current cell.
    let destRow = 0, destCol = 0;
    const hasRealTarget = targetShipId != null && targetShipId !== 0n;
    if (hasRealTarget) {
      let found = false;
      outer0: for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c]?.shipId === targetShipId) {
            destRow = r; destCol = c; found = true; break outer0;
          }
        }
      }
      if (!found && allShipPositions) {
        const sp = allShipPositions.find((p) => p.shipId === targetShipId);
        if (sp) { destRow = sp.position.row; destCol = sp.position.col; found = true; }
      }
      if (!found) return null;
    } else if (previewPosition) {
      destRow = previewPosition.row;
      destCol = previewPosition.col;
    } else {
      let found = false;
      if (selectedShipId) {
        outer0: for (let r = 0; r < grid.length; r++) {
          for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c]?.shipId === selectedShipId) {
              destRow = r; destCol = c; found = true; break outer0;
            }
          }
        }
        if (!found && allShipPositions) {
          const sp = allShipPositions.find((p) => p.shipId === selectedShipId);
          if (sp) { destRow = sp.position.row; destCol = sp.position.col; found = true; }
        }
      }
      if (!found) return null;
    }

    // Find the ship's current (non-preview) cell to know the movement direction
    let shipRow = destRow, shipCol = destCol;
    outer: for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c];
        if (cell?.shipId === selectedShipId && !cell.isPreview) {
          shipRow = r; shipCol = c;
          break outer;
        }
      }
    }

    // Find the target ship's cell (if any)
    let targetRow: number | null = null, targetCol: number | null = null;
    if (targetShipId) {
      outer2: for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c]?.shipId === targetShipId) {
            targetRow = r; targetCol = c;
            break outer2;
          }
        }
      }
      // Fallback: allShipPositions
      if (targetRow === null && allShipPositions) {
        const sp = allShipPositions.find((p) => p.shipId === targetShipId);
        if (sp) { targetRow = sp.position.row; targetCol = sp.position.col; }
      }
    }

    type Side = "below" | "above" | "right" | "left";

    // Approximate grid cells covered by the widget for each placement.
    // Widget is ~2.5 cols wide and ~1 row tall.
    const covers = (side: Side): { rMin: number; rMax: number; cMin: number; cMax: number } => {
      switch (side) {
        case "below": return { rMin: destRow + 1, rMax: destRow + 1, cMin: destCol - 1, cMax: destCol + 1 };
        case "above": return { rMin: destRow - 1, rMax: destRow - 1, cMin: destCol - 1, cMax: destCol + 1 };
        case "right": return { rMin: destRow,     rMax: destRow,     cMin: destCol + 1, cMax: destCol + 2 };
        case "left":  return { rMin: destRow,     rMax: destRow,     cMin: destCol - 2, cMax: destCol - 1 };
      }
    };

    const inBounds = (side: Side) => {
      switch (side) {
        case "below": return destRow < 10;
        case "above": return destRow > 0;
        case "right": return destCol <= 14;
        case "left":  return destCol >= 2;
      }
    };

    const conflictsTarget = (side: Side) => {
      if (targetRow === null || targetCol === null) return false;
      const { rMin, rMax, cMin, cMax } = covers(side);
      return targetRow >= rMin && targetRow <= rMax && targetCol >= cMin && targetCol <= cMax;
    };

    // Build priority order: prefer sides perpendicular to movement direction,
    // and prefer opposite to where the attack beam points (toward target).
    const dr = destRow - shipRow;
    const dc = destCol - shipCol;
    const tdr = targetRow !== null ? targetRow - destRow : 0;
    const tdc = targetCol !== null ? targetCol - destCol : 0;

    // "away from target" direction
    const targetBelow = tdr > 0, targetAbove = tdr < 0;
    const targetRight = tdc > 0, targetLeft  = tdc < 0;

    // "incoming arrow" direction
    const arrowFromAbove = dr > 0, arrowFromBelow = dr < 0;
    const arrowFromLeft  = dc > 0, arrowFromRight = dc < 0;

    // Score each side: lower = preferred
    const score = (side: Side): number => {
      let s = 0;
      // Avoid sides where the target is
      if (side === "below" && targetBelow) s += 10;
      if (side === "above" && targetAbove) s += 10;
      if (side === "right" && targetRight) s += 10;
      if (side === "left"  && targetLeft)  s += 10;
      // Prefer sides not in the arrow's incoming path
      if (side === "above" && arrowFromAbove) s += 3;
      if (side === "below" && arrowFromBelow) s += 3;
      if (side === "left"  && arrowFromLeft)  s += 3;
      if (side === "right" && arrowFromRight) s += 3;
      // Prefer below/above over left/right (fits better visually)
      if (side === "right" || side === "left") s += 1;
      return s;
    };

    const sides: Side[] = ["below", "above", "right", "left"];
    const sorted = sides
      .filter(inBounds)
      .sort((a, b) => score(a) - score(b));

    // Pick the best side that doesn't conflict; fall back to any valid side
    const best = sorted.find((s) => !conflictsTarget(s)) ?? sorted[0] ?? "below";

    const L = `${((destCol + 0.5) / 17) * 100}%`;
    const Lright = `${((destCol + 1) / 17) * 100}%`;
    const Lleft = `${(destCol / 17) * 100}%`;
    const Tmid = `${((destRow + 0.5) / 11) * 100}%`;

    switch (best) {
      case "below": return { left: L,      top: `${((destRow + 1) / 11) * 100}%`, transform: "translate(-50%, 3px)" };
      case "above": return { left: L,      top: `${(destRow / 11) * 100}%`,        transform: "translate(-50%, calc(-100% - 3px))" };
      case "right": return { left: Lright, top: Tmid,                               transform: "translate(4px, -50%)" };
      case "left":  return { left: Lleft,  top: Tmid,                               transform: "translate(calc(-100% - 4px), -50%)" };
    }
  }, [showConfirmWidget, previewPosition, selectedShipId, targetShipId, grid, allShipPositions]);

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

  // Pre-compute lookup Sets so per-cell checks are O(1) instead of O(n) each.
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

  const isHoveringValidTarget =
    hoveredCell !== null &&
    !hoveredCell.fromFleet &&
    validTargetIdSet.has(hoveredCell.shipId);

  return (
    <>
      {/* Map Grid */}
      <div
        ref={outerWrapperRef}
        className="w-full h-full min-h-0 px-0 lg:px-2 overflow-hidden"
        onContextMenu={handleGridContextMenu}
      >
        <div
          ref={gridContainerRef}
          key="game-grid"
          data-grid-inner=""
          className="relative w-full h-full min-h-0"
          style={{
            transform: `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`,
            transformOrigin: "0 0",
          }}
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
                const isMovementTile = movementTileSet.has(`${rowIndex},${colIndex}`);
                const isHighlightedMove =
                  highlightedMovePosition &&
                  highlightedMovePosition.row === rowIndex &&
                  highlightedMovePosition.col === colIndex;
                // Suppress base shooting range when drag/hover is active, or when RAM mode is
                // selected (ram has no weapon range overlay — movement range shows instead).
                const isShootingTile = !effectiveDragCell && selectedWeaponType !== "ram" &&
                  shootingTileSet.has(`${rowIndex},${colIndex}`);
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
                  (effectiveDragCell
                    ? effectiveValidTargetIdSet.has(cell.shipId)
                    : validTargetIdSet.has(cell.shipId));

                // Check if this cell contains an assistable target (friendly ship with 0 HP)
                const isAssistableTarget =
                  shouldRenderShipContent &&
                  selectedShipId &&
                  isCurrentPlayerTurn &&
                  isShipOwnedByCurrentPlayer(selectedShipId) &&
                  (assistableTargetIdSet.has(cell.shipId) ||
                    assistableTargetsFromStartIdSet.has(cell.shipId));
                const isSelectedTarget = cell && targetShipId === cell.shipId;

                const handleCellClick = () => {
                  if (cell && !shouldRenderShipContent) return;
                  // A hover-preview ghost sits at a movement tile before the player commits a
                  // click. Treat it as an empty cell so the movement-tile path fires correctly.
                  const isHoverGhost = !!(cell?.isPreview && !previewPosition && isMovementTile);
                  if (cell && !isHoverGhost) {
                    // Destroyed ships are display-only and cannot be selected.
                    if (isCellDestroyed) {
                      return;
                    }
                    // Disabled enemy: cycle weapon targeting ↔ ramming when eligible for both.
                    // NOTE: isMovementTile becomes false once previewPosition is set (movementRange
                    // returns [] when previewPosition is set), so we compute ranges directly from
                    // the ship's actual current position instead of relying on isMovementTile.
                    const isDisabledEnemy =
                      !!selectedShipId &&
                      isCurrentPlayerTurn &&
                      isShipOwnedByCurrentPlayer(selectedShipId) &&
                      !isShipOwnedByCurrentPlayer(cell.shipId) &&
                      (() => {
                        const targetAttrs = getShipAttributes(cell.shipId);
                        return !!targetAttrs && targetAttrs.hullPoints === 0;
                      })();

                    if (isDisabledEnemy) {
                      // Find selected ship's actual current position.
                      // When previewPosition === ship's current cell, the grid overwrites the
                      // original cell with isPreview:true, so the !isPreview scan returns -1.
                      // Fall back to previewPosition in that case.
                      let selRow = -1, selCol = -1;
                      for (let r = 0; r < grid.length && selRow === -1; r++) {
                        for (let c = 0; c < grid[r].length; c++) {
                          const gc = grid[r][c];
                          if (gc?.shipId === selectedShipId && !gc.isPreview) {
                            selRow = r; selCol = c; break;
                          }
                        }
                      }
                      if (selRow === -1 && previewPosition) {
                        selRow = previewPosition.row;
                        selCol = previewPosition.col;
                      }
                      const selAttrs = getShipAttributes(selectedShipId!);
                      const moveRange = selAttrs?.movement || 1;
                      const weapRange = selAttrs?.range || 1;
                      const dist =
                        selRow >= 0
                          ? Math.abs(rowIndex - selRow) + Math.abs(colIndex - selCol)
                          : Infinity;
                      const inMoveRange = dist > 0 && dist <= moveRange;
                      const inWeaponRange = dist === 1 || dist <= weapRange;

                      const alreadyRamming =
                        previewPosition?.row === rowIndex &&
                        previewPosition?.col === colIndex;
                      const previewAtCurrentPos =
                        selRow >= 0 &&
                        previewPosition?.row === selRow &&
                        previewPosition?.col === selCol;
                      const noMoveElsewhere =
                        previewPosition === null || previewAtCurrentPos || alreadyRamming;

                      if (inMoveRange && inWeaponRange && noMoveElsewhere) {
                        if (alreadyRamming && selectedWeaponType !== "ram") {
                          // 2nd click (weapon mode): cycle ramming → weapon targeting
                          if (selRow >= 0) setPreviewPosition({ row: selRow, col: selCol });
                          setTargetShipId(cell.shipId);
                          return;
                        }
                        // Skip ramming when hold is active — ship stays in place, use weapon targeting
                        if (!previewAtCurrentPos) {
                          setPreviewPosition({ row: rowIndex, col: colIndex });
                          setTargetShipId(cell.shipId);
                          return;
                        }
                        // previewAtCurrentPos (hold active): fall through to normal weapon targeting
                      } else if (inMoveRange && noMoveElsewhere && !previewAtCurrentPos) {
                        // In movement range only (not weapon range): ram — but only if
                        // the player hasn't already staged a move somewhere else, and
                        // hold is not active. When a move is staged, fall through so
                        // normal target selection can fire at this ship from the staged
                        // position instead.
                        setPreviewPosition({ row: rowIndex, col: colIndex });
                        setTargetShipId(cell.shipId);
                        return;
                      }
                      // In weapon range only, out of both, or move already staged elsewhere:
                      // fall through to normal targeting
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
                        const isInRepairRange = validTargetIdSet.has(cell.shipId);
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
                        const isInShootingRange = validTargetIdSet.has(cell.shipId);
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
                            setTargetShipId(0n); // Use 0n to indicate area-of-effect
                          } else {
                            // EMP and other specials target individual ships
                            setTargetShipId(cell.shipId);
                          }
                          return;
                        }
                      }

                      // Check if this is a friendly ship with 0 hitpoints that can be assisted
                      const isAssistableTarget = assistableTargetIdSet.has(cell.shipId);
                      const isAssistableFromStart = assistableTargetsFromStartIdSet.has(cell.shipId);
                      if (isAssistableTarget || isAssistableFromStart) {
                        setTargetShipId(cell.shipId);
                        return;
                      }
                    }

                    // If clicking on the same ship: deselect on second click.
                    // Hold Position is an explicit button in the action panel.
                    if (selectedShipId === cell.shipId) {
                      setSelectedShipId(null);
                      setPreviewPosition(null);
                      setTargetShipId(null);
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

                const isHidingDestinationPreview =
                  isHoveringValidTarget && (
                    (previewPosition !== null &&
                      rowIndex === previewPosition.row &&
                      colIndex === previewPosition.col) ||
                    (effectiveDragCell !== null &&
                      rowIndex === effectiveDragCell.row &&
                      colIndex === effectiveDragCell.col)
                  );

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
                        selectedShipId === cell?.shipId && previewPosition && !isHidingDestinationPreview && !cell?.isPreview;
                      // Check if this is the "to" position (preview cell)
                      const isProposedMovePreview =
                        cell?.isPreview &&
                        previewPosition !== null &&
                        selectedShipId !== null;
                      // Show blue background for "from" or "to" positions
                      if (isProposedMoveOriginal || (isProposedMovePreview && !isHidingDestinationPreview)) {
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
                            assistableTargetIdSet.has(cell.shipId) ||
                            assistableTargetsFromStartIdSet.has(cell.shipId);
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
                      if (isSelected && !isHidingDestinationPreview) {
                        if (cell && !isShipOwnedByCurrentPlayer(cell.shipId)) {
                          return "bg-warning-red/20 ring-8 ring-inset ring-warning-red";
                        }
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
                              : "bg-warning-red/10 ring-4 ring-inset ring-warning-red"
                            : isAssistableTarget
                              ? "bg-cyan/10 ring-1 ring-inset ring-cyan"
                              : isMovementTile
                                ? "bg-phosphor-green/10"
                                : "bg-near-black";
                    })()} ${hoveredCell?.fromFleet && hoveredCell.shipId === cell?.shipId ? isShipOwnedByCurrentPlayer(hoveredCell.shipId) ? "ring-2 ring-inset ring-cyan" : "ring-2 ring-inset ring-warning-red" : ""}`}
                    onClick={handleCellClick}
                    onMouseEnter={
                      shouldRenderShipContent
                        ? () => {
                            const ship = shipMap.get(cell.shipId);
                            if (ship) {
                              setHoveredCell({
                                shipId: cell.shipId,
                                row: rowIndex,
                                col: colIndex,
                                isCreator: cell.isCreator,
                              });
                            }
                          }
                        : isMovementTile && !draggedShipId
                          ? () => {
                              const pos = { row: rowIndex, col: colIndex };
                              setHoveredMoveTile(pos);
                              onMoveTileHover?.(pos);
                            }
                          : undefined
                    }
                    onMouseLeave={
                      shouldRenderShipContent
                        ? () => setHoveredCell(null)
                        : isMovementTile && !draggedShipId
                          ? () => {
                              setHoveredMoveTile(null);
                              onMoveTileHover?.(null);
                            }
                          : undefined
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
                      <div className={`absolute inset-0 z-[3] border-1 pointer-events-none ${
                        selectedWeaponType === "special" && specialType === 2
                          ? "border-cyan/50 bg-cyan/10"
                          : "border-amber/50 bg-amber/10"
                      }`} />
                    )}

                    {/* Targeting reticle — corner brackets on the locked-on target cell */}
                    {isSelectedTarget && (
                      <div className="pointer-events-none absolute inset-0 z-[14]" aria-hidden>
                        {(() => {
                          const isRepair = selectedWeaponType === "special" && specialType === 2;
                          const color = isRepair ? "var(--color-cyan)" : "var(--color-warning-red)";
                          return (
                            <svg viewBox="0 0 100 100" className="h-full w-full" style={{ overflow: "visible" }}>
                              <path d="M-4,18 L-4,-4 L18,-4"     fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="square" />
                              <path d="M82,-4 L104,-4 L104,18"   fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="square" />
                              <path d="M-4,82 L-4,104 L18,104"   fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="square" />
                              <path d="M82,104 L104,104 L104,82" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="square" />
                            </svg>
                          );
                        })()}
                      </div>
                    )}

                    {/* Drag/hover range highlight - show range from drag or hovered movement tile */}
                    {effectiveDragCell && (
                      <>
                        {selectedWeaponType !== "ram" && effectiveShootingTileSet.has(`${rowIndex},${colIndex}`) && (
                          <div className={`absolute inset-0 z-[3] border-1 pointer-events-none ${
                            selectedWeaponType === "special" && specialType === 2
                              ? "border-cyan/50 bg-cyan/10"
                              : "border-amber/50 bg-amber/10"
                          }`} />
                        )}
                        {/* Green outline on the drag/hover destination cell */}
                        {effectiveDragCell.row === rowIndex &&
                          effectiveDragCell.col === colIndex &&
                          !isHidingDestinationPreview && (
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
                    {shouldRenderShipContent && ship && !isHidingDestinationPreview ? (
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
                              <div className="px-1 py-0.5 flex items-center justify-center bg-warning-red/60 border border-warning-red">
                                <span className="text-xs leading-none font-mono text-white">[SOS]</span>
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
                          const isForceRetreating = false;
                          const imageClassName = `w-full h-full relative z-0 ${
                            retreatPrepShipId === cell.shipId || isForceRetreating
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

                          // Ramming damages the RAMMING ship's reactor, not the rammed ship's.
                          // Show the +1 preview on the ramming ship at its current (pre-move) cell.
                          const isRammingFromCell =
                            isRammingMovePreview &&
                            cell.shipId === selectedShipId &&
                            !cell.isPreview;
                          const previewReactorLevel =
                            attributes.reactorCriticalTimer +
                            (isRammingFromCell ? 1 : 0);
                          if (previewReactorLevel <= 0) return null;
                          const skullCount = Math.min(previewReactorLevel, 3);
                          const skullLevels = Array.from(
                            { length: skullCount },
                            (_, index) => index,
                          );

                          const skullAnchorIsCreator = cell.isCreator;
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
                              {skullLevels.map((level) => {
                                const isNewFromRam =
                                  isRammingFromCell && level === skullCount - 1;
                                return (
                                  <div
                                    key={level}
                                    className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-warning-red/90 leading-none${isNewFromRam ? " animate-pulse" : ""}`}
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
                                );
                              })}
                            </div>
                          );
                        })()}
                        {/* Hold position button: bottom of the "from" cell when ship is selected */}
                        {(() => {
                          if (cell.isPreview) return null;
                          if (selectedShipId !== cell.shipId) return null;
                          if (!isCurrentPlayerTurn || !isShipOwnedByCurrentPlayer(cell.shipId)) return null;
                          if (movedShipIdsSet.has(cell.shipId)) return null;
                          const holdAttrs = getShipAttributes(cell.shipId);
                          if (holdAttrs && holdAttrs.hullPoints === 0) return null;

                          const isHoldActive =
                            previewPosition !== null &&
                            previewPosition.row === rowIndex &&
                            previewPosition.col === colIndex &&
                            !isRammingMovePreview;

                          return (
                            <button
                              type="button"
                              className="absolute bottom-0 left-0 right-0 z-[25] pointer-events-auto flex items-center justify-center uppercase font-bold tracking-wider transition-colors duration-100"
                              style={{
                                fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                                fontSize: "clamp(5px, 1.2vmin, 10px)",
                                padding: "clamp(1px, 0.6vmin, 4px) 0",
                                color: isHoldActive ? "var(--color-cyan)" : "var(--color-text-muted)",
                                backgroundColor: isHoldActive
                                  ? "color-mix(in srgb, var(--color-cyan) 14%, var(--color-slate))"
                                  : "var(--color-slate)",
                                borderTop: "1px solid var(--color-gunmetal)",
                                borderRadius: 0,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isHoldActive) {
                                  setPreviewPosition(null);
                                  setTargetShipId(null);
                                } else {
                                  setPreviewPosition({ row: rowIndex, col: colIndex });
                                  setTargetShipId(null);
                                  setSelectedWeaponType("weapon");
                                }
                              }}
                            >
                              HOLD
                            </button>
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
                const proposedDestination = effectiveDragCell ?? previewPosition;
                const useProposedMoveArrow =
                  selectedShipId !== null && proposedDestination !== null && !isHoveringValidTarget && retreatPrepShipId == null;

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
                  : (allShipPositions?.find((sp) => sp.shipId === movingShipId)?.position ?? null);

                if (!fromPos) return null;
                if (
                  fromPos.row === destination.row &&
                  fromPos.col === destination.col
                ) {
                  return null;
                }

                const arrowColor =
                  useProposedMoveArrow &&
                  selectedShipId != null &&
                  !isShipOwnedByCurrentPlayer(selectedShipId)
                    ? "#6b7280"
                    : "#facc15";

                // All coordinates in cell units (col, row) — no DOM measurements.
                // viewBox="0 0 17 11" maps 1 unit = 1 cell, immune to zoom transforms.
                const GRID_COLS = 17;
                const GRID_ROWS = 11;
                const arrowHeadLength = 0.361;  // cell units ≈ half a cell
                const arrowStrokeWidth = 0.12; // cell units ≈ 6px at 50px/cell
                const startOutsideOffset = arrowStrokeWidth / 2 + 0.02;

                // Cell bounds in cell units: integer edges, half-integer centers.
                const cellBounds = (r: number, c: number) => ({
                  left: c, right: c + 1, top: r, bottom: r + 1,
                  cx: c + 0.5, cy: r + 0.5, w: 1, h: 1,
                });

                const deltaRow = destination.row - fromPos.row;
                const deltaCol = destination.col - fromPos.col;
                const isOneStepMove =
                  Math.abs(deltaRow) + Math.abs(deltaCol) === 1;

                if (isOneStepMove) {
                  const leftCol = Math.min(fromPos.col, destination.col);
                  const upperRow = Math.min(fromPos.row, destination.row);
                  const sharedEdge = deltaCol !== 0
                    ? { x: leftCol + 1, y: fromPos.row + 0.5 }
                    : { x: fromPos.col + 0.5, y: upperRow + 1 };

                  // Right-pointing triangle (tip +x), centroid at origin, size = arrowHeadLength.
                  const hs = arrowHeadLength / 2;
                  const raw = [{ x: 0, y: -hs }, { x: 0, y: hs }, { x: arrowHeadLength, y: 0 }];
                  const cx = arrowHeadLength / 3;
                  const locals = raw.map(v => ({ x: v.x - cx, y: v.y }));

                  const mapLocalToWorld = (lx: number, ly: number) => {
                    const mx = sharedEdge.x, my = sharedEdge.y;
                    if (deltaCol === 1)  return { x: mx + lx, y: my + ly };
                    if (deltaCol === -1) return { x: mx - lx, y: my - ly };
                    if (deltaRow === 1)  return { x: mx + ly, y: my + lx };
                    return { x: mx - ly, y: my - lx };
                  };
                  const [p0, p1, p2] = locals.map(p => mapLocalToWorld(p.x, p.y));
                  const pathD = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} Z`;

                  return (
                    <svg
                      className="absolute left-0 top-0 w-full h-full overflow-visible pointer-events-none"
                      viewBox={`0 0 ${GRID_COLS} ${GRID_ROWS}`}
                      preserveAspectRatio="none"
                    >
                      <path d={pathD} fill={arrowColor} />
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
                  const fromR = cellBounds(fromPos.row, fromPos.col);
                  const destR = cellBounds(destination.row, destination.col);
                  start = {
                    x: firstDirCol > 0 ? fromR.right + startOutsideOffset : fromR.left - startOutsideOffset,
                    y: fromR.cy,
                  };
                  turnPoint = { x: destR.cx, y: start.y };
                  tip = { x: destR.cx, y: destR.cy - (secondDirRow * destR.h) / 2 };
                  // When deltaRow=1 the vertical space equals arrowHeadLength exactly, collapsing
                  // the shaft to zero and breaking marker orientation. Clamp to leave a small shaft.
                  const vertAvail = Math.abs(tip.y - turnPoint.y);
                  const headY = Math.min(arrowHeadLength, vertAvail - 0.05);
                  lineEnd = { x: tip.x, y: tip.y - secondDirRow * headY };
                } else if (fromPos.row === destination.row) {
                  const dirCol = Math.sign(destination.col - fromPos.col);
                  const fromR = cellBounds(fromPos.row, fromPos.col);
                  const destR = cellBounds(destination.row, destination.col);
                  start = {
                    x: dirCol > 0 ? fromR.right + startOutsideOffset : fromR.left - startOutsideOffset,
                    y: fromR.cy,
                  };
                  tip = { x: dirCol > 0 ? destR.left : destR.right, y: destR.cy };
                  lineEnd = { x: tip.x - dirCol * arrowHeadLength, y: tip.y };
                } else {
                  const dirRow = Math.sign(destination.row - fromPos.row);
                  const fromR = cellBounds(fromPos.row, fromPos.col);
                  const destR = cellBounds(destination.row, destination.col);
                  start = {
                    x: fromR.cx,
                    y: dirRow > 0 ? fromR.bottom + startOutsideOffset : fromR.top - startOutsideOffset,
                  };
                  tip = { x: destR.cx, y: destR.cy - (dirRow * destR.h) / 2 };
                  lineEnd = { x: tip.x, y: tip.y - dirRow * arrowHeadLength };
                }

                const pathD =
                  turnPoint
                    ? `M ${start.x} ${start.y} L ${turnPoint.x} ${turnPoint.y} L ${lineEnd.x} ${lineEnd.y}`
                    : `M ${start.x} ${start.y} L ${lineEnd.x} ${lineEnd.y}`;

                return (
                  <svg
                    className="absolute left-0 top-0 w-full h-full overflow-visible pointer-events-none"
                    viewBox={`0 0 ${GRID_COLS} ${GRID_ROWS}`}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <marker
                        id="wf-move-arrow-head"
                        viewBox="0 0 10 10"
                        refX="0"
                        refY="5"
                        markerWidth={arrowHeadLength}
                        markerHeight={arrowHeadLength}
                        markerUnits="userSpaceOnUse"
                        orient="auto"
                      >
                        <path d="M 0 0 L 0 10 L 10 5 z" fill={arrowColor} />
                      </marker>
                    </defs>
                    <path
                      d={pathD}
                      stroke={arrowColor}
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
              (selectedWeaponType === "weapon" || (!selectedShipId && (lastMoveActionType as ActionType) === ActionType.Shoot)) &&
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

                // Creator ships face right, joiner ships face left.
                const attackerIsCreator =
                  selectedShipCreatorSide ??
                  grid[attackerRow]?.[attackerCol]?.isCreator ??
                  false;

                return (
                  <LaserShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                    facingRight={attackerIsCreator}
                  />
                );
              })()}

            {/* Missile Shooting Animation */}
            {(selectedShipId || lastMoveShipId) &&
              directedWeaponBeamTargetId &&
              (selectedWeaponType === "weapon" || (!selectedShipId && (lastMoveActionType as ActionType) === ActionType.Shoot)) &&
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

                const attackerIsCreator =
                  selectedShipCreatorSide ??
                  grid[attackerRow]?.[attackerCol]?.isCreator ??
                  false;

                return (
                  <MissileShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                    facingRight={attackerIsCreator}
                  />
                );
              })()}

            {/* Plasma Shooting Animation */}
            {(selectedShipId || lastMoveShipId) &&
              directedWeaponBeamTargetId &&
              (selectedWeaponType === "weapon" || (!selectedShipId && (lastMoveActionType as ActionType) === ActionType.Shoot)) &&
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

                const attackerIsCreator =
                  selectedShipCreatorSide ??
                  grid[attackerRow]?.[attackerCol]?.isCreator ??
                  false;

                return (
                  <PlasmaShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                    facingRight={attackerIsCreator}
                  />
                );
              })()}

            {/* Railgun Shooting Animation */}
            {(selectedShipId || lastMoveShipId) &&
              directedWeaponBeamTargetId &&
              (selectedWeaponType === "weapon" || (!selectedShipId && (lastMoveActionType as ActionType) === ActionType.Shoot)) &&
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

                const attackerIsCreator =
                  selectedShipCreatorSide ??
                  grid[attackerRow]?.[attackerCol]?.isCreator ??
                  false;

                return (
                  <RailgunShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                    facingRight={attackerIsCreator}
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
            {(() => {
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

                const shouldShowRammingLabels =
                  (isRammingMovePreview && rammingPreviewPosition != null) ||
                  (lastMoveActionNum === ActionType.Ram &&
                    lastMoveNewPosition != null &&
                    lastMoveNewPosition.row >= 0 &&
                    lastMoveNewPosition.col >= 0);
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

                // Disabled enemies in movement range: show ram labels before the move is staged.
                const ramPreviewTargets: { row: number; col: number }[] = (() => {
                  if (
                    selectedWeaponType !== "ram" ||
                    !selectedShipId ||
                    previewPosition ||
                    !isCurrentPlayerTurn
                  ) return [];
                  const targets: { row: number; col: number }[] = [];
                  for (let r = 0; r < grid.length; r++) {
                    for (let c = 0; c < grid[r].length; c++) {
                      const cell = grid[r][c];
                      if (!cell || cell.isPreview) continue;
                      if (isShipOwnedByCurrentPlayer(cell.shipId)) continue;
                      const attrs = getShipAttributes(cell.shipId);
                      if (!attrs || attrs.hullPoints > 0) continue;
                      if (!movementTileSet.has(`${r},${c}`)) continue;
                      targets.push({ row: r, col: c });
                    }
                  }
                  return targets;
                })();

                if (
                  targetsToShow.length === 0 &&
                  !shouldShowRammingLabels &&
                  !shouldShowHoldPositionLabel &&
                  ramPreviewTargets.length === 0
                )
                  return null;

                // Pure cell-unit positioning — no DOM measurements, immune to zoom transforms.
                const cellCx  = (col: number) => `${((col + 0.5) / 17) * 100}%`;
                const cellTopPct    = (row: number) => `${(row / 11) * 100}%`;
                const cellBottomPct = (row: number) => `${((row + 1) / 11) * 100}%`;
                // Labels sit above cell (non-top rows) or below cell (row 0).
                const anchorTop = (row: number) => row === 0 ? cellBottomPct(row) : cellTopPct(row);
                const anchorTransform = (row: number) => row === 0 ? "translate(-50%, 0)" : "translate(-50%, -100%)";

                return (
                  <div className="absolute inset-0 pointer-events-none z-40">
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
                        selectedWeaponType === "ram" ? "weapon" : selectedWeaponType,
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
                                ? "bg-amber/60 border border-amber" // Flak
                                : specialType === 1 // EMP
                                  ? "bg-warning-red/60 border border-warning-red" // EMP reactor damage
                                  : "bg-cyan/60 border border-cyan" // Other specials
                              : "bg-warning-red/60 border border-warning-red"
                          }`}
                          style={{
                            left: cellCx(target.col),
                            top: anchorTop(target.row),
                            transform: anchorTransform(target.row),
                          }}
                        >
                          {labelText}
                        </div>
                      );
                    })}
                    {(() => {
                      // Staged ram preview labels
                      if (!isRammingMovePreview || !rammingPreviewPosition) {
                        return null;
                      }
                      const { row, col } = rammingPreviewPosition;
                      const isTopGridRow = row === 0;
                      const top = isTopGridRow ? cellBottomPct(row) : cellTopPct(row);
                      return (
                        <>
                          <div
                            className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-white whitespace-nowrap border border-warning-red bg-warning-red/60"
                            style={{
                              left: cellCx(col),
                              top,
                              transform: isTopGridRow ? "translate(-50%, 0)" : "translate(-50%, calc(-100% - 30px))",
                            }}
                          >
                            RAMMING SPEED
                          </div>
                          <div
                            className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-white whitespace-nowrap flex items-center gap-1"
                            style={{
                              left: cellCx(col),
                              top,
                              transform: anchorTransform(row),
                              backgroundColor: "rgba(255, 119, 0, 0.75)",
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor: "#ff7700",
                            }}
                          >
                            <span className="flex shrink-0 items-center justify-center rounded-full bg-warning-red/90 leading-none" style={{ width: 10, height: 10, fontSize: 7 }}>✕</span>
                            WARNING: OVERLOAD
                            <span className="flex shrink-0 items-center justify-center rounded-full bg-warning-red/90 leading-none" style={{ width: 10, height: 10, fontSize: 7 }}>✕</span>
                          </div>
                        </>
                      );
                    })()}
                    {(() => {
                      // Last-move ram labels — same two labels as staged preview, at the to-position
                      if (
                        lastMoveActionNum !== ActionType.Ram ||
                        !lastMoveNewPosition ||
                        lastMoveNewPosition.row < 0 ||
                        lastMoveNewPosition.col < 0
                      ) {
                        return null;
                      }
                      const { row, col } = lastMoveNewPosition;
                      const isTopGridRow = row === 0;
                      const top = isTopGridRow ? cellBottomPct(row) : cellTopPct(row);
                      return (
                        <>
                          <div
                            className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-white whitespace-nowrap border border-warning-red bg-warning-red/60"
                            style={{
                              left: cellCx(col),
                              top,
                              transform: isTopGridRow ? "translate(-50%, 0)" : "translate(-50%, calc(-100% - 30px))",
                            }}
                          >
                            RAMMING SPEED
                          </div>
                          <div
                            className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-white whitespace-nowrap flex items-center gap-1"
                            style={{
                              left: cellCx(col),
                              top,
                              transform: anchorTransform(row),
                              backgroundColor: "rgba(255, 119, 0, 0.75)",
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor: "#ff7700",
                            }}
                          >
                            <span className="flex shrink-0 items-center justify-center rounded-full bg-warning-red/90 leading-none" style={{ width: 10, height: 10, fontSize: 7 }}>✕</span>
                            WARNING: OVERLOAD
                            <span className="flex shrink-0 items-center justify-center rounded-full bg-warning-red/90 leading-none" style={{ width: 10, height: 10, fontSize: 7 }}>✕</span>
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
                      const { row, col } = lastMoveNewPosition;
                      return (
                        <div
                          className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-amber whitespace-nowrap border border-amber bg-amber/60"
                          style={{
                            left: cellCx(col),
                            top: anchorTop(row),
                            transform: anchorTransform(row),
                          }}
                        >
                          Hold Position
                        </div>
                      );
                    })()}
                    {ramPreviewTargets.map(({ row, col }) => {
                      const isTopGridRow = row === 0;
                      const top = isTopGridRow ? cellBottomPct(row) : cellTopPct(row);
                      return (
                        <React.Fragment key={`ram-preview-${row}-${col}`}>
                          <div
                            className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-white whitespace-nowrap border border-warning-red bg-warning-red/60"
                            style={{
                              left: cellCx(col),
                              top,
                              transform: isTopGridRow ? "translate(-50%, 0)" : "translate(-50%, calc(-100% - 30px))",
                            }}
                          >
                            RAMMING SPEED
                          </div>
                          <div
                            className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-white whitespace-nowrap flex items-center gap-1"
                            style={{
                              left: cellCx(col),
                              top,
                              transform: anchorTransform(row),
                              backgroundColor: "rgba(255, 119, 0, 0.75)",
                              borderWidth: 1,
                              borderStyle: "solid",
                              borderColor: "#ff7700",
                            }}
                          >
                            <span className="flex shrink-0 items-center justify-center rounded-full bg-warning-red/90 leading-none" style={{ width: 10, height: 10, fontSize: 7 }}>✕</span>
                            WARNING: OVERLOAD
                            <span className="flex shrink-0 items-center justify-center rounded-full bg-warning-red/90 leading-none" style={{ width: 10, height: 10, fontSize: 7 }}>✕</span>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })()}

            {/* Tutorial "Click here": grid-level z-[60] so it appears above damage labels (z-40).
                Same vertical rules as damage labels: above the cell except row 0 (below). Nudge up when
                a damage label shares the cell on non-top rows. */}
            {(() => {
              if (!tutorialHighlightCells?.length) return null;

              // Pure cell-unit positioning — no DOM measurements, immune to zoom transforms.
              const cellCx  = (col: number) => `${((col + 0.5) / 17) * 100}%`;
              const cellTopPct    = (row: number) => `${(row / 11) * 100}%`;
              const cellBottomPct = (row: number) => `${((row + 1) / 11) * 100}%`;

              return (
                <div className="absolute inset-0 pointer-events-none z-[60]">
                  {tutorialHighlightCells.map((p, i) => {
                    if (p.hideLabel) return null;
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
                    // Stack below damage label when both sit under row 0.
                    const top = isTopGridRow ? cellBottomPct(p.row) : cellTopPct(p.row);
                    const transform = isTopGridRow
                      ? `translate(-50%, ${damageLabelOnThisShip ? "28px" : "0"})`
                      : `translate(-50%, calc(-100%${damageLabelOnThisShip ? " - 32px" : ""}))`;
                    return (
                      <div
                        key={`tutorial-click-${p.row}-${p.col}-${i}`}
                        className="absolute rounded-none px-2 py-1 text-xs font-mono text-center text-amber whitespace-nowrap bg-amber/60 border border-amber"
                        style={{
                          left: cellCx(p.col),
                          top,
                          transform,
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

          {/* Floating weapon selector — appears above selected ship; stays visible when targeting */}
          {(() => {
            const hasRealTarget = targetShipId != null && targetShipId !== 0n;
            // Hide only when confirm widget is showing without a real target (confirm widget embeds selector then)
            if (showConfirmWidget && !hasRealTarget) return null;
            if (!selectedShipId || !isCurrentPlayerTurn) return null;
            if (!isShipOwnedByCurrentPlayer(selectedShipId)) return null;
            if (isRammingMovePreview) return null;
            const ship = shipMap.get(selectedShipId);
            if (!ship) return null;

            // Find the ship's current (non-preview) cell position
            let shipRow = -1, shipCol = -1;
            outer: for (let r = 0; r < grid.length; r++) {
              for (let c = 0; c < grid[r].length; c++) {
                const cell = grid[r][c];
                if (cell?.shipId === selectedShipId && !cell.isPreview) {
                  shipRow = r; shipCol = c; break outer;
                }
              }
            }
            if (shipRow < 0 && allShipPositions) {
              const sp = allShipPositions.find(p => p.shipId === selectedShipId);
              if (sp) { shipRow = sp.position.row; shipCol = sp.position.col; }
            }
            if (shipRow < 0) return null;

            const hasSpecial = ship.equipment.special > 0;
            const hasRamTarget = movementRange.some(({ row: r, col: c }) => {
              const cell = grid[r]?.[c];
              if (!cell || cell.isPreview) return false;
              if (isShipOwnedByCurrentPlayer(cell.shipId)) return false;
              return (getShipAttributes(cell.shipId)?.hullPoints ?? 1) === 0;
            });
            const weapons: { value: "weapon" | "special" | "ram"; label: string }[] = [
              ...(hasRamTarget ? [{ value: "ram" as const, label: "RAM" }] : []),
              { value: "weapon", label: getMainWeaponName(ship.equipment.mainWeapon) },
              ...(hasSpecial ? [{ value: "special" as const, label: getSpecialName(ship.equipment.special) }] : []),
            ];
            if (weapons.length <= 1) return null; // only one option — nothing to choose

            // When a move is staged, anchor to the destination (same origin as the laser beam);
            // otherwise anchor to the ship's current (from) cell.
            const anchorRow = previewPosition ? previewPosition.row : shipRow;
            const anchorCol = previewPosition ? previewPosition.col : shipCol;
            const isTopRow = anchorRow === 0;
            const left = `${((anchorCol + 0.5) / 17) * 100}%`;
            const top = isTopRow ? `${((anchorRow + 1) / 11) * 100}%` : `${(anchorRow / 11) * 100}%`;
            const transform = isTopRow ? "translate(-50%, 4px)" : "translate(-50%, calc(-100% - 4px))";

            return (
              <div
                className="absolute z-[195] pointer-events-auto"
                style={{ left, top, transform }}
              >
                <div
                  className="flex"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--color-near-black) 96%, transparent)",
                    border: "2px solid var(--color-gunmetal)",
                    borderTopColor: "var(--color-cyan)",
                    borderLeftColor: "var(--color-steel)",
                    borderRadius: 0,
                    filter: "drop-shadow(0 2px 8px color-mix(in srgb, var(--color-cyan) 25%, transparent))",
                  }}
                >
                  {weapons.map(({ value, label }, idx) => {
                    const isActive = selectedWeaponType === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setSelectedWeaponType(value);
                          if (value === "special" && specialType === 3) {
                            setTargetShipId(0n);
                          } else if (selectedWeaponType === "special" && specialType === 3) {
                            setTargetShipId(null);
                          }
                        }}
                        className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider transition-colors duration-100"
                        style={{
                          fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                          color: isActive ? "var(--color-cyan)" : "var(--color-text-muted)",
                          backgroundColor: isActive
                            ? "color-mix(in srgb, var(--color-cyan) 14%, transparent)"
                            : "transparent",
                          borderRight: idx < weapons.length - 1 ? "1px solid var(--color-gunmetal)" : "none",
                          borderRadius: 0,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {showConfirmWidget && previewPosition && onConfirmMove && onCancelMove && confirmWidgetAnchor && (
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
          )}
        </div>
      </div>
    </>
  );
}
