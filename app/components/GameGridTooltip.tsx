"use client";

import React from "react";
import { Ship, Attributes } from "../types/types";
import ShipCard from "./ShipCard";
import { measureGridCellViewportBounds } from "./GameGrid";

interface GameGridTooltipProps {
  hoveredCell: { shipId: bigint; row: number; col: number; isCreator: boolean; [key: string]: unknown } | null;
  disableTooltips: boolean;
  draggedShipId: bigint | null;
  shipMap: Map<bigint, Ship>;
  getShipAttributes: (shipId: bigint) => Attributes | null;
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  gridLayoutRef: React.RefObject<HTMLDivElement | null>;
  isShipOwnedByCurrentPlayer: (shipId: bigint) => boolean;
  movedShipIdsSet: Set<bigint>;
}

export function GameGridTooltip({
  hoveredCell,
  disableTooltips,
  draggedShipId,
  shipMap,
  getShipAttributes,
  gridContainerRef,
  gridLayoutRef,
  isShipOwnedByCurrentPlayer,
  movedShipIdsSet,
}: GameGridTooltipProps) {
  if (!hoveredCell || disableTooltips || draggedShipId) return null;

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
    layoutEl && layoutRect ? layoutRect.left - cr.left + layoutEl.clientLeft : 0;
  const originY =
    layoutEl && layoutRect ? layoutRect.top - cr.top + layoutEl.clientTop : 0;
  const cellWidth = layoutEl ? layoutEl.clientWidth / 17 : cr.width / 17;
  const cellHeight = layoutEl ? layoutEl.clientHeight / 11 : cr.height / 11;

  const vb = measureGridCellViewportBounds(layoutEl, hoveredCell.row, hoveredCell.col, {
    gridContainerViewportLeft: cr.left,
    gridContainerViewportTop: cr.top,
    originX,
    originY,
    cellWidth,
    cellHeight,
  });

  const shipLeft = vb.left - cr.left;
  const shipTop = vb.top - cr.top;
  const shipRight = vb.right - cr.left;
  const shipBottom = vb.bottom - cr.top;

  const mouseX = (shipLeft + shipRight) / 2;
  const mouseY = (shipTop + shipBottom) / 2;

  let tooltipLeft = mouseX + offset;
  let tooltipTop = mouseY + offset;

  const tooltipRight = tooltipLeft + tooltipWidth;
  const wouldCoverHorizontally = tooltipLeft < shipRight && tooltipRight > shipLeft;

  const tooltipBottom = tooltipTop + tooltipHeight;
  const wouldCoverVertically = tooltipTop < shipBottom && tooltipBottom > shipTop;

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

  return (
    <div
      className="absolute z-[10000] pointer-events-none opacity-100"
      style={{ left: `${tooltipLeft}px`, top: `${tooltipTop}px` }}
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
          isCurrentPlayerShip={isShipOwnedByCurrentPlayer(hoveredCell.shipId)}
          flipShip={hoveredCell.isCreator}
          hasMoved={movedShipIdsSet.has(hoveredCell.shipId)}
          gameViewMode={true}
          tooltipGridPosition={{ row: hoveredCell.row, col: hoveredCell.col }}
        />
      </div>
    </div>
  );
}
