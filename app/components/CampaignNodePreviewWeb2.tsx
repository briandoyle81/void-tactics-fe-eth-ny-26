"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { NodeMatchModalWeb2 } from "./NodeMatchModalWeb2";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import ShipCard from "./ShipCard";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { ARCHETYPE_LABEL } from "../utils/aiShipConfig";
import { aiConfigToPreviewShipWeb2 } from "../utils/aiShipConfigWeb2";
import type { CampaignWeb2NodeWithContent, CampaignWeb2 } from "../hooks/useCampaignWeb2";
import type { AIMapPlacementWeb2 } from "../hooks/useMapEnemyThreatWeb2";
import { EnemyFleetPreview } from "./EnemyFleetPreview";

interface CampaignNodePreviewWeb2Props {
  node: CampaignWeb2NodeWithContent;
  campaign: CampaignWeb2;
}

// Web2 counterpart to CampaignNodePreview.tsx — same layout, same shared
// ShipImageWeb2/ShipCard/HoverShipCardTooltip rendering for the enemy
// fleet preview (real art tiles + hover-to-inspect, not a text list).
export function CampaignNodePreviewWeb2({ node, campaign }: CampaignNodePreviewWeb2Props) {
  const [showFleetModal, setShowFleetModal] = React.useState(false);

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

  const fleetShips = React.useMemo(
    () =>
      placements.map((p, i) => {
        const previewShip = aiConfigToPreviewShipWeb2(p.config, i);
        return {
          key: `${p.config.id}-${i}`,
          name: p.config.name || ARCHETYPE_LABEL[p.config.archetype],
          renderImage: () => (
            <ShipImageWeb2 ship={previewShip} className="h-full w-full" showLoadingState={false} hideRankStars />
          ),
          renderHoverCard: () => (
            <ShipCard
              ship={toShipCardDataWeb2(previewShip)}
              shipImage={<ShipImageWeb2 ship={previewShip} className="h-full w-full" showLoadingState={false} />}
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
          ),
        };
      }),
    [placements],
  );

  return (
    <div
      className="relative grid grid-cols-1 gap-8 border-2 border-cyan p-6 font-mono md:grid-cols-2"
      style={{ borderRadius: 0 }}
    >
      <div className="flex flex-col">
        <h3 className="text-xl font-bold text-cyan">{node.title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{node.description}</p>
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

      <EnemyFleetPreview ships={fleetShips} totalCost={totalEnemyThreat} isLoading={isLoading} />

      {showFleetModal && (
        <NodeMatchModalWeb2
          node={node}
          requiredVariant={campaign.requiredVariant}
          onClose={() => setShowFleetModal(false)}
          onLaunched={() => setShowFleetModal(false)}
        />
      )}
    </div>
  );
}
