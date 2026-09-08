"use client";

import React from "react";
import { HoverShipCardTooltip, type HoverAnchorRect } from "./HoverShipCardTooltip";

export interface EnemyFleetPreviewShip {
  key: string;
  name: string;
  renderImage: () => React.ReactNode;
  renderHoverCard: () => React.ReactNode;
}

interface HoveredShip {
  key: string;
  anchor: HoverAnchorRect;
  renderHoverCard: () => React.ReactNode;
}

interface EnemyFleetPreviewProps {
  ships: EnemyFleetPreviewShip[];
  totalCost: number;
  isLoading: boolean;
}

// "Fight summary" block shared by every node preview that shows an enemy
// fleet before launch — the actual-cost badge, thumbnail grid, and
// hover-to-inspect ShipCard tooltip. Originally written once each inside
// CampaignNodePreview.tsx (web3) and CampaignNodePreviewWeb2.tsx (web2);
// extracted here so RoguelikeGraph.tsx/RoguelikeGraphWeb2.tsx's node
// preview can show the identical "fight summary" instead of a third and
// fourth parallel copy (see feedback_no_parallel_components memory).
// Presentation-only and chain-agnostic — each caller builds `ships` from
// its own chain-specific AI config/placement data and supplies pre-built
// image/hover-card renderers (ShipImage vs ShipImageWeb2, etc.), the same
// render-prop pattern CampaignGraphCanvas uses for its node cards.
export function EnemyFleetPreview({ ships, totalCost, isLoading }: EnemyFleetPreviewProps) {
  const [hovered, setHovered] = React.useState<HoveredShip | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={panelRef}
      className="relative border-t border-steel pt-4 md:border-t-0 md:border-l md:pl-8 md:pt-0"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs uppercase tracking-wider text-text-muted">Enemy Fleet</h4>
        {!isLoading && ships.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold text-amber bg-amber/10 border border-amber/40 rounded-none whitespace-nowrap">
            ACTUAL FLEET COST: {totalCost}
          </span>
        )}
      </div>
      {isLoading ? (
        <p className="mt-2 text-xs text-text-muted">Loading encounter data...</p>
      ) : ships.length === 0 ? (
        <p className="mt-2 text-xs text-warning-red">
          No AI content configured for this node&apos;s map yet.
        </p>
      ) : (
        <div
          className="mt-3 grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}
        >
          {ships.map((ship) => (
            <div
              key={ship.key}
              className="flex min-w-0 flex-col gap-1"
              onMouseEnter={(e) => {
                const panelEl = panelRef.current;
                if (!panelEl) return;
                const tileRect = e.currentTarget.getBoundingClientRect();
                const panelRect = panelEl.getBoundingClientRect();
                setHovered({
                  key: ship.key,
                  renderHoverCard: ship.renderHoverCard,
                  anchor: {
                    left: tileRect.left - panelRect.left,
                    top: tileRect.top - panelRect.top,
                    right: tileRect.right - panelRect.left,
                    bottom: tileRect.bottom - panelRect.top,
                  },
                });
              }}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="relative w-full overflow-hidden"
                style={{
                  aspectRatio: "1",
                  backgroundColor: "var(--color-slate)",
                  border: "1px solid var(--color-warning-red)",
                }}
              >
                {ship.renderImage()}
              </div>
              <span className="truncate text-center text-[9px] uppercase tracking-wider text-text-secondary">
                {ship.name}
              </span>
            </div>
          ))}
        </div>
      )}

      <HoverShipCardTooltip
        anchor={hovered?.anchor ?? null}
        hoverKey={hovered?.key ?? null}
        preferLeftPlacement={false}
        containerRef={panelRef}
        renderCard={() => (hovered ? hovered.renderHoverCard() : null)}
      />
    </div>
  );
}
