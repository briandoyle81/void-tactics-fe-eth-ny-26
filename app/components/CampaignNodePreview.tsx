"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useCampaignRequiredVariant, type CampaignGraphNode } from "../hooks/useNodeMap";
import { getNodeContent } from "../config/campaignNodes";
import {
  useGetAllAIShipConfigs,
  useGetMapPlacements,
} from "../hooks/useAIEncountersContract";
import type { AIShipConfig } from "../types/types";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";
import { HoverShipCardTooltip, type HoverAnchorRect } from "./HoverShipCardTooltip";
import { ARCHETYPE_LABEL, aiConfigToPreviewShip } from "../utils/aiShipConfig";
import { NodeMatchModal } from "./NodeMatchModal";
import { useNodeGameStatus } from "../hooks/useNodeGameStatus";
import { navigateToGame } from "../utils/navigateToGame";

interface HoveredShip {
  config: AIShipConfig;
  anchor: HoverAnchorRect;
  key: string;
}

interface CampaignNodePreviewProps {
  node: CampaignGraphNode;
}

// Detail panel for a selected node: enemy-fleet preview (from AIEncounters,
// unchanged by the migration — still keyed by mapId) plus the Launch
// Mission CTA that opens NodeMatchModal.
export function CampaignNodePreview({ node }: CampaignNodePreviewProps) {
  const { address, isConnected } = useAccount();
  const [showFleetModal, setShowFleetModal] = React.useState(false);
  const { activeGameId } = useNodeGameStatus(node.id);
  const [hoveredShip, setHoveredShip] = React.useState<HoveredShip | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const content = getNodeContent(node.id);
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

      <div className="border-t border-steel pt-4 md:border-t-0 md:border-l md:pl-8 md:pt-0">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs uppercase tracking-wider text-text-muted">
            Enemy Fleet
          </h4>
          {!placementsLoading && !configsLoading && enemyShips.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold text-amber bg-amber/10 border border-amber/40 rounded-none whitespace-nowrap">
              ACTUAL FLEET COST: {totalEnemyThreat}
            </span>
          )}
        </div>
        {placementsLoading || configsLoading ? (
          <p className="mt-2 text-xs text-text-muted">Loading encounter data...</p>
        ) : enemyShips.length === 0 ? (
          <p className="mt-2 text-xs text-warning-red">
            No AI content configured for this node&apos;s map yet.
          </p>
        ) : (
          <div
            className="mt-3 grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}
          >
            {enemyShips.map((config, i) =>
              config ? (
                <div
                  key={`${config.id.toString()}-${i}`}
                  className="flex min-w-0 flex-col gap-1"
                  onMouseEnter={(e) => {
                    const panelEl = panelRef.current;
                    if (!panelEl) return;
                    const tileRect = e.currentTarget.getBoundingClientRect();
                    const panelRect = panelEl.getBoundingClientRect();
                    setHoveredShip({
                      config,
                      key: `${config.id.toString()}-${i}`,
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
                    <ShipImage
                      ship={aiConfigToPreviewShip(config)}
                      className="h-full w-full"
                      showLoadingState={false}
                      hideRankStars
                    />
                  </div>
                  <span className="truncate text-center text-[9px] uppercase tracking-wider text-text-secondary">
                    {config.name || ARCHETYPE_LABEL[config.archetype]}
                  </span>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>

      {showFleetModal && (
        <NodeMatchModal
          node={node}
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
              ship={toShipCardData(aiConfigToPreviewShip(hoveredShip.config))}
              shipImage={
                <ShipImage
                  ship={aiConfigToPreviewShip(hoveredShip.config)}
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
