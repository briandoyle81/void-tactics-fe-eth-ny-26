"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useCampaignGraphWeb2WithContent } from "../hooks/useCampaignWeb2";
import { useCampaignAdminWeb2 } from "../hooks/useCampaignAdminWeb2";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { CampaignNodeCard } from "./CampaignNodeCard";
import { CampaignGraphCanvas } from "./CampaignGraphCanvas";
import { CampaignNodePreviewWeb2 } from "./CampaignNodePreviewWeb2";
import { CampaignNodeEditPanelWeb2 } from "./CampaignNodeEditPanelWeb2";
import { CampaignSettingsModalWeb2 } from "./CampaignSettingsModalWeb2";
import { CampaignEditModeToggle } from "./CampaignEditModeToggle";

const DEFAULT_CAMPAIGN_ID = 1;

// Synthetic "+ ADD NODE" tile — see CampaignGraph.tsx's matching constant/
// doc-comment. Web2 node ids are DB autoincrement ints, so this sentinel
// (JS's largest safe integer) is just as guaranteed not to collide.
const ADD_NODE_SENTINEL_ID = Number.MAX_SAFE_INTEGER;

// Web2-mode counterpart to CampaignGraph.tsx — renders the literal same
// CampaignGraphCanvas/CampaignNodeCard shared components, only the data
// source (useCampaignGraphWeb2 vs useCampaignGraph), node-preview panel
// (CampaignNodePreviewWeb2 vs CampaignNodePreview), and edit-mode panels
// (CampaignNodeEditPanelWeb2 vs CampaignNodeEditPanel) differ.
export function CampaignGraphWeb2() {
  const { campaign, nodes, isLoading, error, refetch } =
    useCampaignGraphWeb2WithContent(DEFAULT_CAMPAIGN_ID);
  const isEditor = useWeb2Admin();
  const admin = useCampaignAdminWeb2();
  const [selectedNodeId, setSelectedNodeId] = React.useState<number | null>(null);
  const queryClient = useQueryClient();
  const [isResettingCache, setIsResettingCache] = React.useState(false);

  const [editMode, setEditMode] = React.useState(false);
  const [connectMode, setConnectMode] = React.useState<{ sourceNodeId: number } | null>(null);
  const [showSettings, setShowSettings] = React.useState(false);

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

  const isCreatingNode = selectedNodeId === ADD_NODE_SENTINEL_ID;
  const selectedNode = React.useMemo(
    () => (isCreatingNode ? null : nodes.find((n) => n.id === selectedNodeId) ?? null),
    [nodes, selectedNodeId, isCreatingNode],
  );

  React.useEffect(() => {
    if (selectedNodeId !== null || nodes.length === 0) return;
    setSelectedNodeId(nodes[0].id);
  }, [nodes, selectedNodeId]);

  React.useEffect(() => {
    if (!editMode) {
      setConnectMode(null);
      if (isCreatingNode) setSelectedNodeId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode]);

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

  interface CanvasNode {
    id: number;
    prerequisites: number[];
    completed: boolean;
    unlocked: boolean;
    title: string;
    editMode: boolean;
    connectHighlight: "source" | "candidate" | "invalid" | undefined;
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const canvasNodes: CanvasNode[] = nodes.map((n) => {
    const isConnectSource = connectMode?.sourceNodeId === n.id;
    return {
      id: n.id,
      prerequisites: n.prerequisites,
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

  const handleConnectTarget = async (targetNode: (typeof nodes)[number], sourceNodeId: number) => {
    if (targetNode.prerequisites.includes(sourceNodeId)) {
      toast.error("That would create a cycle — pick a different node.");
      return;
    }
    const sourceNode = byId.get(sourceNodeId);
    if (!sourceNode) return;
    try {
      await admin.addPrerequisite(
        {
          id: sourceNode.id,
          campaignId: sourceNode.campaignId,
          mapId: sourceNode.mapId,
          prerequisites: sourceNode.prerequisites,
          costLimit: sourceNode.costLimit,
          turnTimeSeconds: sourceNode.turnTimeSeconds,
          maxScore: sourceNode.maxScore,
          creatorGoesFirst: sourceNode.creatorGoesFirst,
        },
        targetNode.id,
      );
      toast.success(`Node #${targetNode.id} linked as a prerequisite.`);
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
      if (id === connectMode.sourceNodeId || id === ADD_NODE_SENTINEL_ID) return;
      const targetNode = byId.get(id);
      if (targetNode) void handleConnectTarget(targetNode, connectMode.sourceNodeId);
      return;
    }
    setSelectedNodeId(id);
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
        selectedNodeId={selectedNodeId}
        onSelectNode={handleSelectNode}
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
            <span>Click the node that should unlock node #{connectMode.sourceNodeId}.</span>
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
          <CampaignNodeEditPanelWeb2
            mode={isCreatingNode ? "create" : "edit"}
            node={selectedNode}
            connectModeActive={!!selectedNode && connectMode?.sourceNodeId === selectedNode.id}
            onStartConnectMode={(sourceNodeId) => setConnectMode({ sourceNodeId })}
            onCancelConnectMode={() => setConnectMode(null)}
            onSaved={() => void refetch()}
            onCreated={() => {
              setSelectedNodeId(null);
              void refetch();
            }}
            onCancelCreate={() => setSelectedNodeId(null)}
          />
        ) : (
          selectedNode && campaign && (
            <CampaignNodePreviewWeb2 node={selectedNode} campaign={campaign} />
          )
        )}
      </CampaignGraphCanvas>

      {showSettings && (
        <CampaignSettingsModalWeb2
          campaign={campaign}
          nodeIds={nodes.map((n) => n.id)}
          onClose={() => setShowSettings(false)}
          onSaved={() => void refetch()}
        />
      )}
    </div>
  );
}
