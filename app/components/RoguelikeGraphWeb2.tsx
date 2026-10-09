"use client";

import React from "react";
import { MissionBriefing } from "./MissionBriefing";
import { MissionDossier } from "./MissionDossier";
import { useRoguelikeVictoryEffectsWeb2 } from "../hooks/useRoguelikeVictoryEffects";
import {
  roguelikeCombatDossierRows,
  roguelikeResupplyDossierRows,
} from "../utils/missionDossierRows";
import type { NodeContentStatus } from "../hooks/useNodeContent";
import { toast } from "react-hot-toast";
import { RoguelikeNodeKind } from "../types/roguelike";
import {
  useRoguelikeCampaignNodesWeb2WithContent,
  useRoguelikeCampaignWeb2,
  useRoguelikeMatchWeb2,
  type RoguelikeNodeWeb2WithContent,
  type RoguelikeRosterEntryWeb2,
  type RoguelikeRunWeb2,
} from "../hooks/useRoguelikeWeb2";
import { useRoguelikeAdminWeb2 } from "../hooks/useRoguelikeAdminWeb2";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useMapEnemyThreatWeb2 } from "../hooks/useMapEnemyThreatWeb2";
import { buildRoguelikePrerequisites } from "../utils/roguelikeGraphLayout";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";
import { RoguelikeNodeCard, type RoguelikeNodeCardNode } from "./RoguelikeNodeCard";
import { RoguelikeCombatModalWeb2 } from "./RoguelikeCombatModalWeb2";
import { RoguelikeResupplyPanelWeb2 } from "./RoguelikeResupplyPanelWeb2";
import { RoguelikeNodeEditPanelWeb2 } from "./RoguelikeNodeEditPanelWeb2";
import { RoguelikeSettingsModalWeb2 } from "./RoguelikeSettingsModalWeb2";
import { CampaignEditModeToggle } from "./CampaignEditModeToggle";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import { OperationsMap } from "./operations/OperationsMap";
import { ART_SLOTS } from "../config/art";
import { MissionDrawerContent } from "./operations/MissionDrawerContent";
import { RunActionBar } from "./operations/RunActionBar";
import { NodeEditorModal } from "./operations/NodeEditorModal";
import { RetreatRunConfirmModal } from "./operations/RetreatRunConfirmModal";
import { useRunRosterHullWeb2 } from "../hooks/useRunRosterHull";
import { getRunMapAction } from "../utils/runMapAction";
import { aiConfigToPreviewShipWeb2 } from "../utils/aiShipConfigWeb2";

const DEFAULT_ROGUELIKE_CAMPAIGN_ID = 1;
const ADD_NODE_SENTINEL_ID = Number.MAX_SAFE_INTEGER;
const MISSION_EDIT_MODE_KEY = "mission-edit-mode-web2";
const MISSION_SELECTED_NODE_KEY = "mission-selected-node-web2";
const NO_ROSTER: RoguelikeRosterEntryWeb2[] = [];
const OPS_TOOLBAR_BUTTON =
  "border border-solid px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50";

interface RoguelikeGraphWeb2Props {
  /** Null when the player has no run — see RoguelikeGraph.tsx's matching prop doc. */
  run: RoguelikeRunWeb2 | null;
  onRunEnded: () => void;
  /** Run-less preview only: opens fleet selection to start a run. */
  onStartRun?: () => void;
}

interface RoguelikeCanvasNode extends RoguelikeNodeCardNode {
  prerequisites: number[];
  title: string;
  titleStatus: NodeContentStatus;
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
export function RoguelikeGraphWeb2({ run, onRunEnded, onStartRun }: RoguelikeGraphWeb2Props) {
  const { retreatRun, enterResupplyNode } = useRoguelikeMatchWeb2();
  const isEditor = useWeb2Admin();
  const admin = useRoguelikeAdminWeb2();
  const [combatTargetNodeId, setCombatTargetNodeId] = React.useState<number | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [enteringResupply, setEnteringResupply] = React.useState<number | null>(null);
  const [isRetreating, setIsRetreating] = React.useState(false);
  const [editMode, setEditModeState] = React.useState(false);
  const [connectMode, setConnectMode] = React.useState<{ sourceNodeId: number; twoWay: boolean } | null>(
    null,
  );
  const [showSettings, setShowSettings] = React.useState(false);
  // The mission drawer opens on selection; closing it gives the chart the
  // full width until another node is picked.
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  // Edit Mode opens the selected node in a full-screen editor instead.
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [showRetreatConfirm, setShowRetreatConfirm] = React.useState(false);

  const isBrowseMode = run == null;
  const campaignId = run?.campaignId ?? DEFAULT_ROGUELIKE_CAMPAIGN_ID;

  React.useEffect(() => {
    setEditModeState(localStorage.getItem(MISSION_EDIT_MODE_KEY) === "1");
  }, []);
  const setEditMode = React.useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setEditModeState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      if (next) localStorage.setItem(MISSION_EDIT_MODE_KEY, "1");
      else localStorage.removeItem(MISSION_EDIT_MODE_KEY);
      return next;
    });
  }, []);

  const { nodes: campaignNodes, isLoading: nodesLoading, refetch: refetchNodes } =
    useRoguelikeCampaignNodesWeb2WithContent(campaignId);
  const { campaign, refetch: refetchCampaign } = useRoguelikeCampaignWeb2(campaignId);
  const rootNodeId = campaign?.rootNodeId ?? null;

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
        const isCompleted = n.kind === RoguelikeNodeKind.Combat ? defeatedSet.has(n.id) : false;
        return {
          id: n.id,
          kind: n.kind as RoguelikeNodeKind,
          prerequisites: prerequisitesById.get(n.id) ?? [],
          completed: isCompleted,
          unlocked: isBrowseMode ? editMode || n.id === rootNodeId : isAdjacent,
          isCurrent,
          // Only nodes the player has reached open the mission drawer.
          // With no run, only the root node (where a run starts).
          selectable: isBrowseMode
            ? editMode || n.id === rootNodeId
            : editMode || isAdjacent || isCompleted,
          title: n.title,
          titleStatus: n.titleStatus,
          editMode,
          connectHighlight: !connectMode ? undefined : isConnectSource ? "source" : "candidate",
        };
      }),
    [campaignNodes, isBrowseMode, run, currentNode, rootNodeId, defeatedSet, prerequisitesById, editMode, connectMode],
  );
  if (editMode) {
    canvasNodes.push({
      id: ADD_NODE_SENTINEL_ID,
      kind: RoguelikeNodeKind.Combat,
      prerequisites: [],
      completed: false,
      unlocked: true,
      isCurrent: false,
      selectable: true,
      title: "+ ADD NODE",
      titleStatus: "ok",
      editMode: true,
      connectHighlight: connectMode ? "invalid" : undefined,
    });
  }

  React.useEffect(() => {
    if (!isBrowseMode) {
      setSelectedNodeId(run.currentNodeId);
      return;
    }
    if (!editMode) {
      if (rootNodeId != null) setSelectedNodeId(rootNodeId);
      return;
    }
    if (selectedNodeId !== null || campaignNodes.length === 0) return;
    const saved = localStorage.getItem(MISSION_SELECTED_NODE_KEY);
    const savedId = saved ? Number(saved) : NaN;
    if (Number.isFinite(savedId) && byId.has(savedId)) {
      setSelectedNodeId(savedId);
    }
  }, [isBrowseMode, editMode, rootNodeId, run?.currentNodeId, campaignNodes, selectedNodeId, byId]);

  React.useEffect(() => {
    if (!editMode) {
      setConnectMode(null);
      if (isCreatingNode) setSelectedNodeId(isBrowseMode ? rootNodeId : run!.currentNodeId);
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
  const selectedVictoryEffects = useRoguelikeVictoryEffectsWeb2(
    isSelectedCombatNode ? selectedNode.winEffects : undefined,
  );
  const { totalThreat: selectedNodeThreat, placements, isLoading: placementsLoading } =
    useMapEnemyThreatWeb2(isSelectedCombatNode ? selectedNode.mapId : undefined);

  const combatTargetNode = combatTargetNodeId != null ? byId.get(combatTargetNodeId) : undefined;

  // Action bar: the run roster with hull, and fleet cost against the cap.
  const roster = run?.roster ?? NO_ROSTER;
  const hullByShipId = useRunRosterHullWeb2(roster);

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
      setEditorOpen(true);
      return;
    }
    setSelectedNodeId(id);
    setDrawerOpen(true);
    setEditorOpen(true);
    if (isBrowseMode && editMode) {
      localStorage.setItem(MISSION_SELECTED_NODE_KEY, String(id));
    }
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

  const mapAction = getRunMapAction({
    isBrowseMode,
    canStartRun: isBrowseMode && !editMode && !!onStartRun,
    selectedKind: !selectedNode
      ? null
      : selectedNode.kind === RoguelikeNodeKind.Combat
        ? "combat"
        : "resupply",
    isCurrentNode: isSelectedCurrentNode,
    isReachableChild: isSelectedReachableChild,
    isDefeated: isSelectedNodeDefeated,
    // Web2 doesn't track a live match on the run; launching resumes it.
    hasActiveGame: false,
    isEnteringResupply: !!selectedNode && enteringResupply === selectedNode.id,
  });

  const handleMapAction = () => {
    if (mapAction.type === "start") {
      onStartRun?.();
      return;
    }
    if (!selectedNode || isBrowseMode) return;
    if (mapAction.type === "warp") setCombatTargetNodeId(selectedNode.id);
    else if (mapAction.type === "resupply") void handleEnterResupply(selectedNode.id);
  };

  const nodeEditor = (
    <RoguelikeNodeEditPanelWeb2
      mode={isCreatingNode ? "create" : "edit"}
      node={selectedNode ?? null}
      campaignId={campaignId}
      connectModeActive={!!selectedNode && connectMode?.sourceNodeId === selectedNode.id}
      onStartConnectMode={(sourceNodeId) => setConnectMode({ sourceNodeId, twoWay: false })}
      onCancelConnectMode={() => setConnectMode(null)}
      onSaved={() => void refetchNodes()}
      onCreated={() => {
        setEditorOpen(false);
        setSelectedNodeId(isBrowseMode ? rootNodeId : run!.currentNodeId);
        void refetchNodes();
      }}
      onCancelCreate={() => {
        setEditorOpen(false);
        setSelectedNodeId(isBrowseMode ? rootNodeId : run!.currentNodeId);
      }}
    />
  );

  const drawer = editMode ? null : selectedNode ? (
    <MissionDrawerContent
      title={selectedNode.title}
      titleStatus={selectedNode.titleStatus}
      kindLabel={selectedNode.kind === RoguelikeNodeKind.Combat ? "Combat" : "Resupply"}
      briefing={
        <MissionBriefing
          mission={{ kind: "roguelike", nodeId: selectedNode.id }}
          text={selectedNode.description}
          status={selectedNode.descriptionStatus}
          compact
        />
      }
      enemyFleet={
        isSelectedCombatNode
          ? placementsLoading
            ? null
            : placements.map((placement) => {
                const ship = aiConfigToPreviewShipWeb2(placement.config);
                return {
                  key: String(placement.id),
                  name: ship.name,
                  image: <ShipImageWeb2 ship={ship} className="h-full w-full" showLoadingState={false} />,
                };
              })
          : undefined
      }
      dossier={
        <MissionDossier
          forces={
            isSelectedCombatNode
              ? {
                  enemyShips: placementsLoading ? null : placements.length,
                  enemy: placementsLoading ? null : selectedNodeThreat,
                  yours: isBrowseMode ? null : run.currentCostCap,
                  yoursLabel: "Your cost cap",
                }
              : undefined
          }
          rows={
            isSelectedCombatNode
              ? roguelikeCombatDossierRows({
                  maxScore: selectedNode.maxScore ?? 0,
                  creatorGoesFirst: selectedNode.creatorGoesFirst ?? true,
                  autoHealPercent: campaign?.autoHealPercent ?? 0,
                  victoryEffects: selectedVictoryEffects,
                  isCleared: isSelectedNodeDefeated,
                })
              : roguelikeResupplyDossierRows({ costCapOverride: selectedNode.costCapOverride ?? 0 })
          }
        />
      }
    />
  ) : null;

  return (
    <>
      <OperationsMap
        toolbar={
          <>
            <CampaignEditModeToggle
              isEditor={isEditor}
              editMode={editMode}
              onToggle={() => setEditMode((v) => !v)}
            />
            {editMode && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className={`${OPS_TOOLBAR_BUTTON} border-amber text-amber hover:bg-amber/10`}
              >
                Campaign settings
              </button>
            )}
            {!isBrowseMode && (
              <button
                type="button"
                disabled={isRetreating}
                onClick={() => setShowRetreatConfirm(true)}
                className={`${OPS_TOOLBAR_BUTTON} border-warning-red text-warning-red hover:bg-warning-red/10`}
              >
                {isRetreating ? "Retreating…" : "Retreat run"}
              </button>
            )}
          </>
        }
        banner={
          connectMode && (
            <div className="flex items-center justify-between border-b-2 border-amber px-4 py-3 font-mono text-sm text-amber">
              <span>Click the node this one leads to (node #{connectMode.sourceNodeId}).</span>
              <button
                type="button"
                onClick={() => setConnectMode(null)}
                className="border border-amber px-3 py-1 text-xs uppercase tracking-wider hover:bg-amber/10"
              >
                Cancel
              </button>
            </div>
          )
        }
        canvas={
          <CampaignGraphCanvas
            bare
            backdropSrc={ART_SLOTS.runMapBackdrop.src}
            nodes={canvasNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            renderNode={(node, isSelected, onSelect) => (
              <RoguelikeNodeCard
                node={node}
                isSelected={isSelected}
                onSelect={onSelect}
                title={node.title}
                titleStatus={node.titleStatus}
                editMode={node.editMode}
                connectHighlight={node.connectHighlight}
              />
            )}
          />
        }
        drawer={drawer}
        drawerOpen={drawerOpen}
        onDrawerOpenChange={setDrawerOpen}
        actionBar={
          editMode ? undefined : (
            <RunActionBar
              roster={roster.map((entry) => ({
                key: String(entry.shipId),
                name: entry.ship.name || `Ship #${entry.shipId}`,
                image: <ShipImageWeb2 ship={entry.ship} className="h-full w-full" showLoadingState={false} />,
                hullPercent: hullByShipId.get(String(entry.shipId)) ?? 100,
              }))}
              fleetCost={isBrowseMode ? null : roster.reduce((sum, entry) => sum + entry.ship.shipData.cost, 0)}
              costCap={isBrowseMode ? null : run.currentCostCap}
              action={mapAction}
              onAction={handleMapAction}
            />
          )
        }
      />

      {/* Hidden while connecting so the target node can be clicked on the
          map; it reopens on the same node once the link is made. */}
      {editMode && editorOpen && !connectMode && (isCreatingNode || selectedNode) && (
        <NodeEditorModal
          title={
            isCreatingNode
              ? "New node"
              : `Node #${String(selectedNode!.id)} · ${selectedNode!.title}`
          }
          onClose={() => setEditorOpen(false)}
        >
          {nodeEditor}
        </NodeEditorModal>
      )}

      {showRetreatConfirm && !isBrowseMode && (
        <RetreatRunConfirmModal
          isRetreating={isRetreating}
          onCancel={() => setShowRetreatConfirm(false)}
          onConfirm={() => {
            void handleRetreat().finally(() => setShowRetreatConfirm(false));
          }}
        />
      )}

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
          onClose={() => setShowSettings(false)}
          onSaved={() => void refetchCampaign()}
        />
      )}
    </>
  );
}
