"use client";

import React from "react";
import { Attributes, ActionType, canonicalSpecialSlot } from "../types/types";
import {
  isAttackDronesSpecial,
  isRepairDronesSpecial,
  requireSpecialConfigWeb2,
} from "../utils/specialConfigWeb2";
import { requireShipValue } from "../utils/requireShipValue";
import { GridShip, GridShipPosition } from "../types/gridDisplay";
import { LaserShootingAnimation } from "./weapon-animations/LaserShootingAnimation";
import { MissileShootingAnimation } from "./weapon-animations/MissileShootingAnimation";
import { PlasmaShootingAnimation } from "./weapon-animations/PlasmaShootingAnimation";
import { MiningDrillAnimation } from "./weapon-animations/MiningDrillAnimation";
import { RailgunShootingAnimation } from "./weapon-animations/RailgunShootingAnimation";
import { FlakExplosionAnimation } from "./weapon-animations/FlakExplosionAnimation";
import { RepairDroneAnimation } from "./weapon-animations/RepairDroneAnimation";
import { AttackDroneAnimation } from "./weapon-animations/AttackDroneAnimation";
import { EmpWaveAnimation } from "./weapon-animations/EmpWaveAnimation";
import { LightningFieldAnimation } from "./weapon-animations/LightningFieldAnimation";
import { WarpFieldCollapseAnimation } from "./weapon-animations/WarpFieldCollapseAnimation";
import { collectDamageLabelTargets } from "../utils/gameGridRanges";

type Position = { row: number; col: number };
type TargetRef = { shipId: number; position: Position };
function isLightningFieldShip(ship: GridShip | undefined): boolean {
  if (!ship) return false;
  return (
    Number(ship.traits.variant) === 2 &&
    canonicalSpecialSlot(ship.traits.variant, ship.equipment.special) === 1
  );
}

function hologramWeaponFire(active: boolean, node: React.ReactNode) {
  if (!active || node == null) return node;
  return (
    <div className="weapon-hologram absolute inset-0 pointer-events-none">
      {node}
    </div>
  );
}

function lightningFieldRange(ship: GridShip | undefined): number {
  if (!ship) {
    throw new Error("Missing ship value: lighteningFieldRange");
  }
  return requireShipValue(
    "lighteningFieldRange",
    requireSpecialConfigWeb2(Number(ship.traits.variant), ship.equipment.special).range,
  );
}

function isFlakArrayShip(ship: GridShip | undefined): boolean {
  if (!ship) return false;
  const variant = Number(ship.traits.variant);
  return (
    variant !== 2 &&
    canonicalSpecialSlot(variant, ship.equipment.special) === 3
  );
}

function flakArrayRange(ship: GridShip | undefined): number {
  if (!ship) {
    throw new Error("Missing ship value: flakArrayRange");
  }
  return requireShipValue(
    "flakArrayRange",
    requireSpecialConfigWeb2(Number(ship.traits.variant), ship.equipment.special).range,
  );
}

function lastMoveIsRam(
  lastMoveActionNum: number,
  lastMoveShipId: number | null | undefined,
  shipMap: Map<number, GridShip>,
): boolean {
  if (lastMoveActionNum !== ActionType.FactionAbility) return false;
  if (lastMoveShipId == null) return false;
  return Number(shipMap.get(lastMoveShipId)?.traits.variant) !== 2;
}

function cellsInManhattanRange(
  origin: Position,
  range: number,
  grid: (GridShipPosition | null)[][],
): Position[] {
  const cells: Position[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const dist = Math.abs(r - origin.row) + Math.abs(c - origin.col);
      if (dist > 0 && dist <= range) cells.push({ row: r, col: c });
    }
  }
  return cells;
}

type HoveredCell = {
  shipId: number;
  row: number;
  col: number;
  isCreator: boolean;
  fromFleet?: boolean;
} | null;

interface GameGridOverlaysProps {
  grid: (GridShipPosition | null)[][];
  allShipPositions?: readonly GridShipPosition[];
  shipMap: Map<number, GridShip>;
  selectedShipId: number | null;
  previewPosition: Position | null;
  targetShipId: number | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  draggedShipId: number | null;
  dragOverCell: Position | null;
  validTargets: TargetRef[];
  labelTargets?: TargetRef[];
  effectiveDragCell: Position | null;
  effectiveDragShipId: number | null;
  effectiveValidTargets: TargetRef[];
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  specialType: number;
  specialRange?: number;
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
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  lastMoveShipId?: number | null;
  lastMoveOldPosition?: Position | null;
  lastMoveNewPosition?: Position | null;
  lastMoveActionType?: ActionType | null;
  lastMoveTargetShipId?: number | null;
  rammingPreviewPosition?: Position | null;
  isRammingMovePreview?: boolean;
  factionAbilityIsHeal?: boolean;
  factionAbilityStrength?: number;
  showLastMoveEmpReplayWhenSelected?: boolean;
  retreatPrepShipId?: number | null;
  tutorialHighlightCells?: readonly {
    row: number;
    col: number;
    label?: string;
    hideLabel?: boolean;
  }[];
  tutorialDefaultLabel?: string;
  movementTileSet: Set<string>;
  isHoveringValidTarget: boolean;
  hoveredCell: HoveredCell;
  selectedShipCreatorSide: boolean | null;
  directedWeaponBeamTargetId: number | null;
  flakEffectCells: Position[];
  findShipPositionById: (shipId: number | null | undefined) => Position | null;
  useCompactMobileDamageLabels: boolean;
}

/**
 * Weapon-effect overlay layer: warp-field collapse (retreat), move-path
 * arrow, per-weapon shooting animations, Flak/EMP/repair-drone effects,
 * floating damage labels, and the tutorial "Click here" badges. Extracted
 * verbatim from `GameGrid.tsx` — same JSX, same behavior, just relocated.
 */
export function GameGridOverlays({
  grid,
  allShipPositions,
  shipMap,
  selectedShipId,
  previewPosition,
  targetShipId,
  selectedWeaponType,
  draggedShipId,
  dragOverCell,
  validTargets,
  labelTargets,
  effectiveDragCell,
  effectiveDragShipId,
  effectiveValidTargets,
  isCurrentPlayerTurn,
  isShipOwnedByCurrentPlayer,
  specialType,
  specialRange,
  calculateDamage,
  getShipAttributes,
  gridContainerRef,
  lastMoveShipId,
  lastMoveOldPosition,
  lastMoveNewPosition,
  lastMoveActionType,
  lastMoveTargetShipId,
  rammingPreviewPosition = null,
  isRammingMovePreview = false,
  factionAbilityIsHeal = false,
  factionAbilityStrength,
  showLastMoveEmpReplayWhenSelected = false,
  retreatPrepShipId,
  tutorialHighlightCells,
  tutorialDefaultLabel = "Click here",
  movementTileSet,
  isHoveringValidTarget,
  hoveredCell,
  selectedShipCreatorSide,
  directedWeaponBeamTargetId,
  flakEffectCells,
  findShipPositionById,
  useCompactMobileDamageLabels,
}: GameGridOverlaysProps) {
  const lastMoveActionNum =
    lastMoveActionType != null ? Number(lastMoveActionType) : NaN;
  const showLastMoveEmpReplay =
    !selectedShipId || showLastMoveEmpReplayWhenSelected;
  // Preview weapon fire is a hologram at To. Last-move fire is live color at To.
  const hologramFire = !!(previewPosition && selectedShipId);

  return (
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
                // isHoveringValidTarget is a single grid-wide flag ("some
                // valid target is hovered somewhere"), not scoped to this
                // cell — checking it alone hid the move arrow whenever any
                // enemy ship in weapons range was hovered, anywhere on the
                // board. Only suppress the arrow when the hovered valid
                // target is actually the proposed destination itself.
                const isHoveringDestinationAsValidTarget =
                  isHoveringValidTarget &&
                  hoveredCell !== null &&
                  proposedDestination !== null &&
                  hoveredCell.row === proposedDestination.row &&
                  hoveredCell.col === proposedDestination.col;
                const useProposedMoveArrow =
                  selectedShipId !== null && proposedDestination !== null && !isHoveringDestinationAsValidTarget && retreatPrepShipId == null;

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
                if (
                  !selectedShipId &&
                  (lastMoveActionType === ActionType.Special ||
                    lastMoveActionType === ActionType.FactionAbility)
                ) {
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

                return hologramWeaponFire(
                  hologramFire,
                  <LaserShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                    facingRight={attackerIsCreator}
                    variant={Number(ship.traits.variant)}
                  />,
                );
              })()}

            {/* Missile Shooting Animation */}
            {(selectedShipId || lastMoveShipId) &&
              directedWeaponBeamTargetId &&
              (selectedWeaponType === "weapon" || (!selectedShipId && (lastMoveActionType as ActionType) === ActionType.Shoot)) &&
              (() => {
                // Use selectedShipId if available, otherwise use lastMoveShipId for last move display
                const shipId = selectedShipId || lastMoveShipId;
                if (!shipId) {
                  return null;
                }

                if (
                  !selectedShipId &&
                  (lastMoveActionType === ActionType.Special ||
                    lastMoveActionType === ActionType.FactionAbility)
                ) {
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
                  if (attackerRow === -1 || attackerCol === -1) {
                    return null;
                  }
                } else {
                  // No preview or drag position - don't show animation
                  return null;
                }

                if (!directedWeaponBeamTargetId) return null;
                const targetPosition = findShipPositionById(
                  directedWeaponBeamTargetId,
                );
                if (!targetPosition) {
                  return null;
                }

                const attackerIsCreator =
                  selectedShipCreatorSide ??
                  grid[attackerRow]?.[attackerCol]?.isCreator ??
                  false;

                return hologramWeaponFire(
                  hologramFire,
                  <MissileShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                    facingRight={attackerIsCreator}
                    variant={Number(ship.traits.variant)}
                  />,
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

                if (
                  !selectedShipId &&
                  (lastMoveActionType === ActionType.Special ||
                    lastMoveActionType === ActionType.FactionAbility)
                ) {
                  return null;
                }

                // Check if the ship has a Plasma / Mining Drill (mainWeapon === 3)
                const ship = shipMap.get(shipId);
                if (!ship || ship.equipment.mainWeapon !== 3) {
                  return null;
                }
                const isMiningDrill = Number(ship.traits.variant) === 2;

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

                return hologramWeaponFire(
                  hologramFire,
                  isMiningDrill ? (
                    <MiningDrillAnimation
                      gridContainerRef={gridContainerRef}
                      attackerRow={attackerRow}
                      attackerCol={attackerCol}
                      targetRow={targetPosition.row}
                      targetCol={targetPosition.col}
                      facingRight={attackerIsCreator}
                    />
                  ) : (
                    <PlasmaShootingAnimation
                      gridContainerRef={gridContainerRef}
                      attackerRow={attackerRow}
                      attackerCol={attackerCol}
                      targetRow={targetPosition.row}
                      targetCol={targetPosition.col}
                      facingRight={attackerIsCreator}
                    />
                  ),
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

                if (
                  !selectedShipId &&
                  (lastMoveActionType === ActionType.Special ||
                    lastMoveActionType === ActionType.FactionAbility)
                ) {
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

                return hologramWeaponFire(
                  hologramFire,
                  <RailgunShootingAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                    facingRight={attackerIsCreator}
                    variant={Number(ship.traits.variant)}
                  />,
                );
              })()}

            {/* Flak Area-of-Effect animation. AoE does not need a locked
                target id; requiring targetShipId === 0 hid the bursts after
                a move tile click cleared the target. */}
            {selectedShipId &&
              selectedWeaponType === "special" &&
              specialType === 3 &&
                hologramWeaponFire(
                  hologramFire,
                  <FlakExplosionAnimation
                    gridContainerRef={gridContainerRef}
                    targetCells={flakEffectCells}
                  />,
                )}

            {showLastMoveEmpReplay &&
              lastMoveActionType != null &&
              Number(lastMoveActionType) === ActionType.Special &&
              lastMoveShipId != null &&
              !selectedShipId &&
              isFlakArrayShip(shipMap.get(lastMoveShipId)) &&
              (() => {
                const origin =
                  lastMoveNewPosition ?? findShipPositionById(lastMoveShipId);
                if (!origin) return null;
                const range = flakArrayRange(shipMap.get(lastMoveShipId));
                return (
                  <FlakExplosionAnimation
                    gridContainerRef={gridContainerRef}
                    targetCells={cellsInManhattanRange(origin, range, grid)}
                  />
                );
              })()}

            {/* Lightening Field: blue jagged sparks across every tile in range */}
            {selectedShipId &&
              selectedWeaponType === "special" &&
              specialType === 1 &&
              specialRange != null &&
              isLightningFieldShip(shipMap.get(selectedShipId)) &&
              (() => {
                const origin =
                  previewPosition ??
                  effectiveDragCell ??
                  findShipPositionById(selectedShipId);
                if (!origin) return null;
                const range = requireShipValue("lighteningFieldRange", specialRange);
                return hologramWeaponFire(
                  hologramFire,
                  <LightningFieldAnimation
                    gridContainerRef={gridContainerRef}
                    originRow={origin.row}
                    originCol={origin.col}
                    range={range}
                  />,
                );
              })()}

            {showLastMoveEmpReplay &&
              lastMoveActionType != null &&
              Number(lastMoveActionType) === ActionType.Special &&
              lastMoveShipId != null &&
              !selectedShipId &&
              isLightningFieldShip(shipMap.get(lastMoveShipId)) &&
              (() => {
                const origin = lastMoveNewPosition ?? findShipPositionById(lastMoveShipId);
                if (!origin) return null;
                const range = lightningFieldRange(shipMap.get(lastMoveShipId));
                return (
                  <LightningFieldAnimation
                    gridContainerRef={gridContainerRef}
                    originRow={origin.row}
                    originCol={origin.col}
                    range={range}
                  />
                );
              })()}

            {/* EMP wave animation (selected + has a target ship). Variant 2 slot 1 is Lightening Field, not EMP. */}
            {selectedShipId &&
              selectedWeaponType === "special" &&
              specialType === 1 &&
              !isLightningFieldShip(shipMap.get(selectedShipId)) &&
              targetShipId != null &&
              targetShipId !== 0 &&
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

                return hologramWeaponFire(
                  hologramFire,
                  <EmpWaveAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />,
                );
              })()}

            {/* EMP wave animation for last move (hidden while selecting unless tutorial replay) */}
            {showLastMoveEmpReplay &&
              lastMoveActionType != null &&
              Number(lastMoveActionType) === ActionType.Special &&
              lastMoveShipId != null &&
              lastMoveTargetShipId != null &&
              Number(shipMap.get(lastMoveShipId)?.equipment.special) === 1 &&
              !isLightningFieldShip(shipMap.get(lastMoveShipId)) &&
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

            {/* Repair drones animation (selected + has a target ship).
                Variant 1 uses the Repair Drones special; variant 2 uses the
                innate Repair faction ability (weapon type "ram"). */}
            {selectedShipId &&
              targetShipId != null &&
              targetShipId !== 0 &&
              ((selectedWeaponType === "special" &&
                isRepairDronesSpecial(
                  selectedShipId != null
                    ? Number(shipMap.get(selectedShipId)?.traits.variant ?? 1)
                    : 1,
                  specialType,
                )) ||
                (selectedWeaponType === "ram" && factionAbilityIsHeal)) &&
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

                return hologramWeaponFire(
                  hologramFire,
                  <RepairDroneAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />,
                );
              })()}

            {/* Attack drones (variant 2 slot 2): orange swarm that cuts the target. */}
            {selectedShipId &&
              targetShipId != null &&
              targetShipId !== 0 &&
              selectedWeaponType === "special" &&
              isAttackDronesSpecial(
                Number(shipMap.get(selectedShipId)?.traits.variant ?? 1),
                specialType,
              ) &&
              (() => {
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

                return hologramWeaponFire(
                  hologramFire,
                  <AttackDroneAnimation
                    gridContainerRef={gridContainerRef}
                    attackerRow={attackerRow}
                    attackerCol={attackerCol}
                    targetRow={targetPosition.row}
                    targetCol={targetPosition.col}
                  />,
                );
              })()}

            {/* Repair drones animation for last move (special Repair Drones
                or variant 2 faction Repair). */}
            {lastMoveShipId != null &&
              lastMoveTargetShipId != null &&
              lastMoveTargetShipId !== 0 &&
              (((lastMoveActionType as ActionType) === ActionType.Special &&
                isRepairDronesSpecial(
                  Number(shipMap.get(lastMoveShipId)?.traits.variant),
                  shipMap.get(lastMoveShipId)?.equipment.special ?? 0,
                )) ||
                ((lastMoveActionType as ActionType) === ActionType.FactionAbility &&
                  Number(shipMap.get(lastMoveShipId)?.traits.variant) === 2)) &&
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

            {lastMoveShipId != null &&
              lastMoveTargetShipId != null &&
              lastMoveTargetShipId !== 0 &&
              (lastMoveActionType as ActionType) === ActionType.Special &&
              isAttackDronesSpecial(
                Number(shipMap.get(lastMoveShipId)?.traits.variant),
                shipMap.get(lastMoveShipId)?.equipment.special ?? 0,
              ) &&
              (() => {
                let attackerRow = -1;
                let attackerCol = -1;
                if (lastMoveNewPosition) {
                  attackerRow = lastMoveNewPosition.row;
                  attackerCol = lastMoveNewPosition.col;
                } else {
                  grid.forEach((row, r) => {
                    row.forEach((cell, c) => {
                      if (cell?.shipId === lastMoveShipId) {
                        attackerRow = r;
                        attackerCol = c;
                      }
                    });
                  });
                }
                const targetPosition = findShipPositionById(lastMoveTargetShipId);
                if (
                  attackerRow === -1 ||
                  attackerCol === -1 ||
                  !targetPosition
                ) {
                  return null;
                }
                return (
                  <AttackDroneAnimation
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
                  shipVariant: selectedShipId != null
                    ? shipMap.get(selectedShipId)?.traits.variant
                    : undefined,
                  previewPosition,
                  specialRange,
                  factionAbilityIsHeal,
                });

                const lastMoveWasRam = lastMoveIsRam(
                  lastMoveActionNum,
                  lastMoveShipId,
                  shipMap,
                );
                const shouldShowRammingLabels =
                  (isRammingMovePreview && rammingPreviewPosition != null) ||
                  (lastMoveWasRam &&
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
                    factionAbilityIsHeal ||
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

                      const isFactionHealPreview =
                        selectedWeaponType === "ram" && factionAbilityIsHeal;
                      const factionHealAmount = factionAbilityStrength ?? 50;
                      const selectedVariant =
                        selectedShipId != null
                          ? Number(shipMap.get(selectedShipId)?.traits.variant ?? 1)
                          : 1;
                      const isRepairDronesPreview =
                        selectedWeaponType === "special" &&
                        isRepairDronesSpecial(selectedVariant, specialType);
                      const isAttackDronesPreview =
                        selectedWeaponType === "special" &&
                        isAttackDronesSpecial(selectedVariant, specialType);

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
                      if (isFactionHealPreview) {
                        labelText = useCompactMobileDamageLabels
                          ? String(factionHealAmount)
                          : `REPAIR ${factionHealAmount} HP`;
                      } else if (useCompactMobileDamageLabels) {
                        labelText = String(damage.reducedDamage);
                      } else if (selectedWeaponType === "special") {
                        if (specialType === 3 || isAttackDronesPreview) {
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
                          labelText = willDestroyByReactor
                            ? "[DESTROY]"
                            : "REACTOR DMG";
                        } else if (isRepairDronesPreview) {
                          labelText = `REPAIR ${damage.reducedDamage} HP`;
                        } else {
                          labelText = `${damage.reducedDamage} DMG`;
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
                            isFactionHealPreview || isRepairDronesPreview
                              ? "bg-cyan/60 border border-cyan"
                              : selectedWeaponType === "special"
                              ? specialType === 3
                                ? "bg-amber/60 border border-amber"
                                : specialType === 1
                                  ? "bg-warning-red/60 border border-warning-red"
                                  : "bg-warning-red/60 border border-warning-red"
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
                      // Last-move ram labels — same two labels as staged preview, at the to-position.
                      // Variant 2 FactionAbility is Repair, not Ram.
                      if (
                        !lastMoveWasRam ||
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
                      targetShipId != null && targetShipId !== 0;
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
  );
}
