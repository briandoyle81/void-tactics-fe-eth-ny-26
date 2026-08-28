"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { getNodeContent } from "../config/campaignNodes";
import { NodeMatchModalWeb2 } from "./NodeMatchModalWeb2";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import ShipCard from "./ShipCard";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { HoverShipCardTooltip, type HoverAnchorRect } from "./HoverShipCardTooltip";
import { ARCHETYPE_LABEL } from "../utils/aiShipConfig";
import { aiConfigToPreviewShipWeb2, type AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";
import type { CampaignWeb2Node, CampaignWeb2 } from "../hooks/useCampaignWeb2";

interface AIMapPlacementWeb2 {
  id: number;
  row: number;
  col: number;
  configId: number;
  config: AIShipConfigWeb2;
}

interface HoveredShip {
  config: AIShipConfigWeb2;
  anchor: HoverAnchorRect;
  key: string;
}

interface CampaignNodePreviewWeb2Props {
  node: CampaignWeb2Node;
  campaign: CampaignWeb2;
}

// Web2 counterpart to CampaignNodePreview.tsx — same layout, same shared
// ShipImageWeb2/ShipCard/HoverShipCardTooltip rendering for the enemy
// fleet preview (real art tiles + hover-to-inspect, not a text list).
export function CampaignNodePreviewWeb2({ node, campaign }: CampaignNodePreviewWeb2Props) {
  const [showFleetModal, setShowFleetModal] = React.useState(false);
  const [hoveredShip, setHoveredShip] = React.useState<HoveredShip | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const content = getNodeContent(node.id);

  const { data: placements = [], isLoading } = useQuery({
    queryKey: ["ai-map-placements", node.mapId],
    queryFn: () => apiFetch<AIMapPlacementWeb2[]>(`/api/ai-map-placements?mapId=${node.mapId}`),
  });

  const totalEnemyThreat = React.useMemo(
    () =>
      placements.reduce(
        (sum, p) => sum + aiConfigToPreviewShipWeb2(p.config).shipData.cost,
        0,
      ),
    [placements],
  );

  return (
    <div
      ref={panelRef}
      className="relative grid grid-cols-1 gap-8 border-2 border-cyan p-6 font-mono md:grid-cols-2"
      style={{ borderRadius: 0 }}
    >
      <div className="flex flex-col">
        <h3 className="text-xl font-bold text-cyan">{content.title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{content.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
          <span>
            Player cost limit: <span className="text-cyan">{node.costLimit}</span>
          </span>
        </div>
        {campaign.requiredVariant > 0 && (
          <div className="mt-2 inline-flex w-fit items-center gap-1.5 border border-amber/40 bg-amber/10 px-2 py-1 text-[10px] uppercase tracking-wider text-amber">
            Requires Faction {campaign.requiredVariant} fleet
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowFleetModal(true)}
          disabled={!node.unlocked}
          className="mt-6 self-start border-2 border-phosphor-green px-4 py-2 text-sm font-bold tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderRadius: 0 }}
          title={!node.unlocked ? "Not unlocked yet" : undefined}
        >
          {node.completed ? "[REPLAY MISSION]" : "[LAUNCH MISSION]"}
        </button>
      </div>

      <div className="border-t border-steel pt-4 md:border-t-0 md:border-l md:pl-8 md:pt-0">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs uppercase tracking-wider text-text-muted">Enemy Fleet</h4>
          {!isLoading && placements.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold text-amber bg-amber/10 border border-amber/40 rounded-none whitespace-nowrap">
              ACTUAL FLEET COST: {totalEnemyThreat}
            </span>
          )}
        </div>
        {isLoading ? (
          <p className="mt-2 text-xs text-text-muted">Loading encounter data...</p>
        ) : placements.length === 0 ? (
          <p className="mt-2 text-xs text-warning-red">
            No AI content configured for this node&apos;s map yet.
          </p>
        ) : (
          <div
            className="mt-3 grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}
          >
            {placements.map((p, i) => {
              const previewShip = aiConfigToPreviewShipWeb2(p.config, i);
              return (
                <div
                  key={`${p.config.id}-${i}`}
                  className="flex min-w-0 flex-col gap-1"
                  onMouseEnter={(e) => {
                    const panelEl = panelRef.current;
                    if (!panelEl) return;
                    const tileRect = e.currentTarget.getBoundingClientRect();
                    const panelRect = panelEl.getBoundingClientRect();
                    setHoveredShip({
                      config: p.config,
                      key: `${p.config.id}-${i}`,
                      anchor: {
                        left: tileRect.left - panelRect.left,
                        top: tileRect.top - panelRect.top,
                        right: tileRect.right - panelRect.left,
                        bottom: tileRect.bottom - panelRect.top,
                      },
                    });
                  }}
                  onMouseLeave={() => setHoveredShip(null)}
                >
                  <div
                    className="relative w-full overflow-hidden"
                    style={{
                      aspectRatio: "1",
                      backgroundColor: "var(--color-slate)",
                      border: "1px solid var(--color-warning-red)",
                    }}
                  >
                    <ShipImageWeb2
                      ship={previewShip}
                      className="h-full w-full"
                      showLoadingState={false}
                      hideRankStars
                    />
                  </div>
                  <span className="truncate text-center text-[9px] uppercase tracking-wider text-text-secondary">
                    {p.config.name || ARCHETYPE_LABEL[p.config.archetype]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showFleetModal && (
        <NodeMatchModalWeb2
          node={node}
          requiredVariant={campaign.requiredVariant}
          onClose={() => setShowFleetModal(false)}
          onLaunched={() => setShowFleetModal(false)}
        />
      )}

      <HoverShipCardTooltip
        anchor={hoveredShip?.anchor ?? null}
        hoverKey={hoveredShip?.key ?? null}
        preferLeftPlacement={false}
        containerRef={panelRef}
        renderCard={() =>
          hoveredShip ? (
            <ShipCard
              ship={toShipCardDataWeb2(aiConfigToPreviewShipWeb2(hoveredShip.config))}
              shipImage={
                <ShipImageWeb2
                  ship={aiConfigToPreviewShipWeb2(hoveredShip.config)}
                  className="h-full w-full"
                  showLoadingState={false}
                />
              }
              isStarred={false}
              onToggleStar={() => {}}
              isSelected={false}
              onToggleSelection={() => {}}
              onRecycleClick={() => {}}
              showInGameProperties={false}
              hideRecycle
              hideCheckbox
              tooltipMode
            />
          ) : null
        }
      />
    </div>
  );
}
