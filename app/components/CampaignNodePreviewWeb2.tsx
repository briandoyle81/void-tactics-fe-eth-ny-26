"use client";

import React from "react";
import { MissionBriefing } from "./MissionBriefing";
import { MissionNodePanel } from "./MissionNodePanel";
import { MissionDossier } from "./MissionDossier";
import { campaignDossierRows } from "../utils/missionDossierRows";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { NodeMatchModalWeb2 } from "./NodeMatchModalWeb2";
import { aiConfigToPreviewShipWeb2 } from "../utils/aiShipConfigWeb2";
import type { CampaignWeb2NodeWithContent, CampaignWeb2 } from "../hooks/useCampaignWeb2";
import type { AIMapPlacementWeb2 } from "../hooks/useMapEnemyThreatWeb2";

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

  return (
    <MissionNodePanel
      title={node.title}
      titleStatus={node.titleStatus}
      meta={<>Mission · Node #{node.id}</>}
      briefing={
        <MissionBriefing
          mission={{ kind: "campaign", nodeId: node.id }}
          text={node.description}
          status={node.descriptionStatus}
        />
      }
      dossier={
        <MissionDossier
          forces={{
            enemyShips: isLoading ? null : placements.length,
            enemy: isLoading ? null : totalEnemyThreat,
            yours: node.costLimit,
            yoursLabel: "Your fleet limit",
          }}
          rows={campaignDossierRows({
            maxScore: node.maxScore,
            creatorGoesFirst: node.creatorGoesFirst,
            requiredVariant: campaign.requiredVariant,
            unlocked: node.unlocked,
            completed: node.completed,
          })}
          action={
            <button
              type="button"
              onClick={() => setShowFleetModal(true)}
              disabled={!node.unlocked}
              className="border-2 border-phosphor-green px-4 py-2 text-sm font-bold tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderRadius: 0 }}
              title={!node.unlocked ? "Not unlocked yet" : undefined}
            >
              {node.completed ? "[REPLAY MISSION]" : "[LAUNCH MISSION]"}
            </button>
          }
        />
      }
    >
      {showFleetModal && (
        <NodeMatchModalWeb2
          node={node}
          requiredVariant={campaign.requiredVariant}
          onClose={() => setShowFleetModal(false)}
          onLaunched={() => setShowFleetModal(false)}
        />
      )}
    </MissionNodePanel>
  );
}
