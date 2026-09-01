"use client";

import React from "react";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { RoguelikeNodeKind, type RoguelikeNode, type RoguelikeRun } from "../types/roguelike";
import {
  useAllRoguelikeNodes,
  useCampaignAutoHealPercent,
} from "../hooks/useRoguelikeNodeMap";
import { useAreRoguelikeNodesDefeated, useAreRoguelikeNodesLocked } from "../hooks/useRoguelikeRun";
import { useRoguelikeMatch } from "../hooks/useRoguelikeMatch";
import { useGetAllAIShipConfigs, useGetMapPlacements } from "../hooks/useAIEncountersContract";
import type { AIShipConfig } from "../types/types";
import { ARCHETYPE_LABEL, aiConfigToPreviewShip } from "../utils/aiShipConfig";
import { buildRoguelikePrerequisites } from "../utils/roguelikeGraphLayout";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";
import { RoguelikeNodeCard, type RoguelikeNodeCardNode } from "./RoguelikeNodeCard";
import { RoguelikeCombatModal } from "./RoguelikeCombatModal";
import { RoguelikeResupplyPanel } from "./RoguelikeResupplyPanel";
import { EnemyFleetPreview } from "./EnemyFleetPreview";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";

interface RoguelikeGraphProps {
  run: RoguelikeRun;
  onRunEnded: () => void;
  /** Called after enterResupplyNode succeeds — unlike enterCombatNode
   * (which navigates away to the game, so the parent naturally refetches on
   * return), resupply keeps the player on this screen, so `run.currentNodeId`
   * needs an explicit refetch to stop pointing at the node just left. */
  onRunAdvanced: () => void;
}

interface RoguelikeCanvasNode extends RoguelikeNodeCardNode {
  prerequisites: number[];
}

// Active-run view: the whole campaign map, same visual system as the
// original campaign's CampaignGraph.tsx (CampaignGraphCanvas — depth-tiered
// columns, SVG prerequisite lanes, starfield backdrop), fed prerequisites
// inverted from RoguelikeNodeMap's children-with-lockout edges (see
// buildRoguelikePrerequisites). Interaction stays scoped to what's actually
// enterable today — the current node, or one of its direct children — same
// as before this used the shared canvas; walking back across a twoWay edge
// to an already-left node isn't surfaced as an action here (a real
// contract-level option that was never wired up, not something this
// refactor adds).
export function RoguelikeGraph({ run, onRunEnded, onRunAdvanced }: RoguelikeGraphProps) {
  const { address } = useAccount();
  const { retreatRun, enterResupplyNode } = useRoguelikeMatch();
  const [combatTargetNodeId, setCombatTargetNodeId] = React.useState<bigint | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [enteringResupply, setEnteringResupply] = React.useState<bigint | null>(null);
  const [isRetreating, setIsRetreating] = React.useState(false);

  const { nodes: allNodes, isLoading: nodesLoading } = useAllRoguelikeNodes();
  const { data: autoHealPercent } = useCampaignAutoHealPercent(run.campaignId);

  const campaignNodes = React.useMemo(
    () => allNodes.filter((n) => n.campaignId === run.campaignId),
    [allNodes, run.campaignId],
  );
  const nodeIds = React.useMemo(() => campaignNodes.map((n) => n.id), [campaignNodes]);
  const byNumberId = React.useMemo(
    () => new Map(campaignNodes.map((n) => [Number(n.id), n])),
    [campaignNodes],
  );
  const currentNode = byNumberId.get(Number(run.currentNodeId));

  const { lockedByNodeId } = useAreRoguelikeNodesLocked(address, nodeIds);
  const { defeatedByNodeId } = useAreRoguelikeNodesDefeated(address, nodeIds);

  const prerequisitesByNumberId = React.useMemo(
    () =>
      buildRoguelikePrerequisites(
        campaignNodes.map((n) => ({
          id: Number(n.id),
          children: n.children.map((e) => ({ childId: Number(e.childId) })),
        })),
      ),
    [campaignNodes],
  );

  const canvasNodes: RoguelikeCanvasNode[] = React.useMemo(
    () =>
      campaignNodes.map((n) => {
        const idNum = Number(n.id);
        const isCurrent = n.id === run.currentNodeId;
        return {
          id: idNum,
          kind: n.kind,
          prerequisites: prerequisitesByNumberId.get(idNum) ?? [],
          // Resupply nodes have no on-chain "completed" concept (only
          // isNodeDefeated, which only applies to Combat nodes) — they
          // never render as cleared, only as your current position or a
          // reachable/locked stop on the map.
          completed: n.kind === RoguelikeNodeKind.Combat ? !!defeatedByNodeId.get(n.id.toString()) : false,
          unlocked: isCurrent ? true : !lockedByNodeId.get(n.id.toString()),
          isCurrent,
        };
      }),
    [campaignNodes, run.currentNodeId, defeatedByNodeId, lockedByNodeId, prerequisitesByNumberId],
  );

  // Snap the selection back to "where you are" whenever your position
  // actually changes (entering a node) — same intent as CampaignGraph.tsx
  // restoring a saved selection, but here "the interesting node" is always
  // your current position rather than something worth persisting.
  React.useEffect(() => {
    setSelectedNodeId(Number(run.currentNodeId));
  }, [run.currentNodeId]);

  const selectedNode: RoguelikeNode | undefined =
    selectedNodeId != null ? byNumberId.get(selectedNodeId) : undefined;
  const isSelectedCurrentNode = !!selectedNode && selectedNode.id === run.currentNodeId;
  const isSelectedReachableChild =
    !!selectedNode &&
    !!currentNode &&
    currentNode.children.some((e) => e.childId === selectedNode.id) &&
    !lockedByNodeId.get(selectedNode.id.toString());
  const isSelectedNodeDefeated = selectedNode
    ? !!defeatedByNodeId.get(selectedNode.id.toString())
    : false;

  const isSelectedCombatNode = selectedNode?.kind === RoguelikeNodeKind.Combat;
  const { data: placements, isLoading: placementsLoading } = useGetMapPlacements(
    isSelectedCombatNode ? selectedNode.mapId : undefined,
  );
  const { data: allConfigs, isLoading: configsLoading } = useGetAllAIShipConfigs();

  const configById = React.useMemo(() => {
    const map = new Map<string, AIShipConfig>();
    (allConfigs ?? []).forEach((c) => map.set(c.id.toString(), c));
    return map;
  }, [allConfigs]);

  const enemyShipConfigs = React.useMemo(() => {
    if (!placements) return [];
    return placements.configIds.map((configId) => configById.get(configId.toString()));
  }, [placements, configById]);

  const fleetShips = React.useMemo(
    () =>
      enemyShipConfigs.flatMap((config, i) => {
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
    [enemyShipConfigs],
  );

  const selectedNodeThreat = React.useMemo(
    () =>
      enemyShipConfigs.reduce(
        (sum, config) => sum + (config ? aiConfigToPreviewShip(config).shipData.cost : 0),
        0,
      ),
    [enemyShipConfigs],
  );

  const combatTargetNode =
    combatTargetNodeId != null ? byNumberId.get(Number(combatTargetNodeId)) : undefined;

  const handleEnterResupply = async (nodeId: bigint) => {
    setEnteringResupply(nodeId);
    try {
      await enterResupplyNode(nodeId);
      onRunAdvanced();
    } catch (error) {
      console.error("Failed to enter resupply node:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("CannotAdvance")) {
        toast.error("This node isn't reachable from your current position.");
      } else if (message.includes("WrongNodeKind")) {
        toast.error("This node isn't a resupply node.");
      } else {
        toast.error(`Failed to enter resupply node: ${message}`);
      }
    } finally {
      setEnteringResupply(null);
    }
  };

  // A live combat match (run.activeGameId != 0) must be forfeited first —
  // retreatRun(0) alone reverts ActiveGameInProgress while one is still in
  // progress. Forfeiting doesn't necessarily end the run by itself, so
  // retreatRun(0) still follows; if forfeiting already ended it, that
  // second call reverts NoActiveRun, which is treated as success rather
  // than a real failure. See docs/update/Frontend_Updates_2026-08-26.md.
  const handleRetreat = async () => {
    setIsRetreating(true);
    try {
      if (run.activeGameId !== 0n) {
        await retreatRun(run.activeGameId);
      }
      try {
        await retreatRun(0n);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("NoActiveRun")) throw error;
      }
      toast.success("Run retreated.");
      onRunEnded();
    } catch (error) {
      console.error("Failed to retreat run:", error);
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("ActiveGameInProgress")) {
        toast.error(
          "A match is still in progress — return to it or let it finish before retreating.",
        );
      } else {
        toast.error(`Failed to retreat: ${message}`);
      }
    } finally {
      setIsRetreating(false);
    }
  };

  if (nodesLoading || !currentNode) {
    return (
      <div className="border-2 border-cyan p-6 font-mono text-sm text-text-muted" style={{ borderRadius: 0 }}>
        Loading run position…
      </div>
    );
  }

  if (currentNode.kind === RoguelikeNodeKind.Resupply) {
    return <RoguelikeResupplyPanel run={run} node={currentNode} onDone={onRunAdvanced} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
        <div>
          <h3 className="text-xl font-bold text-cyan">[ROGUELIKE RUN]</h3>
          <p className="mt-1 text-xs text-text-muted">
            Roster: {run.rosterShipIds.length} ships · Cost cap: {run.currentCostCap.toString()}
            {autoHealPercent != null && autoHealPercent > 0 && (
              <> · Auto-heal on win: {autoHealPercent}%</>
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={isRetreating}
          onClick={() => void handleRetreat()}
          className="border-2 border-warning-red px-4 py-2 text-xs font-bold uppercase tracking-wider text-warning-red transition-colors hover:bg-warning-red/10 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {isRetreating ? "[RETREATING...]" : "[RETREAT RUN]"}
        </button>
      </div>

      <CampaignGraphCanvas
        nodes={canvasNodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        renderNode={(node, isSelected, onSelect) => (
          <RoguelikeNodeCard node={node} isSelected={isSelected} onSelect={onSelect} />
        )}
      >
        {selectedNode && (
          <div
            className="grid grid-cols-1 gap-8 border-2 border-cyan p-6 font-mono md:grid-cols-2"
            style={{ borderRadius: 0 }}
          >
            <div className="flex flex-col">
              <h4 className="text-lg font-bold text-cyan">
                [NODE #{selectedNode.id.toString()}] —{" "}
                {selectedNode.kind === RoguelikeNodeKind.Combat ? "COMBAT" : "RESUPPLY"}
              </h4>
              {isSelectedCombatNode && isSelectedNodeDefeated && !isSelectedCurrentNode && (
                <p className="mt-2 text-sm text-phosphor-green">Cleared.</p>
              )}

              <div className="mt-4">
                {isSelectedCurrentNode ? (
                  isSelectedNodeDefeated ? (
                    <p className="text-sm text-phosphor-green">
                      This node is cleared — pick where to go next above.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCombatTargetNodeId(selectedNode.id)}
                      className="self-start border-2 border-phosphor-green px-4 py-2 text-xs font-bold uppercase tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10"
                      style={{ borderRadius: 0 }}
                    >
                      [FIGHT THIS NODE]
                    </button>
                  )
                ) : isSelectedReachableChild ? (
                  selectedNode.kind === RoguelikeNodeKind.Combat ? (
                    <button
                      type="button"
                      disabled={isSelectedNodeDefeated}
                      onClick={() => setCombatTargetNodeId(selectedNode.id)}
                      className="self-start border-2 border-cyan px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderRadius: 0 }}
                    >
                      {isSelectedNodeDefeated ? "[ALREADY CLEARED]" : "[ENTER COMBAT]"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={enteringResupply === selectedNode.id}
                      onClick={() => void handleEnterResupply(selectedNode.id)}
                      className="self-start border-2 border-cyan px-4 py-2 text-xs font-bold uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ borderRadius: 0 }}
                    >
                      {enteringResupply === selectedNode.id ? "[ENTERING...]" : "[ENTER RESUPPLY]"}
                    </button>
                  )
                ) : (
                  <p className="text-sm text-text-muted">
                    Not reachable from your current position.
                  </p>
                )}
              </div>
            </div>

            {isSelectedCombatNode && (
              <EnemyFleetPreview
                ships={fleetShips}
                totalCost={selectedNodeThreat}
                isLoading={placementsLoading || configsLoading}
              />
            )}
          </div>
        )}
      </CampaignGraphCanvas>

      {combatTargetNodeId != null && combatTargetNode && (
        <RoguelikeCombatModal
          run={run}
          targetNode={combatTargetNode}
          onClose={() => setCombatTargetNodeId(null)}
          onLaunched={() => setCombatTargetNodeId(null)}
        />
      )}
    </div>
  );
}
