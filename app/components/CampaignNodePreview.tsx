"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useCampaignRequiredVariant, type CampaignGraphNodeWithContent } from "../hooks/useNodeMap";
import {
  useGetAllAIShipConfigs,
  useGetMapPlacements,
} from "../hooks/useAIEncountersContract";
import type { AIShipConfig } from "../types/types";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";
import { ARCHETYPE_LABEL, aiConfigToPreviewShip } from "../utils/aiShipConfig";
import { NodeMatchModal } from "./NodeMatchModal";
import { useNodeGameStatus } from "../hooks/useNodeGameStatus";
import { navigateToGame } from "../utils/navigateToGame";
import { EnemyFleetPreview } from "./EnemyFleetPreview";

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

  const fleetShips = React.useMemo(
    () =>
      enemyShips.flatMap((config, i) => {
        if (!config) return [];
        const previewShip = aiConfigToPreviewShip(config);
        return [
          {
            key: `${config.id.toString()}-${i}`,
            name: config.name || ARCHETYPE_LABEL[config.archetype],
            renderImage: () => (
              <ShipImage ship={previewShip} className="h-full w-full" showLoadingState={false} hideRankStars />
            ),
            renderHoverCard: () => (
              <ShipCard
                ship={toShipCardData(previewShip)}
                shipImage={<ShipImage ship={previewShip} className="h-full w-full" showLoadingState={false} />}
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
          },
        ];
      }),
    [enemyShips],
  );

  const totalEnemyThreat = React.useMemo(
    () =>
      enemyShips.reduce(
        (sum, config) => sum + (config ? aiConfigToPreviewShip(config).shipData.cost : 0),
        0,
      ),
    [enemyShips],
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
            Player cost limit: <span className="text-cyan">{node.costLimit.toString()}</span>
          </span>
        </div>
        {!!requiredVariant && (
          <div className="mt-2 inline-flex w-fit items-center gap-1.5 border border-amber/40 bg-amber/10 px-2 py-1 text-[10px] uppercase tracking-wider text-amber">
            Requires Faction {requiredVariant} fleet
          </div>
        )}
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
          className={`mt-6 self-start border-2 px-4 py-2 text-sm font-bold tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
      </div>

      <EnemyFleetPreview
        ships={fleetShips}
        totalCost={totalEnemyThreat}
        isLoading={placementsLoading || configsLoading}
      />

      {showFleetModal && (
        <NodeMatchModal
          node={node}
          onClose={() => setShowFleetModal(false)}
          onLaunched={() => setShowFleetModal(false)}
        />
      )}
    </div>
  );
}
