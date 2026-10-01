"use client";

import React, { useRef, useState } from "react";
import { Attributes, ActionType } from "../types/types";
import { GridShip, GridShipPosition } from "../types/gridDisplay";
import { useGridCellSets } from "../hooks/useGridCellSets";
import { useGridPanZoom } from "../hooks/useGridPanZoom";
import { useGridEffectPreviews } from "../hooks/useGridEffectPreviews";
import { computeConfirmWidgetAnchor, selectedShipHasEffectLabel } from "../utils/gameGridRanges";
import { GameGridCell } from "./GameGridCell";
import { GameGridOverlays } from "./GameGridOverlays";
import { GameGridTooltip, GameGridTooltipHoveredCell } from "./GameGridTooltip";
import { GameGridWeaponSelector } from "./GameGridWeaponSelector";
import { GameGridConfirmWidget } from "./GameGridConfirmWidget";

const EMPTY_SHIP_ID_SET: Set<number> = new Set();
const EMPTY_RANGE_CELLS: Array<{ row: number; col: number }> = [];
const EMPTY_TARGET_REFS: Array<{
  shipId: number;
  position: { row: number; col: number };
}> = [];

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


interface GameGridProps {
  grid: (GridShipPosition | null)[][];
  allShipPositions?: readonly GridShipPosition[];
  shipMap: Map<number, GridShip>;
  selectedShipId: number | null;
  previewPosition: { row: number; col: number } | null;
  targetShipId: number | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  hoveredCell: {
    shipId: number;
    row: number;
    col: number;
    isCreator: boolean;
    fromFleet?: boolean;
  } | null;
  draggedShipId: number | null;
  dragOverCell: { row: number; col: number } | null;
  movementRange: Array<{ row: number; col: number }>;
  shootingRange: Array<{ row: number; col: number }>;
  validTargets: Array<{
    shipId: number;
    position: { row: number; col: number };
  }>;
  labelTargets?: Array<{
    shipId: number;
    position: { row: number; col: number };
  }>; // Optional: when provided (GameDisplay), used for damage labels; otherwise fall back to validTargets
  assistableTargets: Array<{
    shipId: number;
    position: { row: number; col: number };
  }>;
  assistableTargetsFromStart: Array<{
    shipId: number;
    position: { row: number; col: number };
  }>;
  dragShootingRange: Array<{ row: number; col: number }>;
  dragValidTargets: Array<{
    shipId: number;
    position: { row: number; col: number };
  }>;
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  movedShipIdsSet: Set<number>;
  specialType: number;
  specialRange?: number;
  blockedGrid: boolean[][];
  /** Movement-blocking terrain, independent of blockedGrid's LOS-only blocking. Optional — omitted renders no impassable-terrain overlay. */
  impassableGrid?: boolean[][];
  scoringGrid: number[][];
  onlyOnceGrid: boolean[][];
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
  getShipAttributes: (shipId: number) => Attributes | null;
  disableTooltips: boolean;
  address: string | undefined;
  currentTurn: string;
  highlightedMovePosition?: { row: number; col: number } | null;
  lastMoveShipId?: number | null;
  lastMoveOldPosition?: { row: number; col: number } | null; // Old position for last move preview
  // New position for the last move (to position). When playing back weapon
  // effects for the last move, the beam should originate from this "to"
  // position rather than the old position.
  lastMoveNewPosition?: { row: number; col: number } | null;
  /** Last mover's to-tile for weapon-effect aiming, even when last-move chrome is hidden. */
  lastMoveResolvedTo?: { shipId: number; row: number; col: number } | null;
  lastMoveActionType?: ActionType | null; // When Retreat, show warp collapse at old position
  lastMoveTargetShipId?: number | null;
  lastMoveIsCurrentPlayer?: boolean | undefined; // true = blue outline, false = red outline
  /** Ramming preview destination tile. */
  rammingPreviewPosition?: { row: number; col: number } | null;
  /** True when the staged move is a ramming move. */
  isRammingMovePreview?: boolean;
  /** See useFactionAbilityConfig.ts — gates the real Ram/Repair targeting flow vs. the legacy auto-ram chains still run. */
  isFactionAbilitySupported?: boolean;
  factionAbilityRange?: number | undefined;
  factionAbilityIsHeal?: boolean;
  factionAbilityStrength?: number;
  /** When set, last-move EMP replay still shows while a ship is selected (e.g. tutorial ship-destruction). */
  showLastMoveEmpReplayWhenSelected?: boolean;
  retreatPrepShipId?: number | null;
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
  setSelectedShipId: (shipId: number | null) => void;
  setPreviewPosition: (position: { row: number; col: number } | null) => void;
  setTargetShipId: (shipId: number | null) => void;
  setSelectedWeaponType: (type: "weapon" | "special" | "ram") => void;
  setHoveredCell: (
    cell: {
      shipId: number;
      row: number;
      col: number;
      isCreator: boolean;
      fromFleet?: boolean;
    } | null,
  ) => void;
  setDraggedShipId: (shipId: number | null) => void;
  setDragOverCell: (cell: { row: number; col: number } | null) => void;
  /** Shooting-range overlay from the hovered movement tile (parent-computed). */
  hoverShootingRange?: Array<{ row: number; col: number }>;
  /** Valid targets from the hovered movement tile (parent-computed). */
  hoverValidTargets?: Array<{ shipId: number; position: { row: number; col: number } }>;
  /** Called when the pointer enters or leaves a movement tile (passes null on leave). */
  onMoveTileHover?: (cell: { row: number; col: number } | null) => void;
  showConfirmWidget?: boolean;
  confirmWidgetLabel?: string;
  onConfirmMove?: () => void;
  onCancelMove?: () => void;
  confirmButton?: React.ReactNode;
  /**
   * Ships that a submitted shot will put into SOS. Show live SOS art (not
   * hologram) until chain/server attributes confirm 0 HP.
   */
  optimisticSosShipIds?: Set<number>;
  /** True while the current move tx/request is in flight. */
  isSubmitting?: boolean;
  /**
   * Builds the tooltip's ship-card content for the hovered cell. Delegated
   * to the caller because building `ShipCard`'s `ShipCardData`/`shipImage`
   * props from a raw `Ship`/`Web2Ship` is mode-specific. See
   * `GameGridTooltip`.
   */
  renderShipCard: (hoveredCell: GameGridTooltipHoveredCell) => React.ReactNode | null;
}

export const GameGrid = React.memo(function GameGrid({
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
  specialRange,
  blockedGrid,
  impassableGrid,
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
  lastMoveResolvedTo,
  lastMoveActionType,
  lastMoveTargetShipId,
  lastMoveIsCurrentPlayer,
  rammingPreviewPosition = null,
  isRammingMovePreview = false,
  isFactionAbilitySupported = false,
  factionAbilityRange,
  factionAbilityIsHeal = false,
  factionAbilityStrength,
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
  hoverShootingRange = EMPTY_RANGE_CELLS,
  hoverValidTargets = EMPTY_TARGET_REFS,
  onMoveTileHover,
  showConfirmWidget = false,
  confirmWidgetLabel = "SUBMIT",
  onConfirmMove,
  onCancelMove,
  confirmButton,
  optimisticSosShipIds = EMPTY_SHIP_ID_SET,
  isSubmitting = false,
  renderShipCard,
}: GameGridProps) {
  const { outerWrapperRef, gridContainerRef, zoom } = useGridPanZoom();
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
    : EMPTY_RANGE_CELLS;
  const effectiveValidTargets: Array<{ shipId: number; position: { row: number; col: number } }> =
    effectiveDragCell
      ? (draggedShipId ? dragValidTargets : hoverValidTargets)
      : EMPTY_TARGET_REFS;

  /** Re-render on grid container resize so ship tooltips stay aligned with cells. */
  const [, setGridLayoutVersion] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = gridContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let lastW = el.clientWidth;
    let lastH = el.clientHeight;
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect;
      const w = next?.width ?? el.clientWidth;
      const h = next?.height ?? el.clientHeight;
      if (Math.abs(w - lastW) < 0.5 && Math.abs(h - lastH) < 0.5) return;
      lastW = w;
      lastH = h;
      setGridLayoutVersion((v) => v + 1);
    });
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

  const {
    directedWeaponBeamTargetId,
    flakEffectCells,
    projectedDamageByShipId,
    projectedRepairByShipId,
    destroyPreviewShipIds,
    sosPreviewShipIds,
    findShipPositionById,
  } = useGridEffectPreviews({
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
    shipVariant: selectedShipId != null ? shipMap.get(selectedShipId)?.traits.variant : undefined,
    specialRange,
    isCurrentPlayerTurn,
    isShipOwnedByCurrentPlayer,
    lastMoveTargetShipId,
    lastMoveShipId,
    lastMoveNewPosition,
    lastMoveResolvedTo,
    factionAbilityIsHeal,
    factionAbilityStrength,
    calculateDamage,
    getShipAttributes,
  });

  // Compute the best placement for the confirm widget to avoid covering the target ship,
  // weapon beam path, and move arrow. See computeConfirmWidgetAnchor for the algorithm.
  const isHoldPreviewActive = React.useMemo(() => {
    if (selectedShipId == null || previewPosition == null || isRammingMovePreview) {
      return false;
    }
    let fromRow = -1;
    let fromCol = -1;
    outer: for (let r = 0; r < grid.length; r++) {
      const row = grid[r] ?? [];
      for (let c = 0; c < row.length; c++) {
        const cell = row[c];
        if (cell?.shipId === selectedShipId && !cell.isPreview) {
          fromRow = r;
          fromCol = c;
          break outer;
        }
      }
    }
    if (fromRow < 0) {
      fromRow = previewPosition.row;
      fromCol = previewPosition.col;
    }
    return fromRow === previewPosition.row && fromCol === previewPosition.col;
  }, [selectedShipId, previewPosition, isRammingMovePreview, grid]);

  const selfHasEffectLabel = selectedShipHasEffectLabel({
    selectedShipId,
    targetShipId,
    selectedWeaponType,
    specialType,
    shipVariant: selectedShipId != null ? shipMap.get(selectedShipId)?.traits.variant : undefined,
    factionAbilityIsHeal,
  });
  const [confirmWidgetVertical, setConfirmWidgetVertical] = React.useState<
    "above" | "below" | null
  >(null);
  React.useEffect(() => {
    setConfirmWidgetVertical(null);
  }, [selectedShipId, previewPosition?.row, previewPosition?.col, targetShipId]);
  const confirmWidgetAnchor = React.useMemo(
    () => computeConfirmWidgetAnchor({
      showConfirmWidget,
      previewPosition,
      selectedShipId,
      targetShipId,
      grid,
      allShipPositions,
      selfHasEffectLabel,
      preferredVertical: confirmWidgetVertical,
    }),
    [showConfirmWidget, previewPosition, selectedShipId, targetShipId, grid, allShipPositions, selfHasEffectLabel, confirmWidgetVertical],
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
  const overlayDestination = effectiveDragCell ?? previewPosition;
  const isHoveringDestinationAsValidTarget =
    isHoveringValidTarget &&
    hoveredCell !== null &&
    overlayDestination !== null &&
    hoveredCell.row === overlayDestination.row &&
    hoveredCell.col === overlayDestination.col;

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
              row.map((cell, colIndex) => (
                <GameGridCell
                  key={`cell-${rowIndex}-${colIndex}`}
                  cell={cell}
                  rowIndex={rowIndex}
                  colIndex={colIndex}
                  grid={grid}
                  shipMap={shipMap}
                  selectedShipId={selectedShipId}
                  previewPosition={previewPosition}
                  targetShipId={targetShipId}
                  selectedWeaponType={selectedWeaponType}
                  isHoveringThisCellAsValidTarget={
                    isHoveringValidTarget &&
                    hoveredCell !== null &&
                    hoveredCell.row === rowIndex &&
                    hoveredCell.col === colIndex
                  }
                  isFleetHoveredShip={Boolean(
                    hoveredCell?.fromFleet &&
                      cell != null &&
                      hoveredCell.shipId === cell.shipId,
                  )}
                  draggedShipId={draggedShipId}
                  assistableTargets={assistableTargets}
                  assistableTargetsFromStart={assistableTargetsFromStart}
                  isCurrentPlayerTurn={isCurrentPlayerTurn}
                  isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
                  movedShipIdsSet={movedShipIdsSet}
                  specialType={specialType}
                  blockedGrid={blockedGrid}
                  impassableGrid={impassableGrid}
                  scoringGrid={scoringGrid}
                  onlyOnceGrid={onlyOnceGrid}
                  getShipAttributes={getShipAttributes}
                  address={address}
                  highlightedMovePosition={highlightedMovePosition}
                  lastMoveShipId={lastMoveShipId}
                  lastMoveOldPosition={lastMoveOldPosition}
                  lastMoveNewPosition={lastMoveNewPosition}
                  lastMoveActionType={lastMoveActionType}
                  lastMoveTargetShipId={lastMoveTargetShipId}
                  lastMoveIsCurrentPlayer={lastMoveIsCurrentPlayer}
                  isRammingMovePreview={isRammingMovePreview}
                  isHoldPreviewActive={isHoldPreviewActive}
                  factionAbilityIsHeal={factionAbilityIsHeal}
                  retreatPrepShipId={retreatPrepShipId}
                  retreatPrepIsCreator={retreatPrepIsCreator}
                  isMyTurn={isMyTurn}
                  movementTileSet={movementTileSet}
                  shootingTileSet={shootingTileSet}
                  tutorialHighlightKeySet={tutorialHighlightKeySet}
                  effectiveDragCell={effectiveDragCell}
                  effectiveShootingTileSet={effectiveShootingTileSet}
                  effectiveValidTargetIdSet={effectiveValidTargetIdSet}
                  validTargetIdSet={validTargetIdSet}
                  assistableTargetIdSet={assistableTargetIdSet}
                  assistableTargetsFromStartIdSet={assistableTargetsFromStartIdSet}
                  lastMoveActionNum={lastMoveActionNum}
                  projectedDamageByShipId={projectedDamageByShipId}
                  projectedRepairByShipId={projectedRepairByShipId}
                  destroyPreviewShipIds={destroyPreviewShipIds}
                  sosPreviewShipIds={sosPreviewShipIds}
                  optimisticSosShipIds={optimisticSosShipIds}
                  isSubmitting={isSubmitting}
                  lastDragOverCellRef={lastDragOverCellRef}
                  setSelectedShipId={setSelectedShipId}
                  setPreviewPosition={setPreviewPosition}
                  setTargetShipId={setTargetShipId}
                  setSelectedWeaponType={setSelectedWeaponType}
                  setHoveredCell={setHoveredCell}
                  setDraggedShipId={setDraggedShipId}
                  setDragOverCell={setDragOverCell}
                  setHoveredMoveTile={setHoveredMoveTile}
                  onMoveTileHover={onMoveTileHover}
                />
              )),
            )}
          </div>

          {/* Overlays: weapon animations, move arrow, damage labels, tutorial highlights */}
          <GameGridOverlays
            grid={grid}
            allShipPositions={allShipPositions}
            shipMap={shipMap}
            selectedShipId={selectedShipId}
            previewPosition={previewPosition}
            targetShipId={targetShipId}
            selectedWeaponType={selectedWeaponType}
            draggedShipId={draggedShipId}
            dragOverCell={dragOverCell}
            validTargets={validTargets}
            labelTargets={labelTargets}
            effectiveDragCell={effectiveDragCell}
            effectiveDragShipId={effectiveDragShipId}
            effectiveValidTargets={effectiveValidTargets}
            isCurrentPlayerTurn={isCurrentPlayerTurn}
            isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
            specialType={specialType}
            specialRange={specialRange}
            calculateDamage={calculateDamage}
            getShipAttributes={getShipAttributes}
            gridContainerRef={gridContainerRef}
            lastMoveShipId={lastMoveShipId}
            lastMoveOldPosition={lastMoveOldPosition}
            lastMoveNewPosition={lastMoveNewPosition}
            lastMoveActionType={lastMoveActionType}
            lastMoveTargetShipId={lastMoveTargetShipId}
            rammingPreviewPosition={rammingPreviewPosition}
            isRammingMovePreview={isRammingMovePreview}
            factionAbilityIsHeal={factionAbilityIsHeal}
            factionAbilityStrength={factionAbilityStrength}
            showLastMoveEmpReplayWhenSelected={showLastMoveEmpReplayWhenSelected}
            retreatPrepShipId={retreatPrepShipId}
            tutorialHighlightCells={tutorialHighlightCells}
            tutorialDefaultLabel={tutorialDefaultLabel}
            movementTileSet={movementTileSet}
            isHoveringDestinationAsValidTarget={isHoveringDestinationAsValidTarget}
            selectedShipCreatorSide={selectedShipCreatorSide}
            directedWeaponBeamTargetId={directedWeaponBeamTargetId}
            flakEffectCells={flakEffectCells}
            findShipPositionById={findShipPositionById}
            useCompactMobileDamageLabels={useCompactMobileDamageLabels}
          />

          {/* GridShip tooltip: absolute inside grid container so it tracks dynamic layout */}
          <GameGridTooltip
            hoveredCell={hoveredCell}
            disableTooltips={disableTooltips}
            draggedShipId={draggedShipId}
            gridContainerRef={gridContainerRef}
            gridLayoutRef={gridLayoutRef}
            renderShipCard={renderShipCard}
          />

          {/* Floating weapon selector — appears above selected ship; stays visible when targeting */}
          <GameGridWeaponSelector
            grid={grid}
            allShipPositions={allShipPositions}
            shipMap={shipMap}
            selectedShipId={selectedShipId}
            targetShipId={targetShipId}
            previewPosition={previewPosition}
            selectedWeaponType={selectedWeaponType}
            specialType={specialType}
            movementRange={movementRange}
            isCurrentPlayerTurn={isCurrentPlayerTurn}
            isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
            getShipAttributes={getShipAttributes}
            showConfirmWidget={showConfirmWidget}
            isRammingMovePreview={isRammingMovePreview}
            isFactionAbilitySupported={isFactionAbilitySupported}
            factionAbilityRange={factionAbilityRange}
            retreatPrepShipId={retreatPrepShipId}
            setSelectedWeaponType={setSelectedWeaponType}
            setTargetShipId={setTargetShipId}
          />

          {showConfirmWidget &&
            (previewPosition || retreatPrepShipId != null) &&
            onCancelMove &&
            confirmWidgetAnchor && (
              <GameGridConfirmWidget
                confirmWidgetAnchor={confirmWidgetAnchor}
                confirmWidgetLabel={confirmWidgetLabel}
                onConfirmMove={onConfirmMove ?? (() => {})}
                onCancelMove={onCancelMove}
                confirmButton={confirmButton}
                selectedShipId={selectedShipId}
                shipMap={shipMap}
                selectedWeaponType={selectedWeaponType}
                specialType={specialType}
                targetShipId={targetShipId}
                isRammingMovePreview={isRammingMovePreview ?? false}
                retreatPrepShipId={retreatPrepShipId}
                isFactionAbilitySupported={isFactionAbilitySupported}
                factionAbilityRange={factionAbilityRange}
                previewPosition={previewPosition}
                movementRange={movementRange}
                grid={grid}
                isShipOwnedByCurrentPlayer={isShipOwnedByCurrentPlayer}
                getShipAttributes={getShipAttributes}
                setSelectedWeaponType={setSelectedWeaponType}
                setTargetShipId={setTargetShipId}
                clipRootRef={outerWrapperRef}
                zoomScale={zoom.scale}
                onMoveVertical={setConfirmWidgetVertical}
              />
            )}
        </div>
      </div>
    </>
  );
});
