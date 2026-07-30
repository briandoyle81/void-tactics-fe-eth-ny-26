"use client";

import React from "react";
import Image from "next/image";
import { Attributes, ActionType } from "../types/types";
import { GridShip, GridShipPosition } from "../types/gridDisplay";
import { GridShipImage } from "./GridShipImage";
import { calculateShipRank } from "../utils/shipLevel";
import { setMirroredDragImage } from "../utils/dragShipImage";
import { RetreatPrepAnimation } from "./weapon-animations/RetreatPrepAnimation";

type Position = { row: number; col: number };
type TargetRef = { shipId: number; position: Position };
type HoveredCell = {
  shipId: number;
  row: number;
  col: number;
  isCreator: boolean;
  fromFleet?: boolean;
} | null;

interface GameGridCellProps {
  cell: GridShipPosition | null;
  rowIndex: number;
  colIndex: number;
  grid: (GridShipPosition | null)[][];
  shipMap: Map<number, GridShip>;
  selectedShipId: number | null;
  previewPosition: Position | null;
  targetShipId: number | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  hoveredCell: HoveredCell;
  draggedShipId: number | null;
  assistableTargets: TargetRef[];
  assistableTargetsFromStart: TargetRef[];
  isCurrentPlayerTurn: boolean;
  isShipOwnedByCurrentPlayer: (shipId: number) => boolean;
  movedShipIdsSet: Set<number>;
  specialType: number;
  blockedGrid: boolean[][];
  scoringGrid: number[][];
  onlyOnceGrid: boolean[][];
  getShipAttributes: (shipId: number) => Attributes | null;
  address: string | undefined;
  highlightedMovePosition?: Position | null;
  lastMoveShipId?: number | null;
  lastMoveOldPosition?: Position | null;
  lastMoveActionType?: ActionType | null;
  lastMoveTargetShipId?: number | null;
  lastMoveIsCurrentPlayer?: boolean | undefined;
  isRammingMovePreview?: boolean;
  retreatPrepShipId?: number | null;
  retreatPrepIsCreator?: boolean | null;
  isMyTurn: boolean;
  movementTileSet: Set<string>;
  shootingTileSet: Set<string>;
  tutorialHighlightKeySet?: Set<string> | null;
  effectiveDragCell: Position | null;
  effectiveShootingTileSet: Set<string>;
  effectiveValidTargetIdSet: Set<number>;
  validTargetIdSet: Set<number>;
  assistableTargetIdSet: Set<number>;
  assistableTargetsFromStartIdSet: Set<number>;
  isHoveringValidTarget: boolean;
  lastMoveActionNum: number;
  projectedDamageByShipId: Map<number, number>;
  projectedRepairByShipId: Map<number, number>;
  destroyPreviewShipIds: Set<number>;
  lastDragOverCellRef: React.RefObject<Position | null>;
  setSelectedShipId: (shipId: number | null) => void;
  setPreviewPosition: (position: Position | null) => void;
  setTargetShipId: (shipId: number | null) => void;
  setSelectedWeaponType: (type: "weapon" | "special" | "ram") => void;
  setHoveredCell: (cell: HoveredCell) => void;
  setDraggedShipId: (shipId: number | null) => void;
  setDragOverCell: (cell: Position | null) => void;
  setHoveredMoveTile: (cell: Position | null) => void;
  onMoveTileHover?: (cell: Position | null) => void;
}

/**
 * A single grid cell: terrain art, range/selection highlights, ship
 * rendering (image, hull strip, badges, drag-and-drop, hold button), and
 * the click-to-act interaction logic. Extracted verbatim from
 * `GameGrid.tsx`'s per-cell loop body — same JSX, same click-handling
 * branches, just relocated and parameterized per cell instead of closed
 * over loop variables.
 */
export function GameGridCell({
  cell,
  rowIndex,
  colIndex,
  grid,
  shipMap,
  selectedShipId,
  previewPosition,
  targetShipId,
  selectedWeaponType,
  hoveredCell,
  draggedShipId,
  assistableTargets,
  assistableTargetsFromStart,
  isCurrentPlayerTurn,
  isShipOwnedByCurrentPlayer,
  movedShipIdsSet,
  specialType,
  blockedGrid,
  scoringGrid,
  onlyOnceGrid,
  getShipAttributes,
  address,
  highlightedMovePosition,
  lastMoveShipId,
  lastMoveOldPosition,
  lastMoveActionType,
  lastMoveTargetShipId,
  lastMoveIsCurrentPlayer,
  isRammingMovePreview = false,
  retreatPrepShipId,
  retreatPrepIsCreator,
  isMyTurn,
  movementTileSet,
  shootingTileSet,
  tutorialHighlightKeySet,
  effectiveDragCell,
  effectiveShootingTileSet,
  effectiveValidTargetIdSet,
  validTargetIdSet,
  assistableTargetIdSet,
  assistableTargetsFromStartIdSet,
  isHoveringValidTarget,
  lastMoveActionNum,
  projectedDamageByShipId,
  projectedRepairByShipId,
  destroyPreviewShipIds,
  lastDragOverCellRef,
  setSelectedShipId,
  setPreviewPosition,
  setTargetShipId,
  setSelectedWeaponType,
  setHoveredCell,
  setDraggedShipId,
  setDragOverCell,
  setHoveredMoveTile,
  onMoveTileHover,
}: GameGridCellProps) {
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
                    lastMoveActionNum === ActionType.Special ||
                    lastMoveActionNum === ActionType.FactionAbility);
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
                        // Ram is only proposed when the player has explicitly
                        // selected Ram as their action — otherwise (weapon or
                        // special mode) a click always targets the ship in
                        // place, never auto-proposes moving onto it.
                        if (selectedWeaponType === "ram") {
                          if (!alreadyRamming) {
                            setPreviewPosition({ row: rowIndex, col: colIndex });
                            setTargetShipId(cell.shipId);
                          }
                          return;
                        }
                        // Skip re-proposing when hold is already active — ship
                        // stays in place, use weapon targeting.
                        if (!previewAtCurrentPos) {
                          if (selRow >= 0) setPreviewPosition({ row: selRow, col: selCol });
                          setTargetShipId(cell.shipId);
                          return;
                        }
                        // previewAtCurrentPos (hold active): fall through to normal weapon targeting
                      } else if (
                        inMoveRange &&
                        noMoveElsewhere &&
                        !previewAtCurrentPos &&
                        selectedWeaponType === "ram"
                      ) {
                        // In movement range only (not weapon range): ram is the
                        // only way to interact with this ship at all, but still
                        // only fires when Ram is the selected action — otherwise
                        // fall through (weapon/special mode has nothing to do
                        // with a target outside its range).
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
                            setTargetShipId(0); // Use 0 to indicate area-of-effect
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

                // isHoveringValidTarget is computed once for the whole grid
                // (GameGrid.tsx) — it only says *some* valid target is
                // hovered, not that it's this cell. Without also checking
                // hoveredCell's own row/col here, hovering a valid target
                // anywhere on the board (e.g. an enemy ship in weapons
                // range) blanked the "to" position's destination preview
                // even when that hover had nothing to do with this cell.
                const isHoveringThisCellAsValidTarget =
                  isHoveringValidTarget &&
                  hoveredCell !== null &&
                  hoveredCell.row === rowIndex &&
                  hoveredCell.col === colIndex;
                const isHidingDestinationPreview =
                  isHoveringThisCellAsValidTarget && (
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
                        // A disabled-enemy tile is only enterable at all because
                        // it's a valid ram target (see canEnterOccupiedCell) —
                        // dropping there must not propose a ram unless Ram is
                        // the selected action, mirroring the click-path guard
                        // above. Otherwise this is a normal move, unaffected.
                        const isDisabledEnemyDropTarget =
                          !!cell?.shipId &&
                          !isShipOwnedByCurrentPlayer(cell.shipId) &&
                          (() => {
                            const targetAttrs = getShipAttributes(cell.shipId!);
                            return !!targetAttrs && targetAttrs.hullPoints === 0;
                          })();
                        if (isDisabledEnemyDropTarget && selectedWeaponType !== "ram") {
                          setDraggedShipId(null);
                          setDragOverCell(null);
                          lastDragOverCellRef.current = null;
                          return;
                        }
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

                            // Custom drag image that preserves ship
                            // orientation (browsers don't reliably respect a
                            // live CSS transform in the default drag-ghost
                            // snapshot) — see dragShipImage.ts.
                            const shipImageContainer =
                              e.currentTarget.querySelector(
                                ".relative img",
                              ) as HTMLImageElement | null;
                            if (shipImageContainer) {
                              setMirroredDragImage(e, shipImageContainer, cell.isCreator);
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
                            <GridShipImage
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
}
