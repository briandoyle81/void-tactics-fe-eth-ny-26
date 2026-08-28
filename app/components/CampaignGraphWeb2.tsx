"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaignGraphWeb2 } from "../hooks/useCampaignWeb2";
import { CampaignNodeCard } from "./CampaignNodeCard";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";
import { CampaignNodePreviewWeb2 } from "./CampaignNodePreviewWeb2";

const DEFAULT_CAMPAIGN_ID = 1;

// Web2-mode counterpart to CampaignGraph.tsx — renders the literal same
// CampaignGraphCanvas/CampaignNodeCard shared components, only the data
// source (useCampaignGraphWeb2 vs useCampaignGraph) and node-preview panel
// (CampaignNodePreviewWeb2 vs CampaignNodePreview) differ.
export function CampaignGraphWeb2() {
  const { campaign, nodes, isLoading, error, refetch } = useCampaignGraphWeb2(DEFAULT_CAMPAIGN_ID);
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const queryClient = useQueryClient();
  const [isResettingCache, setIsResettingCache] = React.useState(false);

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

  React.useEffect(() => {
    if (selectedNodeId !== null || nodes.length === 0) return;
    setSelectedNodeId(nodes[0].id);
  }, [nodes, selectedNodeId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-3">
        {debugResetButton}
        <div className="text-center font-mono text-sm text-text-muted">Loading campaign...</div>
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

  return (
    <CampaignGraphCanvas
      nodes={nodes}
      selectedNodeId={selectedNodeId}
      onSelectNode={setSelectedNodeId}
      headerExtra={debugResetButton}
      renderNode={(canvasNode, isSelected, onSelect) => (
        <CampaignNodeCard node={canvasNode} isSelected={isSelected} onSelect={onSelect} />
      )}
    >
      {selectedNode && campaign && (
        <CampaignNodePreviewWeb2 node={selectedNode} campaign={campaign} />
      )}
    </CampaignGraphCanvas>
  );
}
