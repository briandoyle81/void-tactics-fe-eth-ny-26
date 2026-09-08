"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useCampaignGraphWithContent } from "../hooks/useNodeMap";
import { useIsNodeMapEditor } from "../hooks/useIsNodeMapEditor";
import { useNodeMapAdmin } from "../hooks/useNodeMapAdmin";
import { CampaignNodeCard } from "./CampaignNodeCard";
import { CampaignNodePreview } from "./CampaignNodePreview";
import { CampaignNodeEditPanel } from "./CampaignNodeEditPanel";
import { CampaignSettingsModal } from "./CampaignSettingsModal";
import { CampaignEditModeToggle } from "./CampaignEditModeToggle";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";

// Only campaign 1 ("Shattered Hive") exists today — same "default to 1, no
// real picker until a second campaign exists" convention used for the
// Roguelike campaign (see DEFAULT_ROGUELIKE_CAMPAIGN_ID).
const DEFAULT_CAMPAIGN_ID = 1n;

// The depth-derived column is usually right, but some nodes are narrative
// shortcuts where raw prerequisite depth undersells how far along the
// branch they actually are — nodes 22-24 (the shortcut chain, harder than
// the mainline node it parallels — see campaignNodes.ts) all branch
// directly off node 2, so their raw depth places them right at the start of
// the graph even though they're meant to read as a late-game alternate path
// that reconverges with the mainline at node 25. Bumped to sit alongside
// mainline nodes 13-15, ending one column before node 25's convergence
// point. Keyed by node id, values are 1-indexed (column 1 = leftmost) to
// match how columns are talked about outside the code. Only affects where
// the node itself renders — other nodes' depths (computed from their
// prerequisites) are unaffected, since this is applied after depth
// calculation, not inside it.
const MANUAL_COLUMN_OVERRIDES: Record<number, number> = {
  22: 13,
  23: 14,
  24: 15,
};

// Synthetic "+ ADD NODE" tile injected into the canvas while Edit Mode is
// on — has no prerequisites so it lands in column 1 per the map editor
// plan's "position is edge-derived, a disconnected node has no special
// storage" decision. Never a real node id (NodeMap ids are small sequential
// integers).
const ADD_NODE_SENTINEL_ID = Number.MAX_SAFE_INTEGER;

// Remembers the last-viewed node per wallet, matching Games.tsx's
// `selectedGameId-${address}` convention — falls back to "anonymous" for a
// disconnected viewer so the map still remembers something sane.
function campaignSelectedNodeStorageKey(address: string | undefined): string {
  return `campaign-selected-node-${address || "anonymous"}`;
}

export function CampaignGraph() {
  const { address } = useAccount();
  const { nodes, isLoading, error, refetch } = useCampaignGraphWithContent(address, DEFAULT_CAMPAIGN_ID);
  const { isEditor } = useIsNodeMapEditor();
  const admin = useNodeMapAdmin();
  const [selectedNodeId, setSelectedNodeIdState] = React.useState<bigint | null>(null);
  const setSelectedNodeId = React.useCallback(
    (nodeId: bigint) => {
      setSelectedNodeIdState(nodeId);
      if (typeof window !== "undefined") {
        localStorage.setItem(campaignSelectedNodeStorageKey(address), nodeId.toString());
      }
    },
    [address],
  );
  const queryClient = useQueryClient();
  const [isResettingCache, setIsResettingCache] = React.useState(false);

  const [editMode, setEditMode] = React.useState(false);
  const [connectMode, setConnectMode] = React.useState<{ sourceNodeId: bigint } | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);

  // Debug affordance: NodeMap/AIEncounters reads (node list, unlock/complete
  // state, enemy fleet configs, map placements) all go through wagmi's
  // TanStack Query cache, keyed by (address, chainId, functionName, args) —
  // same mechanism as everywhere else in the app, no separate localStorage
  // layer. This wipes that cache entirely and forces every active read
  // (including the ones CampaignNodePreview owns for the selected node) to
  // refetch, to rule caching in or out when campaign data looks stale after
  // an admin edit.
  const handleResetCache = async () => {
    setIsResettingCache(true);
    try {
      queryClient.clear();
      await refetch();
    } finally {
      setIsResettingCache(false);
    }
  };
  const debugResetButton = (
    <button
      type="button"
      onClick={() => void handleResetCache()}
      disabled={isResettingCache}
      className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border disabled:opacity-50"
      style={{
        color: "var(--color-cyan)",
        borderColor: "var(--color-cyan)",
        backgroundColor: "var(--color-near-black)",
      }}
    >
      {isResettingCache ? "[RESETTING CACHE...]" : "[DEBUG: RESET CAMPAIGN CACHE]"}
    </button>
  );

  const isCreatingNode = selectedNodeId != null && Number(selectedNodeId) === ADD_NODE_SENTINEL_ID;
  const selectedNode = React.useMemo(
    () => (isCreatingNode ? null : nodes.find((n) => n.id === selectedNodeId) ?? null),
    [nodes, selectedNodeId, isCreatingNode],
  );

  // Restore the last-viewed node once the graph loads; fall back to the
  // root node (first render, or a saved id that's no longer valid — e.g. a
  // different wallet, or campaign content changed) so the preview panel is
  // never empty.
  React.useEffect(() => {
    if (selectedNodeId !== null || nodes.length === 0) return;
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem(campaignSelectedNodeStorageKey(address))
        : null;
    const savedNode = saved ? nodes.find((n) => n.id.toString() === saved) : undefined;
    setSelectedNodeIdState(savedNode ? savedNode.id : nodes[0].id);
  }, [nodes, selectedNodeId, address]);

  // Leaving Edit Mode always drops connect-mode/create-in-progress state.
  React.useEffect(() => {
    if (!editMode) {
      setConnectMode(null);
      if (isCreatingNode) setSelectedNodeIdState(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3">
        {debugResetButton}
        <div className="text-center font-mono text-sm text-text-muted">
          Loading campaign...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3">
        {debugResetButton}
        <div className="text-center font-mono text-sm text-warning-red">
          [ERR] Failed to load campaign: {error.message}
        </div>
      </div>
    );
  }

  interface CanvasNode {
    id: number;
    prerequisites: number[];
    completed: boolean;
    unlocked: boolean;
    title: string;
    editMode: boolean;
    connectHighlight: "source" | "candidate" | "invalid" | undefined;
  }

  const byNumberId = new Map(nodes.map((n) => [Number(n.id), n]));
  const canvasNodes: CanvasNode[] = nodes.map((n) => {
    const idNum = Number(n.id);
    const isConnectSource = connectMode?.sourceNodeId === n.id;
    return {
      id: idNum,
      prerequisites: n.prerequisites.map(Number),
      completed: n.completed,
      unlocked: n.unlocked,
      title: n.title,
      editMode,
      connectHighlight: !connectMode ? undefined : isConnectSource ? "source" : "candidate",
    };
  });
  if (editMode) {
    canvasNodes.push({
      id: ADD_NODE_SENTINEL_ID,
      prerequisites: [],
      completed: false,
      unlocked: true,
      title: "+ ADD NODE",
      editMode: true,
      connectHighlight: connectMode ? "invalid" : undefined,
    });
  }

  // While connect mode is active, clicking a node on the canvas adds it as
  // a prerequisite of connectMode.sourceNodeId (the node being edited) —
  // see CampaignNodeEditPanel's onStartConnectMode, which sets sourceNodeId
  // to the currently-selected node.
  const handleConnectTarget = async (targetNode: (typeof nodes)[number], sourceNodeId: bigint) => {
    const wouldCycle = targetNode.prerequisites.some((p) => p === sourceNodeId);
    if (wouldCycle) {
      toast.error("That would create a cycle — pick a different node.");
      return;
    }
    try {
      await admin.addPrerequisite(sourceNodeId, targetNode.id);
      toast.success(`Node #${targetNode.id.toString()} linked as a prerequisite.`);
      await refetch();
    } catch (error) {
      console.error("Failed to add prerequisite:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add prerequisite");
    } finally {
      setConnectMode(null);
    }
  };

  const handleSelectNode = (id: number) => {
    if (connectMode) {
      if (id === Number(connectMode.sourceNodeId) || id === ADD_NODE_SENTINEL_ID) return;
      const targetNode = byNumberId.get(id);
      if (targetNode) void handleConnectTarget(targetNode, connectMode.sourceNodeId);
      return;
    }
    if (id === ADD_NODE_SENTINEL_ID) {
      setSelectedNodeIdState(BigInt(ADD_NODE_SENTINEL_ID));
      return;
    }
    const node = byNumberId.get(id);
    if (node) setSelectedNodeId(node.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <CampaignEditModeToggle
          isEditor={isEditor}
          editMode={editMode}
          onToggle={() => setEditMode((v) => !v)}
        />
        {editMode && (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="self-start border-2 border-amber px-4 py-2 text-xs font-bold uppercase tracking-wider text-amber hover:bg-amber/10 font-mono"
            style={{ borderRadius: 0 }}
          >
            [CAMPAIGN SETTINGS]
          </button>
        )}
      </div>

      <CampaignGraphCanvas
        nodes={canvasNodes}
        selectedNodeId={selectedNodeId != null ? Number(selectedNodeId) : null}
        onSelectNode={handleSelectNode}
        manualColumnOverrides={MANUAL_COLUMN_OVERRIDES}
        headerExtra={debugResetButton}
        renderNode={(canvasNode, isSelected, onSelect) => (
          <CampaignNodeCard
            node={canvasNode}
            isSelected={isSelected}
            onSelect={onSelect}
            title={canvasNode.title}
            editMode={canvasNode.editMode}
            connectHighlight={canvasNode.connectHighlight}
          />
        )}
      >
        {connectMode && (
          <div
            className="flex items-center justify-between border-2 border-amber px-4 py-3 font-mono text-sm text-amber"
            style={{ borderRadius: 0 }}
          >
            <span>
              Click the node that should unlock node #{connectMode.sourceNodeId.toString()}.
            </span>
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
          <CampaignNodeEditPanel
            mode={isCreatingNode ? "create" : "edit"}
            node={selectedNode}
            connectModeActive={!!selectedNode && connectMode?.sourceNodeId === selectedNode.id}
            onStartConnectMode={(sourceNodeId) => setConnectMode({ sourceNodeId })}
            onCancelConnectMode={() => setConnectMode(null)}
            onSaved={() => void refetch()}
            onCreated={() => {
              setSelectedNodeIdState(null);
              void refetch();
            }}
            onCancelCreate={() => setSelectedNodeIdState(null)}
          />
        ) : (
          selectedNode && <CampaignNodePreview node={selectedNode} />
        )}
      </CampaignGraphCanvas>

      {showSettings && (
        <CampaignSettingsModal
          nodeIds={nodes.map((n) => Number(n.id))}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
