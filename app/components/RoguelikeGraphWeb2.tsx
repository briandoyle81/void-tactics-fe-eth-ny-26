"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { RoguelikeNodeKind } from "../types/roguelike";
import {
  useRoguelikeCampaignNodesWeb2WithContent,
  useRoguelikeCampaignWeb2,
  useRoguelikeMatchWeb2,
  type RoguelikeNodeWeb2WithContent,
  type RoguelikeRunWeb2,
} from "../hooks/useRoguelikeWeb2";
import { useRoguelikeAdminWeb2 } from "../hooks/useRoguelikeAdminWeb2";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useMapEnemyThreatWeb2 } from "../hooks/useMapEnemyThreatWeb2";
import { ARCHETYPE_LABEL } from "../utils/aiShipConfig";
import { aiConfigToPreviewShipWeb2 } from "../utils/aiShipConfigWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { buildRoguelikePrerequisites } from "../utils/roguelikeGraphLayout";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";
import { RoguelikeNodeCard, type RoguelikeNodeCardNode } from "./RoguelikeNodeCard";
import { RoguelikeCombatModalWeb2 } from "./RoguelikeCombatModalWeb2";
import { RoguelikeResupplyPanelWeb2 } from "./RoguelikeResupplyPanelWeb2";
import { RoguelikeNodeEditPanelWeb2 } from "./RoguelikeNodeEditPanelWeb2";
import { RoguelikeSettingsModalWeb2 } from "./RoguelikeSettingsModalWeb2";
import { CampaignEditModeToggle } from "./CampaignEditModeToggle";
import { EnemyFleetPreview } from "./EnemyFleetPreview";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import ShipCard from "./ShipCard";

const DEFAULT_ROGUELIKE_CAMPAIGN_ID = 1;
const ADD_NODE_SENTINEL_ID = Number.MAX_SAFE_INTEGER;

interface RoguelikeGraphWeb2Props {
  /** Null in the run-less "browse/edit" entry point — see RoguelikeGraph.tsx's matching prop doc. */
  run: RoguelikeRunWeb2 | null;
  onRunEnded: () => void;
}

interface RoguelikeCanvasNode extends RoguelikeNodeCardNode {
  prerequisites: number[];
  title: string;
  editMode: boolean;
  connectHighlight: "source" | "candidate" | "invalid" | undefined;
}

// Web2 counterpart to RoguelikeGraph.tsx — same full-map CampaignGraphCanvas
// view, number-native instead of bigint-native, same Edit Mode/browse-mode
// support. One real difference (unchanged from before this feature):
// web2 has no persisted branch-lockout (no equivalent of
// RoguelikeRun.isNodeLocked), so "unlocked" here means "adjacent to your
// current position" rather than "not locked out for this run" — see the
// original doc-comment this file carried before Edit Mode was added.
export function RoguelikeGraphWeb2({ run, onRunEnded }: RoguelikeGraphWeb2Props) {
  const { retreatRun, enterResupplyNode } = useRoguelikeMatchWeb2();
  const isEditor = useWeb2Admin();
  const admin = useRoguelikeAdminWeb2();
  const [combatTargetNodeId, setCombatTargetNodeId] = React.useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [enteringResupply, setEnteringResupply] = React.useState<number | null>(null);
  const [isRetreating, setIsRetreating] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [connectMode, setConnectMode] = React.useState<{ sourceNodeId: number; twoWay: boolean } | null>(
    null,
  );
  const [showSettings, setShowSettings] = React.useState(false);

  const isBrowseMode = run == null;
  const campaignId = run?.campaignId ?? DEFAULT_ROGUELIKE_CAMPAIGN_ID;

  const { nodes: campaignNodes, isLoading: nodesLoading, refetch: refetchNodes } =
    useRoguelikeCampaignNodesWeb2WithContent(campaignId);
  const { campaign, refetch: refetchCampaign } = useRoguelikeCampaignWeb2(campaignId);

  const byId = React.useMemo(
    () => new Map(campaignNodes.map((n) => [n.id, n])),
    [campaignNodes],
  );
  const currentNode = isBrowseMode ? undefined : byId.get(run.currentNodeId);

  const defeatedSet = React.useMemo(
    () => new Set(isBrowseMode ? [] : run.defeatedNodeIds),
    [isBrowseMode, run],
  );

  const isCreatingNode = selectedNodeId === ADD_NODE_SENTINEL_ID;

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
        const isCurrent = !isBrowseMode && n.id === run.currentNodeId;
        const isAdjacent = isCurrent || !!currentNode?.childEdges.some((e) => e.childId === n.id);
        const isConnectSource = connectMode?.sourceNodeId === n.id;
        return {
          id: n.id,
          kind: n.kind as RoguelikeNodeKind,
          prerequisites: prerequisitesById.get(n.id) ?? [],
          completed: n.kind === RoguelikeNodeKind.Combat ? defeatedSet.has(n.id) : false,
          unlocked: isBrowseMode ? true : isAdjacent,
          isCurrent,
          title: n.title,
          editMode,
          connectHighlight: !connectMode ? undefined : isConnectSource ? "source" : "candidate",
        };
      }),
    [campaignNodes, isBrowseMode, run, currentNode, defeatedSet, prerequisitesById, editMode, connectMode],
  );
  if (editMode) {
    canvasNodes.push({
      id: ADD_NODE_SENTINEL_ID,
      kind: RoguelikeNodeKind.Combat,
      prerequisites: [],
      completed: false,
      unlocked: true,
      isCurrent: false,
      title: "+ ADD NODE",
      editMode: true,
      connectHighlight: connectMode ? "invalid" : undefined,
    });
  }

  // Snap the selection back to "where you are" whenever your position
  // actually changes — see RoguelikeGraph.tsx's matching comment. Browse
  // mode has no current position, so selection is left alone.
  React.useEffect(() => {
    if (!isBrowseMode) setSelectedNodeId(run.currentNodeId);
  }, [isBrowseMode, run?.currentNodeId]);

  React.useEffect(() => {
    if (!editMode) {
      setConnectMode(null);
      if (isCreatingNode) setSelectedNodeId(isBrowseMode ? null : run!.currentNodeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  const selectedNode: RoguelikeNodeWeb2WithContent | undefined =
    !isCreatingNode && selectedNodeId != null ? byId.get(selectedNodeId) : undefined;
  const isSelectedCurrentNode = !isBrowseMode && !!selectedNode && selectedNode.id === run.currentNodeId;
  const isSelectedReachableChild =
    !isBrowseMode &&
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
    if (isBrowseMode) return;
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

  const handleConnectTarget = async (
    targetNode: RoguelikeNodeWeb2WithContent,
    sourceNodeId: number,
    twoWay: boolean,
  ) => {
    try {
      await admin.addChild(sourceNodeId, targetNode.id, twoWay);
      toast.success(`Node #${targetNode.id} linked as a child.`);
      await refetchNodes();
    } catch (error) {
      console.error("Failed to add child edge:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add child edge");
    } finally {
      setConnectMode(null);
    }
  };

  const handleSelectNode = (id: number) => {
    if (connectMode) {
      if (id === connectMode.sourceNodeId || id === ADD_NODE_SENTINEL_ID) return;
      const targetNode = byId.get(id);
      if (targetNode) void handleConnectTarget(targetNode, connectMode.sourceNodeId, connectMode.twoWay);
      return;
    }
    if (id === ADD_NODE_SENTINEL_ID) {
      setSelectedNodeId(ADD_NODE_SENTINEL_ID);
      return;
    }
    setSelectedNodeId(id);
  };

  if (nodesLoading || (!isBrowseMode && !currentNode)) {
    return (
      <div className="border-2 border-cyan p-6 font-mono text-sm text-text-muted" style={{ borderRadius: 0 }}>
        Loading run position…
      </div>
    );
  }

  if (!isBrowseMode && !editMode && currentNode!.kind === RoguelikeNodeKind.Resupply) {
    return <RoguelikeResupplyPanelWeb2 run={run} node={currentNode!} onDone={() => {}} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
        <div>
          <h3 className="text-xl font-bold text-cyan">
            {isBrowseMode ? "[EDIT CAMPAIGN MAP]" : "[ROGUELIKE RUN]"}
          </h3>
          {!isBrowseMode && (
            <p className="mt-1 text-xs text-text-muted">
              Roster: {run.roster.length} ships · Cost cap: {run.currentCostCap}
              {campaign != null && campaign.autoHealPercent > 0 && (
                <> · Auto-heal on win: {campaign.autoHealPercent}%</>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CampaignEditModeToggle
            isEditor={isEditor}
            editMode={editMode}
            onToggle={() => setEditMode((v) => !v)}
          />
          {editMode && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="border-2 border-amber px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber hover:bg-amber/10"
              style={{ borderRadius: 0 }}
            >
              [CAMPAIGN SETTINGS]
            </button>
          )}
          {!isBrowseMode && (
            <button
              type="button"
              disabled={isRetreating}
              onClick={() => void handleRetreat()}
              className="border-2 border-warning-red px-4 py-2 text-xs font-bold uppercase tracking-wider text-warning-red transition-colors hover:bg-warning-red/10 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {isRetreating ? "[RETREATING...]" : "[RETREAT RUN]"}
            </button>
          )}
          {isBrowseMode && (
            <button
              type="button"
              onClick={onRunEnded}
              className="border-2 border-gunmetal px-4 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors hover:border-steel hover:text-text-primary"
              style={{ borderRadius: 0 }}
            >
              [EXIT MAP EDITOR]
            </button>
          )}
        </div>
      </div>

      <CampaignGraphCanvas
        nodes={canvasNodes}
        selectedNodeId={selectedNodeId}
        onSelectNode={handleSelectNode}
        renderNode={(node, isSelected, onSelect) => (
          <RoguelikeNodeCard
            node={node}
            isSelected={isSelected}
            onSelect={onSelect}
            title={node.title}
            editMode={node.editMode}
            connectHighlight={node.connectHighlight}
          />
        )}
      >
        {connectMode && (
          <div
            className="flex items-center justify-between border-2 border-amber px-4 py-3 font-mono text-sm text-amber"
            style={{ borderRadius: 0 }}
          >
            <span>Click the node this one leads to (node #{connectMode.sourceNodeId}).</span>
            <button
              type="button"
              onClick={() => setConnectMode(null)}
              className="border border-amber px-3 py-1 text-xs uppercase tracking-wider hover:bg-amber/10"
            >
              Cancel
            </button>
          </div>
        )}

        {editMode ? (
          <RoguelikeNodeEditPanelWeb2
            mode={isCreatingNode ? "create" : "edit"}
            node={selectedNode ?? null}
            campaignId={campaignId}
            connectModeActive={!!selectedNode && connectMode?.sourceNodeId === selectedNode.id}
            onStartConnectMode={(sourceNodeId) => setConnectMode({ sourceNodeId, twoWay: false })}
            onCancelConnectMode={() => setConnectMode(null)}
            onSaved={() => void refetchNodes()}
            onCreated={() => {
              setSelectedNodeId(isBrowseMode ? null : run!.currentNodeId);
              void refetchNodes();
            }}
            onCancelCreate={() => setSelectedNodeId(isBrowseMode ? null : run!.currentNodeId)}
          />
        ) : (
          selectedNode && (
            <div
              className="grid grid-cols-1 gap-8 border-2 border-cyan p-6 font-mono md:grid-cols-2"
              style={{ borderRadius: 0 }}
            >
              <div className="flex flex-col">
                <h4 className="text-lg font-bold text-cyan">{selectedNode.title}</h4>
                <p className="mt-1 text-xs uppercase tracking-wider text-text-muted">
                  {selectedNode.kind === RoguelikeNodeKind.Combat ? "Combat" : "Resupply"} · Node #
                  {selectedNode.id}
                </p>
                <p className="mt-2 text-sm text-text-secondary">{selectedNode.description}</p>
                {isSelectedCombatNode && isSelectedNodeDefeated && !isSelectedCurrentNode && (
                  <p className="mt-2 text-sm text-phosphor-green">Cleared.</p>
                )}

                <div className="mt-4">
                  {isBrowseMode ? (
                    <p className="text-sm text-text-muted">Start a run to enter this node.</p>
                  ) : isSelectedCurrentNode ? (
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
          )
        )}
      </CampaignGraphCanvas>

      {combatTargetNodeId != null && combatTargetNode && !isBrowseMode && (
        <RoguelikeCombatModalWeb2
          run={run}
          targetNode={combatTargetNode}
          onClose={() => setCombatTargetNodeId(null)}
          onLaunched={() => setCombatTargetNodeId(null)}
        />
      )}

      {showSettings && campaign && (
        <RoguelikeSettingsModalWeb2
          campaign={campaign}
          nodeIds={campaignNodes.map((n) => n.id)}
          onClose={() => setShowSettings(false)}
          onSaved={() => void refetchCampaign()}
        />
      )}
    </div>
  );
}
