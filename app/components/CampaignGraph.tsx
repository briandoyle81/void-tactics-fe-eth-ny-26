"use client";

import React from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaignGraph } from "../hooks/useNodeMap";
import { CampaignNodeCard } from "./CampaignNodeCard";
import { CampaignNodePreview } from "./CampaignNodePreview";
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

// Remembers the last-viewed node per wallet, matching Games.tsx's
// `selectedGameId-${address}` convention — falls back to "anonymous" for a
// disconnected viewer so the map still remembers something sane.
function campaignSelectedNodeStorageKey(address: string | undefined): string {
  return `campaign-selected-node-${address || "anonymous"}`;
}

export function CampaignGraph() {
  const { address } = useAccount();
  const { nodes, isLoading, error, refetch } = useCampaignGraph(address, DEFAULT_CAMPAIGN_ID);
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

  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
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

  // Adapt bigint node ids/prerequisites down to plain numbers only here, at
  // the data/adapter boundary — CampaignGraphCanvas itself is number-native
  // and shared verbatim with CampaignGraphWeb2.tsx. A lookup back to the
  // real bigint-typed node is kept alongside for onSelectNode, since
  // setSelectedNodeId needs the original bigint id.
  const byNumberId = new Map(nodes.map((n) => [Number(n.id), n]));
  const canvasNodes = nodes.map((n) => ({
    id: Number(n.id),
    prerequisites: n.prerequisites.map(Number),
    completed: n.completed,
    unlocked: n.unlocked,
  }));

  return (
    <CampaignGraphCanvas
      nodes={canvasNodes}
      selectedNodeId={selectedNodeId != null ? Number(selectedNodeId) : null}
      onSelectNode={(id) => {
        const node = byNumberId.get(id);
        if (node) setSelectedNodeId(node.id);
      }}
      manualColumnOverrides={MANUAL_COLUMN_OVERRIDES}
      headerExtra={debugResetButton}
      renderNode={(canvasNode, isSelected, onSelect) => (
        <CampaignNodeCard node={canvasNode} isSelected={isSelected} onSelect={onSelect} />
      )}
    >
      {selectedNode && <CampaignNodePreview node={selectedNode} />}
    </CampaignGraphCanvas>
  );
}
