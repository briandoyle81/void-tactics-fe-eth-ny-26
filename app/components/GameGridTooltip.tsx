"use client";

import React from "react";
import { measureGridCellViewportBounds } from "./GameGrid";

export interface GameGridTooltipHoveredCell {
  shipId: number;
  row: number;
  col: number;
  isCreator: boolean;
  fromFleet?: boolean;
}

interface GameGridTooltipProps {
  hoveredCell: GameGridTooltipHoveredCell | null;
  disableTooltips: boolean;
  draggedShipId: number | null;
  gridContainerRef: React.RefObject<HTMLDivElement | null>;
  gridLayoutRef: React.RefObject<HTMLDivElement | null>;
  /**
   * Builds the tooltip's ship-card content for the hovered cell, or `null`
   * to hide the tooltip (e.g. ship not found). Delegated to the caller
   * because the actual card component (`ShipCard` for web3, `ShipCardWeb2`
   * for web2) is mode-specific and action-heavy — not something this shared
   * positioning layer should own. See app/types/gridDisplay.ts.
   */
  renderShipCard: (hoveredCell: GameGridTooltipHoveredCell) => React.ReactNode | null;
}

export function GameGridTooltip({
  hoveredCell,
  disableTooltips,
  draggedShipId,
  gridContainerRef,
  gridLayoutRef,
  renderShipCard,
}: GameGridTooltipProps) {
  if (!hoveredCell || disableTooltips || draggedShipId) return null;

  const cardContent = renderShipCard(hoveredCell);
  if (!cardContent) return null;

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
        {cardContent}
      </div>
    </div>
  );
}
