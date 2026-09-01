"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { RoguelikeNodeKind } from "../types/roguelike";
import {
  useRoguelikeCampaignNodesWeb2,
  useRoguelikeMatchWeb2,
  type RoguelikeNodeWeb2,
  type RoguelikeRunWeb2,
} from "../hooks/useRoguelikeWeb2";
import { useMapEnemyThreatWeb2 } from "../hooks/useMapEnemyThreatWeb2";
import { ARCHETYPE_LABEL } from "../utils/aiShipConfig";
import { aiConfigToPreviewShipWeb2 } from "../utils/aiShipConfigWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { buildRoguelikePrerequisites } from "../utils/roguelikeGraphLayout";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";
import { RoguelikeNodeCard, type RoguelikeNodeCardNode } from "./RoguelikeNodeCard";
import { RoguelikeCombatModalWeb2 } from "./RoguelikeCombatModalWeb2";
import { RoguelikeResupplyPanelWeb2 } from "./RoguelikeResupplyPanelWeb2";
import { EnemyFleetPreview } from "./EnemyFleetPreview";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import ShipCard from "./ShipCard";

interface RoguelikeGraphWeb2Props {
  run: RoguelikeRunWeb2;
  onRunEnded: () => void;
}

interface RoguelikeCanvasNode extends RoguelikeNodeCardNode {
  prerequisites: number[];
}

// Web2 counterpart to RoguelikeGraph.tsx — same full-map CampaignGraphCanvas
// view, number-native instead of bigint-native. One real difference: web2
// has no persisted branch-lockout (no equivalent of RoguelikeRun.isNodeLocked
// — see the RoguelikeNode/RoguelikeEdge Prisma models), so "unlocked" here
// means "adjacent to your current position" rather than "not locked out for
// this run." That's an honest match for what the web2 backend actually
// enforces today (enter-combat/enter-resupply only ever accept the current
// node or one of its direct children) — not a shortcut taken by this
// refactor.
export function RoguelikeGraphWeb2({ run, onRunEnded }: RoguelikeGraphWeb2Props) {
  const { retreatRun, enterResupplyNode } = useRoguelikeMatchWeb2();
  const [combatTargetNodeId, setCombatTargetNodeId] = React.useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [enteringResupply, setEnteringResupply] = React.useState<number | null>(null);
  const [isRetreating, setIsRetreating] = React.useState(false);

  const { nodes: campaignNodes, isLoading: nodesLoading } = useRoguelikeCampaignNodesWeb2(
    run.campaignId,
  );

  const byId = React.useMemo(
    () => new Map(campaignNodes.map((n) => [n.id, n])),
    [campaignNodes],
  );
  const currentNode = byId.get(run.currentNodeId);

  const defeatedSet = React.useMemo(() => new Set(run.defeatedNodeIds), [run.defeatedNodeIds]);

  const prerequisitesById = React.useMemo(
    () =>
      buildRoguelikePrerequisites(
        campaignNodes.map((n) => ({
          id: n.id,
          children: n.childEdges.map((e) => ({ childId: e.childId })),
        })),
      ),
    [campaignNodes],
  );

  const canvasNodes: RoguelikeCanvasNode[] = React.useMemo(
    () =>
      campaignNodes.map((n) => {
        const isCurrent = n.id === run.currentNodeId;
        const isAdjacent = isCurrent || !!currentNode?.childEdges.some((e) => e.childId === n.id);
        return {
          id: n.id,
          kind: n.kind as RoguelikeNodeKind,
          prerequisites: prerequisitesById.get(n.id) ?? [],
          // Resupply nodes have no "completed" concept — see doc-comment above.
          completed: n.kind === RoguelikeNodeKind.Combat ? defeatedSet.has(n.id) : false,
          unlocked: isAdjacent,
          isCurrent,
        };
      }),
    [campaignNodes, run.currentNodeId, currentNode, defeatedSet, prerequisitesById],
  );

  // Snap the selection back to "where you are" whenever your position
  // actually changes — see RoguelikeGraph.tsx's matching comment.
  React.useEffect(() => {
    setSelectedNodeId(run.currentNodeId);
  }, [run.currentNodeId]);

  const selectedNode: RoguelikeNodeWeb2 | undefined =
    selectedNodeId != null ? byId.get(selectedNodeId) : undefined;
  const isSelectedCurrentNode = !!selectedNode && selectedNode.id === run.currentNodeId;
  const isSelectedReachableChild =
    !!selectedNode &&
    !!currentNode &&
    currentNode.childEdges.some((e) => e.childId === selectedNode.id);
  const isSelectedNodeDefeated = !!selectedNode && defeatedSet.has(selectedNode.id);

  const isSelectedCombatNode = selectedNode?.kind === RoguelikeNodeKind.Combat;
  const { totalThreat: selectedNodeThreat, placements, isLoading: placementsLoading } =
    useMapEnemyThreatWeb2(isSelectedCombatNode ? selectedNode.mapId : undefined);

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

  const combatTargetNode = combatTargetNodeId != null ? byId.get(combatTargetNodeId) : undefined;

  const handleEnterResupply = async (nodeId: number) => {
    setEnteringResupply(nodeId);
    try {
      await enterResupplyNode(nodeId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to enter resupply node");
    } finally {
      setEnteringResupply(null);
    }
  };

  const handleRetreat = async () => {
    setIsRetreating(true);
    try {
      await retreatRun();
      toast.success("Run retreated.");
      onRunEnded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to retreat");
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
    return <RoguelikeResupplyPanelWeb2 run={run} node={currentNode} onDone={() => {}} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
        <div>
          <h3 className="text-xl font-bold text-cyan">[ROGUELIKE RUN]</h3>
          <p className="mt-1 text-xs text-text-muted">
            Roster: {run.roster.length} ships · Cost cap: {run.currentCostCap}
            {run.campaign.autoHealPercent > 0 && (
              <> · Auto-heal on win: {run.campaign.autoHealPercent}%</>
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
                [NODE #{selectedNode.id}] —{" "}
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
                isLoading={placementsLoading}
              />
            )}
          </div>
        )}
      </CampaignGraphCanvas>

      {combatTargetNodeId != null && combatTargetNode && (
        <RoguelikeCombatModalWeb2
          run={run}
          targetNode={combatTargetNode}
          onClose={() => setCombatTargetNodeId(null)}
          onLaunched={() => setCombatTargetNodeId(null)}
        />
      )}
    </div>
  );
}
