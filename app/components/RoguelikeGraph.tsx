"use client";

import React from "react";
import { MissionBriefing } from "./MissionBriefing";
import { navigateToGame } from "../utils/navigateToGame";
import { MissionDossier } from "./MissionDossier";
import { useRoguelikeVictoryEffects } from "../hooks/useRoguelikeVictoryEffects";
import {
  roguelikeCombatDossierRows,
  roguelikeResupplyDossierRows,
} from "../utils/missionDossierRows";
import type { NodeContentStatus } from "../hooks/useNodeContent";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { RoguelikeNodeKind, type RoguelikeRun } from "../types/roguelike";
import {
  useRoguelikeGraphWithContent,
  useCampaignAutoHealPercent,
  useRoguelikeCampaignRootNode,
  type RoguelikeNodeWithContent,
} from "../hooks/useRoguelikeNodeMap";
import { useRoguelikeRunView } from "../hooks/useGameLens";
import { useIsRoguelikeNodeEditor } from "../hooks/useRoguelikeNodeMap";
import { useRoguelikeMatch } from "../hooks/useRoguelikeMatch";
import { useRoguelikeNodeMapAdmin } from "../hooks/useRoguelikeNodeMapAdmin";
import { useGetAllAIShipConfigs, useGetMapPlacements } from "../hooks/useAIEncountersContract";
import type { AIShipConfig } from "../types/types";
import { aiConfigToPreviewShip } from "../utils/aiShipConfig";
import { buildRoguelikePrerequisites } from "../utils/roguelikeGraphLayout";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";
import { RoguelikeNodeCard, type RoguelikeNodeCardNode } from "./RoguelikeNodeCard";
import { RoguelikeCombatModal } from "./RoguelikeCombatModal";
import { RoguelikeResupplyPanel } from "./RoguelikeResupplyPanel";
import { RoguelikeNodeEditPanel } from "./RoguelikeNodeEditPanel";
import { RoguelikeSettingsModal } from "./RoguelikeSettingsModal";
import { CampaignEditModeToggle } from "./CampaignEditModeToggle";
import { ShipImage } from "./ShipImage";
import { OperationsMap } from "./operations/OperationsMap";
import { ART_SLOTS } from "../config/art";
import { MissionDrawerContent } from "./operations/MissionDrawerContent";
import { RunActionBar } from "./operations/RunActionBar";
import { NodeEditorModal } from "./operations/NodeEditorModal";
import { RetreatRunConfirmModal } from "./operations/RetreatRunConfirmModal";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useRunRosterHullWeb3 } from "../hooks/useRunRosterHull";
import { getRunMapAction } from "../utils/runMapAction";
import type { Ship } from "../types/types";

const NO_SHIP_IDS: bigint[] = [];
const OPS_TOOLBAR_BUTTON =
  "border border-solid px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-50";

// Only campaign 1 exists today — same convention as RoguelikeRunStart.tsx's
// own DEFAULT_ROGUELIKE_CAMPAIGN_ID (not exported from there, so duplicated
// here — matches this codebase's existing tolerance for small shared
// constants living per-file rather than a dedicated config module).
const DEFAULT_ROGUELIKE_CAMPAIGN_ID = 1n;

const ADD_NODE_SENTINEL_ID = Number.MAX_SAFE_INTEGER;

function missionEditModeKey(address: string | undefined): string {
  return `mission-edit-mode-${address || "anonymous"}`;
}

function missionSelectedNodeKey(address: string | undefined): string {
  return `mission-selected-node-${address || "anonymous"}`;
}

interface RoguelikeGraphProps {
  /** Null when the player has no run: the map is a preview with no
   * "current position". Only the root node (where a run starts) can be
   * selected, and the primary action is Start run (`onStartRun`). Editors
   * can still turn on Edit Mode here to edit every node. */
  run: RoguelikeRun | null;
  onRunEnded: () => void;
  /** Run-less preview only: opens fleet selection to start a run. */
  onStartRun?: () => void;
  /** Called after enterResupplyNode succeeds — unlike enterCombatNode
   * (which navigates away to the game, so the parent naturally refetches on
   * return), resupply keeps the player on this screen, so `run.currentNodeId`
   * needs an explicit refetch to stop pointing at the node just left. */
  onRunAdvanced: () => void;
}

interface RoguelikeCanvasNode extends RoguelikeNodeCardNode {
  prerequisites: number[];
  title: string;
  titleStatus: NodeContentStatus;
  editMode: boolean;
  connectHighlight: "source" | "candidate" | "invalid" | undefined;
}

// Active-run view: the whole campaign map, same visual system as the
// original campaign's CampaignGraph.tsx (CampaignGraphCanvas — depth-tiered
// columns, SVG prerequisite lanes, starfield backdrop), fed prerequisites
// inverted from RoguelikeNodeMap's children-with-lockout edges (see
// buildRoguelikePrerequisites). Play-mode interaction stays scoped to
// what's actually enterable today — the current node, or one of its direct
// children; walking back across a twoWay edge to an already-left node isn't
// surfaced as a play action here (a real contract-level option that was
// never wired up). Edit Mode (gated on isRoguelikeNodeEditor) layers node/
// edge/map/fleet editing onto this same screen — see RoguelikeNodeEditPanel.
export function RoguelikeGraph({ run, onRunEnded, onRunAdvanced, onStartRun }: RoguelikeGraphProps) {
  const { address } = useAccount();
  const { retreatRun, enterResupplyNode } = useRoguelikeMatch();
  const { data: isEditor = false } = useIsRoguelikeNodeEditor(address);
  const admin = useRoguelikeNodeMapAdmin();
  const [combatTargetNodeId, setCombatTargetNodeId] = React.useState<bigint | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [enteringResupply, setEnteringResupply] = React.useState<bigint | null>(null);
  const [isRetreating, setIsRetreating] = React.useState(false);
  const [editMode, setEditModeState] = React.useState(false);
  const [connectMode, setConnectMode] = React.useState<{ sourceNodeId: bigint; twoWay: boolean } | null>(
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
    setEditModeState(localStorage.getItem(missionEditModeKey(address)) === "1");
  }, [address]);
  const setEditMode = React.useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setEditModeState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        const key = missionEditModeKey(address);
        if (next) localStorage.setItem(key, "1");
        else localStorage.removeItem(key);
        return next;
      });
    },
    [address],
  );

  const { nodes: campaignNodes, isLoading: nodesLoading, refetch: refetchNodes } =
    // Players only see nodes reachable from the root (one GameLens call);
    // the editor needs every node, linked or not.
    useRoguelikeGraphWithContent(campaignId, true, { reachableOnly: !editMode });
  const { data: rootNodeIdRaw } = useRoguelikeCampaignRootNode(isBrowseMode ? campaignId : undefined);
  const rootNodeId = rootNodeIdRaw != null ? Number(rootNodeIdRaw) : null;
  const { data: autoHealPercent, refetch: refetchAutoHeal } = useCampaignAutoHealPercent(campaignId);

  const byNumberId = React.useMemo(
    () => new Map(campaignNodes.map((n) => [Number(n.id), n])),
    [campaignNodes],
  );
  const currentNode = isBrowseMode ? undefined : byNumberId.get(Number(run.currentNodeId));

  // Locked/defeated flags for every reachable node, in one GameLens call.
  const { lockedByNodeId, defeatedByNodeId } = useRoguelikeRunView(address, !isBrowseMode);

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

  const isCreatingNode = selectedNodeId === ADD_NODE_SENTINEL_ID;

  const canvasNodes: RoguelikeCanvasNode[] = React.useMemo(
    () =>
      campaignNodes.map((n) => {
        const idNum = Number(n.id);
        const isCurrent = !isBrowseMode && n.id === run.currentNodeId;
        const isConnectSource = connectMode?.sourceNodeId === n.id;
        const isCompleted =
          !isBrowseMode && n.kind === RoguelikeNodeKind.Combat && !!defeatedByNodeId.get(n.id.toString());
        const isNextStop =
          !!currentNode?.children.some((e) => e.childId === n.id) && !lockedByNodeId.get(n.id.toString());
        return {
          id: idNum,
          kind: n.kind,
          prerequisites: prerequisitesByNumberId.get(idNum) ?? [],
          // Resupply nodes have no on-chain "completed" concept (only
          // isNodeDefeated, which only applies to Combat nodes) — they
          // never render as cleared, only as your current position or a
          // reachable/locked stop on the map.
          completed: isCompleted,
          // With no run there's no "current position": the root node
          // (where a run starts) renders unlocked, or every node in Edit
          // Mode so an editor can select and edit any of them.
          unlocked: isBrowseMode
            ? editMode || idNum === rootNodeId
            : isCurrent
              ? true
              : !lockedByNodeId.get(n.id.toString()),
          isCurrent,
          // Only nodes the player has reached open the mission drawer.
          // With no run, only the root node (where a run starts).
          selectable: isBrowseMode
            ? editMode || idNum === rootNodeId
            : editMode || isCurrent || isCompleted || isNextStop,
          title: n.title,
          titleStatus: n.titleStatus,
          editMode,
          connectHighlight: !connectMode ? undefined : isConnectSource ? "source" : "candidate",
        };
      }),
    [
      campaignNodes,
      isBrowseMode,
      run,
      currentNode,
      rootNodeId,
      defeatedByNodeId,
      lockedByNodeId,
      prerequisitesByNumberId,
      editMode,
      connectMode,
    ],
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

  // Play mode snaps to the current run node, and the run-less preview to
  // the root node. Edit Mode without a run restores the last selected node
  // so leaving Mission and coming back keeps the panel.
  React.useEffect(() => {
    if (!isBrowseMode) {
      setSelectedNodeId(Number(run.currentNodeId));
      return;
    }
    if (!editMode) {
      if (rootNodeId != null) setSelectedNodeId(rootNodeId);
      return;
    }
    if (selectedNodeId !== null || campaignNodes.length === 0) return;
    const saved = localStorage.getItem(missionSelectedNodeKey(address));
    const savedId = saved ? Number(saved) : NaN;
    if (Number.isFinite(savedId) && byNumberId.has(savedId)) {
      setSelectedNodeId(savedId);
    }
  }, [isBrowseMode, editMode, rootNodeId, run?.currentNodeId, campaignNodes, selectedNodeId, address, byNumberId]);

  React.useEffect(() => {
    if (!editMode) {
      setConnectMode(null);
      if (isCreatingNode) setSelectedNodeId(isBrowseMode ? rootNodeId : Number(run!.currentNodeId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  const selectedNode: RoguelikeNodeWithContent | undefined =
    !isCreatingNode && selectedNodeId != null ? byNumberId.get(selectedNodeId) : undefined;
  const isSelectedCurrentNode = !isBrowseMode && !!selectedNode && selectedNode.id === run.currentNodeId;
  const isSelectedReachableChild =
    !isBrowseMode &&
    !!selectedNode &&
    !!currentNode &&
    currentNode.children.some((e) => e.childId === selectedNode.id) &&
    !lockedByNodeId.get(selectedNode.id.toString());
  const isSelectedNodeDefeated = selectedNode
    ? !!defeatedByNodeId.get(selectedNode.id.toString())
    : false;

  const isSelectedCombatNode = selectedNode?.kind === RoguelikeNodeKind.Combat;
  const selectedVictoryEffects = useRoguelikeVictoryEffects(
    isSelectedCombatNode ? selectedNode.id : undefined,
  );
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

  // Action bar: the run roster with hull, and fleet cost against the cap.
  const { ships: ownedShips } = useOwnedShips();
  const rosterShipIds = run?.rosterShipIds ?? NO_SHIP_IDS;
  const hullByShipId = useRunRosterHullWeb3(address, rosterShipIds);
  const rosterShips = React.useMemo(() => {
    const byId = new Map(ownedShips.map((s) => [s.id.toString(), s]));
    return rosterShipIds.map((id) => ({ id, ship: byId.get(id.toString()) as Ship | undefined }));
  }, [ownedShips, rosterShipIds]);

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
      } else if (message.includes("ActiveGameInProgress")) {
        toast.error(
          "A match is still in progress — return to it or let it finish before entering resupply.",
        );
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
    if (isBrowseMode) return;
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

  // While connect mode is active, clicking a node adds it as a CHILD of
  // connectMode.sourceNodeId (the node being edited is the parent side of
  // addChild — see RoguelikeNodeEditPanel's onStartConnectMode).
  const handleConnectTarget = async (
    targetNode: RoguelikeNodeWithContent,
    sourceNodeId: bigint,
    twoWay: boolean,
  ) => {
    try {
      await admin.addChild(sourceNodeId, targetNode.id, twoWay);
      toast.success(`Node #${targetNode.id.toString()} linked as a child.`);
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
      if (id === Number(connectMode.sourceNodeId) || id === ADD_NODE_SENTINEL_ID) return;
      const targetNode = byNumberId.get(id);
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
      localStorage.setItem(missionSelectedNodeKey(address), String(id));
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
    return <RoguelikeResupplyPanel run={run} node={currentNode!} onDone={onRunAdvanced} />;
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
    hasActiveGame: !isBrowseMode && run.activeGameId !== 0n,
    isEnteringResupply: !!selectedNode && enteringResupply === selectedNode.id,
  });

  const handleMapAction = () => {
    if (mapAction.type === "start") {
      onStartRun?.();
      return;
    }
    if (!selectedNode || isBrowseMode) return;
    if (mapAction.type === "resume") navigateToGame(address, run.activeGameId);
    else if (mapAction.type === "warp") setCombatTargetNodeId(selectedNode.id);
    else if (mapAction.type === "resupply") void handleEnterResupply(selectedNode.id);
  };

  const nodeEditor = (
    <RoguelikeNodeEditPanel
      mode={isCreatingNode ? "create" : "edit"}
      node={selectedNode ?? null}
      campaignId={campaignId}
      connectModeActive={!!selectedNode && connectMode?.sourceNodeId === selectedNode.id}
      onStartConnectMode={(sourceNodeId) => setConnectMode({ sourceNodeId, twoWay: false })}
      onCancelConnectMode={() => setConnectMode(null)}
      onSaved={() => void refetchNodes()}
      onCreated={() => {
        setEditorOpen(false);
        setSelectedNodeId(isBrowseMode ? rootNodeId : Number(run!.currentNodeId));
        void refetchNodes();
      }}
      onCancelCreate={() => {
        setEditorOpen(false);
        setSelectedNodeId(isBrowseMode ? rootNodeId : Number(run!.currentNodeId));
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
          mission={{ kind: "roguelike", nodeId: Number(selectedNode.id) }}
          text={selectedNode.description}
          status={selectedNode.descriptionStatus}
          compact
        />
      }
      enemyFleet={
        isSelectedCombatNode
          ? placementsLoading || configsLoading
            ? null
            : enemyShipConfigs.flatMap((config, i) => {
                if (!config) return [];
                const ship = aiConfigToPreviewShip(config);
                return [
                  {
                    key: `${config.id.toString()}-${i}`,
                    name: ship.name,
                    image: <ShipImage ship={ship} className="h-full w-full" showLoadingState={false} />,
                  },
                ];
              })
          : undefined
      }
      dossier={
        <MissionDossier
          forces={
            isSelectedCombatNode
              ? {
                  enemyShips: placementsLoading || configsLoading ? null : enemyShipConfigs.filter(Boolean).length,
                  enemy: placementsLoading || configsLoading ? null : selectedNodeThreat,
                  yours: isBrowseMode ? null : Number(run.currentCostCap),
                  yoursLabel: "Your cost cap",
                }
              : undefined
          }
          rows={
            isSelectedCombatNode
              ? roguelikeCombatDossierRows({
                  maxScore: Number(selectedNode.maxScore),
                  creatorGoesFirst: selectedNode.creatorGoesFirst,
                  autoHealPercent: autoHealPercent ?? 0,
                  victoryEffects: selectedVictoryEffects,
                  isCleared: isSelectedNodeDefeated,
                })
              : roguelikeResupplyDossierRows({ costCapOverride: Number(selectedNode.costCapOverride) })
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
              <span>Click the node this one leads to (node #{connectMode.sourceNodeId.toString()}).</span>
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
              roster={rosterShips.map(({ id, ship }) => ({
                key: id.toString(),
                name: ship?.name || `Ship #${id.toString()}`,
                image: ship ? <ShipImage ship={ship} className="h-full w-full" showLoadingState={false} /> : null,
                hullPercent: hullByShipId.get(id.toString()) ?? 100,
              }))}
              // Bigint ship costs convert to number here (adapter layer).
              fleetCost={
                isBrowseMode
                  ? null
                  : rosterShips.reduce((sum, { ship }) => sum + (ship ? Number(ship.shipData.cost) : 0), 0)
              }
              costCap={isBrowseMode ? null : Number(run.currentCostCap)}
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
        <RoguelikeCombatModal
          run={run}
          targetNode={combatTargetNode}
          onClose={() => setCombatTargetNodeId(null)}
          onLaunched={() => setCombatTargetNodeId(null)}
        />
      )}

      {showSettings && (
        <RoguelikeSettingsModal
          campaignId={campaignId}
          onClose={() => setShowSettings(false)}
          onSaved={() => void refetchAutoHeal()}
        />
      )}
    </>
  );
}
