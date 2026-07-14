"use client";

import React, { useState, useRef, useLayoutEffect } from "react";
import Image from "next/image";
import { GRID_DIMENSIONS, Attributes } from "../types/types";
import ShipCard from "./ShipCard";
import type { ShipCardData } from "../types/shipCardData";

// Shared between MapDisplay.tsx (web3) and MapDisplayWeb2.tsx (web2) — the
// grid rendering, ship placement interactions (click/drag/tap-to-place),
// deploy-zone overlay, reference lines, and hover tooltip. String-native
// (ship ids as `string`) per the number-native-shared-components rule —
// web3 converts bigint ids at its adapter boundary, web2's ids are already
// numbers, converted the same way with `.toString()`/`String()`.
// `blockedGrid`/`scoringGrid`/`onlyOnceGrid` are pre-computed by the caller
// (web3: `buildMapGridsFromContractMap` off `useGetPresetMap`/
// `useGetPresetScoringMap`; web2: `useMapWeb2`) — this component has no
// data-fetching of its own.
export interface MapDisplayViewProps {
  mapId: number;
  className?: string;
  blockedGrid: boolean[][];
  scoringGrid: number[][];
  onlyOnceGrid: boolean[][];
  showPlayerOverlay?: boolean;
  isCreator?: boolean;
  isCreatorViewer?: boolean;
  shipPositions?: Array<{ shipId: string; row: number; col: number }>;
  /** Ships with full renderable card data (art + tooltip stats). */
  shipCardDataMap: Map<string, ShipCardData>;
  /** Names for ships not in `shipCardDataMap` (rare fallback — a bare id/name stand-in with no loaded card data yet). */
  shipNameMap?: Map<string, string>;
  /** Caller-built ship art — web3: `<ShipImage/>`, web2: `<ShipImageWeb2/>`. Only called for ids present in `shipCardDataMap`. */
  getShipArt: (shipId: string) => React.ReactNode;
  selectedShipId?: string | null;
  onShipSelect?: (shipId: string) => void;
  onShipMove?: (shipId: string, row: number, col: number) => void;
  allowSelection?: boolean;
  selectableShipIds?: string[];
  flippedShipIds?: string[];
  onDragOver?: (row: number, col: number, e: React.DragEvent) => void;
  onDrop?: (row: number, col: number, e?: React.DragEvent) => void;
  dragOverPosition?: { row: number; col: number } | null;
  showDeployZoneLabel?: boolean;
  pendingPlacementShipId?: string | null;
  /** Tooltip in-game combat stats — web3-only today (no web2 equivalent computation yet). */
  attributesMap?: Map<string, Attributes>;
  attributesLoading?: boolean;
  showTooltipInGameProperties?: boolean;
}

export function MapDisplayView({
  mapId,
  className = "",
  blockedGrid,
  scoringGrid,
  onlyOnceGrid,
  showPlayerOverlay = false,
  isCreator = false,
  isCreatorViewer = false,
  shipPositions = [],
  shipCardDataMap,
  shipNameMap,
  getShipArt,
  selectedShipId = null,
  onShipSelect,
  onShipMove,
  allowSelection = true,
  selectableShipIds,
  flippedShipIds = [],
  onDragOver,
  onDrop,
  dragOverPosition = null,
  showDeployZoneLabel = false,
  pendingPlacementShipId = null,
  attributesMap,
  attributesLoading = false,
  showTooltipInGameProperties = true,
}: MapDisplayViewProps) {
  const mapGridRef = useRef<HTMLDivElement>(null);
  const [, setMapGridLayoutVersion] = useState(0);
  useLayoutEffect(() => {
    const el = mapGridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setMapGridLayoutVersion((v) => v + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Helper function to get ship id at a position
  const getShipIdAtPosition = (row: number, col: number): string | null => {
    const position = shipPositions.find((pos) => pos.row === row && pos.col === col);
    return position?.shipId ?? null;
  };

  // Helper to validate allowed deployment columns based on viewer role
  const isValidShipPosition = (row: number, col: number) => {
    if (row < 0 || row >= GRID_DIMENSIONS.HEIGHT || col < 0 || col >= GRID_DIMENSIONS.WIDTH) {
      return false;
    }
    // Creator may place in left 4 columns (0-3); joiner in right 4 columns (13-16)
    return isCreatorViewer ? col >= 0 && col <= 3 : col >= 13 && col <= 16;
  };

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (!allowSelection) return;
    if (!onShipSelect || !onShipMove) return;

    // Tap-to-place: pending ship from list awaiting placement on touch devices
    if (pendingPlacementShipId && !getShipIdAtPosition(row, col) && isValidShipPosition(row, col)) {
      onShipMove(pendingPlacementShipId, row, col);
      return;
    }

    const shipId = getShipIdAtPosition(row, col);

    if (shipId) {
      // Only allow selecting if the ship is in selectable set (if provided)
      if (!selectableShipIds || selectableShipIds.some((id) => id === shipId)) {
        onShipSelect(shipId);
      }
    } else if (selectedShipId && isValidShipPosition(row, col)) {
      // Clicked on empty valid position with ship selected - move ship
      onShipMove(selectedShipId, row, col);
    }
  };

  // Ship tooltip state
  const [hoveredCell, setHoveredCell] = useState<{
    shipId: string;
    row: number;
    col: number;
    mouseX: number;
    mouseY: number;
    isCreatorShip: boolean;
  } | null>(null);

  const handleCellEnter = (row: number, col: number, e: React.MouseEvent<HTMLDivElement>) => {
    const shipId = getShipIdAtPosition(row, col);
    // Only show tooltip for ships we have full card data for
    if (shipId && shipCardDataMap.has(shipId)) {
      const isFlipped = flippedShipIds.some((id) => id === shipId);
      // If viewer is creator, flipped ships are joiner ships, non-flipped are creator ships
      // If viewer is joiner, flipped ships are creator ships, non-flipped are joiner ships
      const isCreatorShip = isCreator ? !isFlipped : isFlipped;

      setHoveredCell({
        shipId,
        row,
        col,
        mouseX: e.clientX,
        mouseY: e.clientY,
        isCreatorShip,
      });
    } else {
      setHoveredCell(null);
    }
  };

  const handleCellMove = (row: number, col: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (hoveredCell && hoveredCell.shipId === getShipIdAtPosition(row, col)) {
      setHoveredCell({
        ...hoveredCell,
        row,
        col,
        mouseX: e.clientX,
        mouseY: e.clientY,
      });
    }
  };

  const handleCellLeave = () => {
    setHoveredCell(null);
  };

  // Get tile class based on state
  const getTileClass = (row: number, col: number) => {
    if (
      row < 0 ||
      row >= GRID_DIMENSIONS.HEIGHT ||
      col < 0 ||
      col >= GRID_DIMENSIONS.WIDTH ||
      !blockedGrid[row] ||
      !scoringGrid[row] ||
      !onlyOnceGrid[row]
    ) {
      return `w-full h-full border-0 outline outline-1 outline-gunmetal bg-near-black ${
        allowSelection ? "cursor-pointer" : "cursor-default"
      }`;
    }

    const isBlocked = blockedGrid[row][col];
    const scoreValue = scoringGrid[row][col];
    const isOnlyOnce = onlyOnceGrid[row][col];
    const shipId = getShipIdAtPosition(row, col);
    const isSelected = shipId && selectedShipId && shipId === selectedShipId;

    let baseClass = `w-full h-full relative ${allowSelection ? "cursor-pointer" : "cursor-default"}`;

    if (isSelected) {
      baseClass += " bg-amber/10 shadow-[inset_0_0_0_3px_var(--color-amber)]";
    } else {
      if (isBlocked) {
        baseClass += " border-0 outline outline-1 outline-gunmetal overflow-hidden";
      } else {
        baseClass += " border-0 outline outline-1 outline-gunmetal";
      }
    }

    if (scoreValue > 0) {
      if (shipId) {
        baseClass += isOnlyOnce
          ? " bg-gradient-to-b from-sky-400/65 via-cyan-500/78 to-teal-700/86"
          : " bg-amber";
      } else if (isOnlyOnce) {
        baseClass += " bg-cyan";
      } else {
        baseClass += " bg-amber";
      }
    } else if (!isSelected) {
      baseClass += " bg-near-black";
    }

    return baseClass;
  };

  if (mapId <= 0) {
    return (
      <div className={`bg-near-black w-full flex items-center justify-center p-8 ${className}`}>
        <div className="text-text-muted text-center">
          <p>No map selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-near-black relative w-full h-full flex flex-col items-center justify-center ${className}`}>
      <div
        className="w-full"
        style={{ aspectRatio: `${GRID_DIMENSIONS.WIDTH} / ${GRID_DIMENSIONS.HEIGHT}` }}
      >
        <div
          ref={mapGridRef}
          key={`map-display-${mapId}-${blockedGrid.length}-${scoringGrid.length}`}
          className="grid relative gap-0 grid-cols-[repeat(17,1fr)] grid-rows-[repeat(11,1fr)] w-full h-full"
        >
          {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) => (
            <div key={`row-${row}`} className="contents">
              {Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => {
                const shipId = getShipIdAtPosition(row, col);
                const isDragOver = dragOverPosition?.row === row && dragOverPosition?.col === col;
                const isShipDraggable = !!shipId && allowSelection && selectableShipIds?.some((id) => id === shipId);
                const isPendingTarget = !!pendingPlacementShipId && !shipId && isValidShipPosition(row, col);

                return (
                  <div
                    key={`${row}-${col}`}
                    className={`${getTileClass(row, col)} ${isDragOver ? "ring-2 ring-cyan ring-inset" : ""} ${isShipDraggable ? "cursor-move" : ""}`}
                    style={isPendingTarget ? { boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-amber) 60%, transparent)" } : undefined}
                    onClick={() => handleCellClick(row, col)}
                    onMouseEnter={(e) => handleCellEnter(row, col, e)}
                    onMouseMove={(e) => handleCellMove(row, col, e)}
                    onMouseLeave={handleCellLeave}
                    onDragOver={(e) => {
                      if (onDragOver && isValidShipPosition(row, col)) {
                        onDragOver(row, col, e);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (onDrop && isValidShipPosition(row, col)) {
                        onDrop(row, col, e);
                      }
                    }}
                    draggable={!!isShipDraggable}
                    onDragStart={(e) => {
                      if (isShipDraggable && shipId) {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", shipId);
                      }
                    }}
                  >
                    {blockedGrid[row][col] && (
                      <div className="pointer-events-none absolute inset-0 z-0">
                        <Image
                          src="/img/nebula-tile.png"
                          alt=""
                          fill
                          className="object-cover opacity-30"
                          sizes="(max-width: 768px) 5vw, 3vw"
                        />
                      </div>
                    )}
                    {scoringGrid[row][col] > 0 && (
                      <div
                        className={`relative z-0 flex items-center justify-center text-lg font-bold w-full h-full ${
                          shipId ? (onlyOnceGrid[row][col] ? "text-white" : "text-amber/80") : "text-black"
                        }`}
                      >
                        {scoringGrid[row][col]}
                      </div>
                    )}

                    {/* Ship display */}
                    {(() => {
                      if (!shipId) return null;
                      const flipThis = flippedShipIds.some((id) => id === shipId);
                      const hasCardData = shipCardDataMap.has(shipId);

                      return (
                        <div className="absolute inset-0 z-[1] pointer-events-none">
                          {hasCardData ? (
                            <div className={`h-full w-full min-h-0 ${flipThis ? "scale-x-[-1]" : ""}`}>
                              {getShipArt(shipId)}
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gunmetal rounded-none flex items-center justify-center text-white text-xs">
                              {shipNameMap?.get(shipId) ?? ""}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Player deployment zone overlay - rendered after grid cells so it appears above them */}
          {showPlayerOverlay && (
            <div className="absolute pointer-events-none inset-0 z-[5]">
              {isCreator ? (
                <div
                  className="absolute flex flex-col items-center justify-start pt-2 overflow-hidden"
                  style={{
                    left: 0,
                    top: 0,
                    width: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                    height: "100%",
                    backgroundColor: "color-mix(in srgb, var(--color-amber) 8%, transparent)",
                    borderRight: "2px solid color-mix(in srgb, var(--color-amber) 35%, transparent)",
                  }}
                >
                  {showDeployZoneLabel && (
                    <span
                      className="text-[18px] font-bold tracking-widest leading-none"
                      style={{
                        fontFamily: "var(--font-rajdhani), sans-serif",
                        color: "color-mix(in srgb, var(--color-amber) 60%, transparent)",
                      }}
                    >
                      YOUR ZONE
                    </span>
                  )}
                </div>
              ) : (
                <div
                  className="absolute flex flex-col items-center justify-start pt-2 overflow-hidden"
                  style={{
                    right: 0,
                    top: 0,
                    width: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`,
                    height: "100%",
                    backgroundColor: "color-mix(in srgb, var(--color-amber) 8%, transparent)",
                    borderLeft: "2px solid color-mix(in srgb, var(--color-amber) 35%, transparent)",
                  }}
                >
                  {showDeployZoneLabel && (
                    <span
                      className="text-[18px] font-bold tracking-widest leading-none"
                      style={{
                        fontFamily: "var(--font-rajdhani), sans-serif",
                        color: "color-mix(in srgb, var(--color-amber) 60%, transparent)",
                      }}
                    >
                      YOUR ZONE
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Grid reference lines overlay */}
          <div className="absolute pointer-events-none inset-0 z-10">
            <div
              className="absolute bg-cyan"
              style={{ left: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`, top: 0, width: "2px", height: "100%", transform: "translateX(-50%)" }}
            />
            <div
              className="absolute bg-cyan"
              style={{ left: `${(8 / GRID_DIMENSIONS.WIDTH) * 100}%`, top: 0, width: "2px", height: "100%", transform: "translateX(-50%)" }}
            />
            <div
              className="absolute bg-cyan"
              style={{ left: `${(9 / GRID_DIMENSIONS.WIDTH) * 100}%`, top: 0, width: "2px", height: "100%", transform: "translateX(-50%)" }}
            />
            <div
              className="absolute bg-cyan"
              style={{ left: `${(13 / GRID_DIMENSIONS.WIDTH) * 100}%`, top: 0, width: "2px", height: "100%", transform: "translateX(-50%)" }}
            />

            <div
              className="absolute bg-warning-red"
              style={{ left: `${(4 / GRID_DIMENSIONS.WIDTH) * 100}%`, top: 0, width: "2px", height: "100%", transform: "translateX(-50%)" }}
            />
            <div
              className="absolute bg-warning-red"
              style={{ left: `${(13 / GRID_DIMENSIONS.WIDTH) * 100}%`, top: 0, width: "2px", height: "100%", transform: "translateX(-50%)" }}
            />

            {[2, 5, 11, 14].map((col) => (
              <div
                key={`v-${col}`}
                className="absolute bg-cyan/40"
                style={{ left: `${(col / GRID_DIMENSIONS.WIDTH) * 100}%`, top: 0, width: "1px", height: "100%", transform: "translateX(-50%)", opacity: 0.6 }}
              />
            ))}

            <div
              className="absolute bg-cyan"
              style={{ left: 0, top: `${(5 / GRID_DIMENSIONS.HEIGHT) * 100}%`, width: "100%", height: "2px", transform: "translateY(-50%)" }}
            />
            <div
              className="absolute bg-cyan"
              style={{ left: 0, top: `${(6 / GRID_DIMENSIONS.HEIGHT) * 100}%`, width: "100%", height: "2px", transform: "translateY(-50%)" }}
            />

            {[1, 9].map((row) => (
              <div
                key={`h-${row}`}
                className="absolute bg-cyan/40"
                style={{ left: 0, top: `${(row / GRID_DIMENSIONS.HEIGHT) * 100}%`, width: "100%", height: "1px", transform: "translateY(-50%)", opacity: 0.6 }}
              />
            ))}
          </div>

          {/* Ship tooltip: absolute in map grid so it tracks aspect / resize */}
          {hoveredCell &&
            (() => {
              const shipCardData = shipCardDataMap.get(hoveredCell.shipId);
              if (!shipCardData) return null;

              const gridEl = mapGridRef.current;
              if (!gridEl) return null;

              const tooltipWidth = 384;
              const tooltipHeight = 400;
              const offset = 15;
              const leftPlacementOffset = 28;

              const cr = gridEl.getBoundingClientRect();
              const cw = cr.width / GRID_DIMENSIONS.WIDTH;
              const ch = cr.height / GRID_DIMENSIONS.HEIGHT;

              const shipLeft = hoveredCell.col * cw;
              const shipTop = hoveredCell.row * ch;
              const shipRight = shipLeft + cw;
              const shipBottom = shipTop + ch;

              const mouseX = hoveredCell.mouseX - cr.left;
              const mouseY = hoveredCell.mouseY - cr.top;

              let tooltipLeft = mouseX + offset;
              let tooltipTop = mouseY + offset;

              const tooltipRight = tooltipLeft + tooltipWidth;
              const wouldCoverHorizontally = tooltipLeft < shipRight && tooltipRight > shipLeft;

              const tooltipBottom = tooltipTop + tooltipHeight;
              const wouldCoverVertically = tooltipTop < shipBottom && tooltipBottom > shipTop;

              const isCreatorShip = hoveredCell.isCreatorShip;
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
                  } else if (shipBottom + tooltipHeight + offset <= cr.height) {
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
                  } else if (shipBottom + tooltipHeight + offset <= cr.height) {
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

              const attributes = attributesMap?.get(hoveredCell.shipId);
              const isCurrentPlayerShip = selectableShipIds?.some((id) => id === hoveredCell.shipId) ?? false;

              return (
                <div
                  className="absolute z-[10000] pointer-events-none opacity-100"
                  style={{ left: `${tooltipLeft}px`, top: `${tooltipTop}px` }}
                >
                  <div className="min-w-[22rem] w-[24rem] opacity-100">
                    <ShipCard
                      ship={shipCardData}
                      shipImage={getShipArt(hoveredCell.shipId)}
                      isStarred={false}
                      onToggleStar={() => {}}
                      isSelected={false}
                      onToggleSelection={() => {}}
                      onRecycleClick={() => {}}
                      showInGameProperties={showTooltipInGameProperties}
                      inGameAttributes={attributes}
                      attributesLoading={attributesLoading && !attributes}
                      hideRecycle={true}
                      hideCheckbox={true}
                      tooltipMode={true}
                      isCurrentPlayerShip={isCurrentPlayerShip}
                      flipShip={hoveredCell.isCreatorShip}
                      tooltipGridPosition={{ row: hoveredCell.row, col: hoveredCell.col }}
                    />
                  </div>
                </div>
              );
            })()}
        </div>
      </div>

      {/* Key/Legend */}
      <div className="mt-4 w-full">
        <div className="flex flex-wrap gap-4 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <div className="relative h-5 w-5 shrink-0 overflow-hidden border border-gunmetal bg-near-black">
              <Image src="/img/nebula-tile.png" alt="" fill className="object-cover opacity-30" sizes="20px" />
            </div>
            <span>Blocked (LOS) - Nebula</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-amber border border-gunmetal"></div>
            <span>Scoring (reusable)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-cyan border border-gunmetal"></div>
            <span>Scoring (once only)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative h-5 w-5 shrink-0 overflow-hidden border border-gunmetal bg-cyan">
              <Image src="/img/nebula-tile.png" alt="" fill className="object-cover opacity-30" sizes="20px" />
            </div>
            <span>Blocked + Scoring</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[20px] h-[20px] bg-near-black border border-gunmetal"></div>
            <span>Empty</span>
          </div>
        </div>
      </div>
    </div>
  );
}
