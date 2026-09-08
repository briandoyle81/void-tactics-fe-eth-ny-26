"use client";

import React from "react";
import { measureGridCellViewportBounds } from "./GameGrid";
import { HoverShipCardTooltip, type HoverAnchorRect } from "./HoverShipCardTooltip";

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
   * because building `ShipCard`'s `ShipCardData`/`shipImage` props from a
   * raw `Ship`/`Web2Ship` is mode-specific — not something this shared
   * positioning layer should own. See app/types/gridDisplay.ts.
   */
  renderShipCard: (hoveredCell: GameGridTooltipHoveredCell) => React.ReactNode | null;
}

// Grid-cell-specific adapter over the shared HoverShipCardTooltip — converts
// a hovered (row, col) into the viewport-relative anchor rect the shared
// positioning/delay logic needs. See HoverShipCardTooltip.tsx for the part
// shared with other ship-hover tooltips (e.g. CampaignNodePreview.tsx's
// enemy-fleet preview grid).
export function GameGridTooltip({
  hoveredCell,
  disableTooltips,
  draggedShipId,
  gridContainerRef,
  gridLayoutRef,
  renderShipCard,
}: GameGridTooltipProps) {
  const hoverKey = hoveredCell
    ? `${hoveredCell.shipId}-${hoveredCell.row}-${hoveredCell.col}`
    : null;

  let anchor: HoverAnchorRect | null = null;
  const gridEl = gridContainerRef.current;
  if (hoveredCell && gridEl) {
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

    anchor = {
      left: vb.left - cr.left,
      top: vb.top - cr.top,
      right: vb.right - cr.left,
      bottom: vb.bottom - cr.top,
    };
  }

  return (
    <HoverShipCardTooltip
      anchor={anchor}
      hoverKey={hoverKey}
      preferLeftPlacement={hoveredCell?.isCreator ?? false}
      containerRef={gridContainerRef}
      disableTooltips={disableTooltips || !!draggedShipId}
      renderCard={() => (hoveredCell ? renderShipCard(hoveredCell) : null)}
    />
  );
}
