"use client";

import React from "react";
import { MissionBriefing } from "./MissionBriefing";
import { MissionNodePanel } from "./MissionNodePanel";
import { MissionDossier } from "./MissionDossier";
import { campaignDossierRows } from "../utils/missionDossierRows";
import { useAccount } from "wagmi";
import { useCampaignRequiredVariant, type CampaignGraphNodeWithContent } from "../hooks/useNodeMap";
import {
  useGetAllAIShipConfigs,
  useGetMapPlacements,
} from "../hooks/useAIEncountersContract";
import type { AIShipConfig } from "../types/types";
import { aiConfigToPreviewShip } from "../utils/aiShipConfig";
import { NodeMatchModal } from "./NodeMatchModal";
import { useNodeGameStatus } from "../hooks/useNodeGameStatus";
import { navigateToGame } from "../utils/navigateToGame";

interface CampaignNodePreviewProps {
  node: CampaignGraphNodeWithContent;
}

// Detail panel for a selected node: enemy-fleet preview (from AIEncounters,
// unchanged by the migration — still keyed by mapId) plus the Launch
// Mission CTA that opens NodeMatchModal.
export function CampaignNodePreview({ node }: CampaignNodePreviewProps) {
  const { address, isConnected } = useAccount();
  const [showFleetModal, setShowFleetModal] = React.useState(false);
  const { activeGameId } = useNodeGameStatus(node.id);
  const { data: requiredVariant } = useCampaignRequiredVariant(node.campaignId);

  const { data: placements, isLoading: placementsLoading } = useGetMapPlacements(
    node.mapId,
  );
  const { data: allConfigs, isLoading: configsLoading } = useGetAllAIShipConfigs();

  const configById = React.useMemo(() => {
    const map = new Map<string, AIShipConfig>();
    (allConfigs ?? []).forEach((c) => map.set(c.id.toString(), c));
    return map;
  }, [allConfigs]);

  const enemyShips = React.useMemo(() => {
    if (!placements) return [];
    return placements.configIds.map((configId) => configById.get(configId.toString()));
  }, [placements, configById]);

  const totalEnemyThreat = React.useMemo(
    () =>
      enemyShips.reduce(
        (sum, config) => sum + (config ? aiConfigToPreviewShip(config).shipData.cost : 0),
        0,
      ),
    [enemyShips],
  );

  return (
    <MissionNodePanel
      title={node.title}
      titleStatus={node.titleStatus}
      meta={<>Mission · Node #{node.id.toString()}</>}
      briefing={
        <MissionBriefing
          mission={{ kind: "campaign", nodeId: Number(node.id) }}
          text={node.description}
          status={node.descriptionStatus}
        />
      }
      dossier={
        <MissionDossier
          forces={{
            enemyShips: placementsLoading || configsLoading ? null : enemyShips.filter(Boolean).length,
            enemy: placementsLoading || configsLoading ? null : totalEnemyThreat,
            yours: Number(node.costLimit),
            yoursLabel: "Your fleet limit",
          }}
          rows={campaignDossierRows({
            maxScore: Number(node.maxScore),
            creatorGoesFirst: node.creatorGoesFirst,
            requiredVariant: requiredVariant ?? 0,
            unlocked: node.unlocked,
            completed: node.completed,
          })}
          action={
            <button
              type="button"
              onClick={() => {
                if (activeGameId != null) {
                  navigateToGame(address, activeGameId);
                } else {
                  setShowFleetModal(true);
                }
              }}
              disabled={!node.unlocked || !isConnected}
              className={`border-2 px-4 py-2 text-sm font-bold tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                activeGameId != null
                  ? "border-warning-red text-warning-red hover:bg-warning-red/10"
                  : "border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10"
              }`}
              style={{ borderRadius: 0 }}
              title={
                !isConnected
                  ? "Connect a wallet to launch"
                  : !node.unlocked
                    ? "Not unlocked yet"
                    : undefined
              }
            >
              {activeGameId != null
                ? "[ENTER COMBAT]"
                : node.completed
                  ? "[REPLAY MISSION]"
                  : "[LAUNCH MISSION]"}
            </button>
          }
        />
      }
    >
      {showFleetModal && (
        <NodeMatchModal
          node={node}
          onClose={() => setShowFleetModal(false)}
          onLaunched={() => setShowFleetModal(false)}
        />
      )}
    </MissionNodePanel>
  );
}
