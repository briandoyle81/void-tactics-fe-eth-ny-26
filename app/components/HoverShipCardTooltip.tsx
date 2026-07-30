"use client";

import React, { useEffect, useState } from "react";

// Ship stats/actions shouldn't pop up just because the cursor passed over a
// ship on the way somewhere else — require the cursor to rest first, same
// as a native OS tooltip. Shared default for every ship-hover tooltip in
// the app (grid cells via GameGridTooltip.tsx, the campaign enemy-fleet
// preview via CampaignNodePreview.tsx, ...).
export const SHIP_TOOLTIP_HOVER_DELAY_MS = 1000;

export interface HoverAnchorRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface HoverShipCardTooltipProps {
  /** Hovered element's bounds, relative to `containerRef`'s box. `null` hides the tooltip. */
  anchor: HoverAnchorRect | null;
  /** Identity of what's hovered — resets the hover-delay timer whenever it changes. */
  hoverKey: string | null;
  /** Which side to prefer flipping toward when the tooltip would cover the anchor (e.g. "this belongs to the current player, so favor the left"). */
  preferLeftPlacement: boolean;
  /** Positioning container — must establish a positioning context (e.g. `position: relative`) so the tooltip's `absolute` placement resolves against it, and clamps to its bounds. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  disableTooltips?: boolean;
  hoverDelayMs?: number;
  /** Builds the tooltip's ship-card content, or `null` to keep it hidden (e.g. ship not found). Mode/context-specific `ShipCardData` building is left to the caller. */
  renderCard: () => React.ReactNode | null;
}

// Positioning + hover-delay logic shared by every "hover a ship, show its
// full ShipCard nearby" tooltip in the app. Takes a plain viewport-relative
// anchor rect rather than anything grid-specific, so it works for a tactical
// grid cell (see GameGridTooltip.tsx, which computes the anchor from
// row/col) just as well as an arbitrary hovered element like a thumbnail
// tile (see CampaignNodePreview.tsx, which uses the tile's own
// getBoundingClientRect()).
export function HoverShipCardTooltip({
  anchor,
  hoverKey,
  preferLeftPlacement,
  containerRef,
  disableTooltips = false,
  hoverDelayMs = SHIP_TOOLTIP_HOVER_DELAY_MS,
  renderCard,
}: HoverShipCardTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!hoverKey) {
      setShowTooltip(false);
      return;
    }
    setShowTooltip(false);
    const timer = setTimeout(() => setShowTooltip(true), hoverDelayMs);
    return () => clearTimeout(timer);
  }, [hoverKey, hoverDelayMs]);

  if (!anchor || disableTooltips || !showTooltip) return null;

  const cardContent = renderCard();
  if (!cardContent) return null;

  const containerEl = containerRef.current;
  if (!containerEl) return null;
  const cr = containerEl.getBoundingClientRect();

  const tooltipWidth = 384;
  const tooltipHeight = 400;
  const offset = 15;
  const leftPlacementOffset = 28;

  const { left: shipLeft, top: shipTop, right: shipRight, bottom: shipBottom } = anchor;
  const mouseX = (shipLeft + shipRight) / 2;
  const mouseY = (shipTop + shipBottom) / 2;

  let tooltipLeft = mouseX + offset;
  let tooltipTop = mouseY + offset;

  const tooltipRight = tooltipLeft + tooltipWidth;
  const wouldCoverHorizontally = tooltipLeft < shipRight && tooltipRight > shipLeft;

  const tooltipBottom = tooltipTop + tooltipHeight;
  const wouldCoverVertically = tooltipTop < shipBottom && tooltipBottom > shipTop;

  const maxLeft = Math.max(0, cr.width - tooltipWidth);
  const maxTop = Math.max(0, cr.height - tooltipHeight);

  if (wouldCoverHorizontally && wouldCoverVertically) {
    if (preferLeftPlacement) {
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
    if (preferLeftPlacement) {
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
      <div className="min-w-[22rem] w-[24rem] opacity-100">{cardContent}</div>
    </div>
  );
}
