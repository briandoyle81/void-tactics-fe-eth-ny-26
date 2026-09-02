"use client";

import React from "react";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { RoguelikeNodeKind, type RoguelikeRun } from "../types/roguelike";
import {
  useRoguelikeGraphWithContent,
  useCampaignAutoHealPercent,
  type RoguelikeNodeWithContent,
} from "../hooks/useRoguelikeNodeMap";
import { useAreRoguelikeNodesDefeated, useAreRoguelikeNodesLocked } from "../hooks/useRoguelikeRun";
import { useIsRoguelikeNodeEditor } from "../hooks/useRoguelikeNodeMap";
import { useRoguelikeMatch } from "../hooks/useRoguelikeMatch";
import { useRoguelikeNodeMapAdmin } from "../hooks/useRoguelikeNodeMapAdmin";
import { useGetAllAIShipConfigs, useGetMapPlacements } from "../hooks/useAIEncountersContract";
import type { AIShipConfig } from "../types/types";
import { ARCHETYPE_LABEL, aiConfigToPreviewShip } from "../utils/aiShipConfig";
import { buildRoguelikePrerequisites } from "../utils/roguelikeGraphLayout";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";
import { RoguelikeNodeCard, type RoguelikeNodeCardNode } from "./RoguelikeNodeCard";
import { RoguelikeCombatModal } from "./RoguelikeCombatModal";
import { RoguelikeResupplyPanel } from "./RoguelikeResupplyPanel";
import { RoguelikeNodeEditPanel } from "./RoguelikeNodeEditPanel";
import { RoguelikeSettingsModal } from "./RoguelikeSettingsModal";
import { CampaignEditModeToggle } from "./CampaignEditModeToggle";
import { EnemyFleetPreview } from "./EnemyFleetPreview";
import { ShipImage } from "./ShipImage";
import ShipCard from "./ShipCard";
import { toShipCardData } from "../utils/toShipCardData";

// Only campaign 1 exists today — same convention as RoguelikeRunStart.tsx's
// own DEFAULT_ROGUELIKE_CAMPAIGN_ID (not exported from there, so duplicated
// here — matches this codebase's existing tolerance for small shared
// constants living per-file rather than a dedicated config module).
const DEFAULT_ROGUELIKE_CAMPAIGN_ID = 1n;

const ADD_NODE_SENTINEL_ID = Number.MAX_SAFE_INTEGER;

interface RoguelikeGraphProps {
  /** Null in the run-less "browse/edit" entry point (RoguelikeCampaign.tsx's
   * [EDIT CAMPAIGN MAP] button, for editors with no active run) — every
   * node renders unlocked with no "current position", and Fight/Enter/
   * Retreat are unavailable (only the edit panel can act on the graph). */
  run: RoguelikeRun | null;
  onRunEnded: () => void;
  /** Called after enterResupplyNode succeeds — unlike enterCombatNode
   * (which navigates away to the game, so the parent naturally refetches on
   * return), resupply keeps the player on this screen, so `run.currentNodeId`
   * needs an explicit refetch to stop pointing at the node just left. */
  onRunAdvanced: () => void;
}

interface RoguelikeCanvasNode extends RoguelikeNodeCardNode {
  prerequisites: number[];
  title: string;
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
export function RoguelikeGraph({ run, onRunEnded, onRunAdvanced }: RoguelikeGraphProps) {
  const { address } = useAccount();
  const { retreatRun, enterResupplyNode } = useRoguelikeMatch();
  const { data: isEditor = false } = useIsRoguelikeNodeEditor(address);
  const admin = useRoguelikeNodeMapAdmin();
  const [combatTargetNodeId, setCombatTargetNodeId] = React.useState<bigint | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const [enteringResupply, setEnteringResupply] = React.useState<bigint | null>(null);
  const [isRetreating, setIsRetreating] = React.useState(false);
  const [editMode, setEditMode] = React.useState(false);
  const [connectMode, setConnectMode] = React.useState<{ sourceNodeId: bigint; twoWay: boolean } | null>(
    null,
  );
  const [showSettings, setShowSettings] = React.useState(false);

  const isBrowseMode = run == null;
  const campaignId = run?.campaignId ?? DEFAULT_ROGUELIKE_CAMPAIGN_ID;

  const { nodes: campaignNodes, isLoading: nodesLoading, refetch: refetchNodes } =
    useRoguelikeGraphWithContent(campaignId);
  const { data: autoHealPercent, refetch: refetchAutoHeal } = useCampaignAutoHealPercent(campaignId);

  const nodeIds = React.useMemo(() => campaignNodes.map((n) => n.id), [campaignNodes]);
  const byNumberId = React.useMemo(
    () => new Map(campaignNodes.map((n) => [Number(n.id), n])),
    [campaignNodes],
  );
  const currentNode = isBrowseMode ? undefined : byNumberId.get(Number(run.currentNodeId));

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

  const isCreatingNode = selectedNodeId === ADD_NODE_SENTINEL_ID;

  const canvasNodes: RoguelikeCanvasNode[] = React.useMemo(
    () =>
      campaignNodes.map((n) => {
        const idNum = Number(n.id);
        const isCurrent = !isBrowseMode && n.id === run.currentNodeId;
        const isConnectSource = connectMode?.sourceNodeId === n.id;
        return {
          id: idNum,
          kind: n.kind,
          prerequisites: prerequisitesByNumberId.get(idNum) ?? [],
          // Resupply nodes have no on-chain "completed" concept (only
          // isNodeDefeated, which only applies to Combat nodes) — they
          // never render as cleared, only as your current position or a
          // reachable/locked stop on the map.
          completed: isBrowseMode
            ? false
            : n.kind === RoguelikeNodeKind.Combat
              ? !!defeatedByNodeId.get(n.id.toString())
              : false,
          // Browse mode has no "current position" to gate reachability
          // against — every node renders unlocked so an editor can select
          // and edit any of them.
          unlocked: isBrowseMode ? true : isCurrent ? true : !lockedByNodeId.get(n.id.toString()),
          isCurrent,
          title: n.title,
          editMode,
          connectHighlight: !connectMode ? undefined : isConnectSource ? "source" : "candidate",
        };
      }),
    [
      campaignNodes,
      isBrowseMode,
      run,
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
      title: "+ ADD NODE",
      editMode: true,
      connectHighlight: connectMode ? "invalid" : undefined,
    });
  }

  // Snap the selection back to "where you are" whenever your position
  // actually changes (entering a node) — same intent as CampaignGraph.tsx
  // restoring a saved selection, but here "the interesting node" is always
  // your current position rather than something worth persisting. Browse
  // mode has no current position, so selection is left alone (nothing to
  // snap to) once initially set.
  React.useEffect(() => {
    if (!isBrowseMode) setSelectedNodeId(Number(run.currentNodeId));
  }, [isBrowseMode, run?.currentNodeId]);

  React.useEffect(() => {
    if (!editMode) {
      setConnectMode(null);
      if (isCreatingNode) setSelectedNodeId(isBrowseMode ? null : Number(run!.currentNodeId));
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
    return <RoguelikeResupplyPanel run={run} node={currentNode!} onDone={onRunAdvanced} />;
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
              Roster: {run.rosterShipIds.length} ships · Cost cap: {run.currentCostCap.toString()}
              {autoHealPercent != null && autoHealPercent > 0 && (
                <> · Auto-heal on win: {autoHealPercent}%</>
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
            <span>Click the node this one leads to (node #{connectMode.sourceNodeId.toString()}).</span>
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
          <RoguelikeNodeEditPanel
            mode={isCreatingNode ? "create" : "edit"}
            node={selectedNode ?? null}
            campaignId={campaignId}
            connectModeActive={!!selectedNode && connectMode?.sourceNodeId === selectedNode.id}
            onStartConnectMode={(sourceNodeId) => setConnectMode({ sourceNodeId, twoWay: false })}
            onCancelConnectMode={() => setConnectMode(null)}
            onSaved={() => void refetchNodes()}
            onCreated={() => {
              setSelectedNodeId(isBrowseMode ? null : Number(run!.currentNodeId));
              void refetchNodes();
            }}
            onCancelCreate={() => setSelectedNodeId(isBrowseMode ? null : Number(run!.currentNodeId))}
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
                  {selectedNode.id.toString()}
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
                  isLoading={placementsLoading || configsLoading}
                />
              )}
            </div>
          )
        )}
      </CampaignGraphCanvas>

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
          nodeIds={campaignNodes.map((n) => Number(n.id))}
          onClose={() => setShowSettings(false)}
          onSaved={() => void refetchAutoHeal()}
        />
      )}
    </div>
  );
}
