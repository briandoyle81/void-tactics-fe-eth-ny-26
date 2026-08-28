"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useIsNodeMapEditor } from "../hooks/useIsNodeMapEditor";
import { useNodeMapAdmin } from "../hooks/useNodeMapAdmin";
import { useAllCampaignNodes } from "../hooks/useNodeMap";
import { getNodeContent } from "../config/campaignNodes";
import { useMapEnemyThreat } from "../hooks/useAIEncountersContract";
import type { CampaignNode } from "../types/types";

// enemyThreat is no longer a stored NodeMap field (removed from
// createNode/updateNode/getNode) — this derives the same "total AI fleet
// cost" number from the map's actual placements instead. Its own component
// instance per row so the hook call is valid (mirrors RoguelikeChildCard's
// per-item hook pattern in RoguelikeGraph.tsx).
function NodeThreatLabel({ mapId }: { mapId: bigint }) {
  const { totalThreat } = useMapEnemyThreat(mapId);
  return <>threat {totalThreat}</>;
}

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

// "1, 2, 5" -> [1n, 2n, 5n]; blank/garbage entries dropped rather than
// thrown on, since this is a free-text admin field.
function parsePrerequisites(text: string): bigint[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^\d+$/.test(s))
    .map((s) => BigInt(s));
}

interface NodeFormState {
  campaignId: string;
  mapId: string;
  prerequisites: string;
  costLimit: string;
  turnTime: string;
  maxScore: string;
  creatorGoesFirst: boolean;
}

// Only campaign 1 exists today (see docs/Frontend_Update_Guide_Campaigns_Maps.md
// #5) — default new nodes into it rather than making campaignId a real
// picker until a second campaign is actually created.
const DEFAULT_CAMPAIGN_ID = "1";

const EMPTY_FORM: NodeFormState = {
  campaignId: DEFAULT_CAMPAIGN_ID,
  mapId: "",
  prerequisites: "",
  costLimit: "",
  turnTime: "",
  maxScore: "",
  creatorGoesFirst: true,
};

function nodeToForm(node: CampaignNode): NodeFormState {
  return {
    campaignId: node.campaignId.toString(),
    mapId: node.mapId.toString(),
    prerequisites: node.prerequisites.map((p) => p.toString()).join(", "),
    costLimit: node.costLimit.toString(),
    turnTime: node.turnTime.toString(),
    maxScore: node.maxScore.toString(),
    creatorGoesFirst: node.creatorGoesFirst,
  };
}

function NodeForm({
  form,
  onChange,
  onSubmit,
  pending,
  submitLabel,
}: {
  form: NodeFormState;
  onChange: (form: NodeFormState) => void;
  onSubmit: () => void;
  pending: boolean;
  submitLabel: string;
}) {
  const valid =
    form.campaignId.trim() !== "" &&
    form.mapId.trim() !== "" &&
    form.costLimit.trim() !== "" &&
    form.turnTime.trim() !== "" &&
    form.maxScore.trim() !== "";

  return (
    <div className="space-y-3 border border-gunmetal bg-black/40 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="block text-xs text-cyan mb-1">Campaign ID</label>
          <input
            type="number"
            min={1}
            value={form.campaignId}
            onChange={(e) => onChange({ ...form, campaignId: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Map ID</label>
          <input
            type="number"
            min={1}
            value={form.mapId}
            onChange={(e) => onChange({ ...form, mapId: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Cost Limit</label>
          <input
            type="number"
            min={0}
            value={form.costLimit}
            onChange={(e) => onChange({ ...form, costLimit: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Turn Time (s)</label>
          <input
            type="number"
            min={0}
            value={form.turnTime}
            onChange={(e) => onChange({ ...form, turnTime: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Max Score</label>
          <input
            type="number"
            min={0}
            value={form.maxScore}
            onChange={(e) => onChange({ ...form, maxScore: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-cyan mb-1">
          Prerequisites (comma-separated node IDs, ANY-of — leave blank for a root node)
        </label>
        <input
          type="text"
          value={form.prerequisites}
          onChange={(e) => onChange({ ...form, prerequisites: e.target.value })}
          className={inputClass}
          style={inputStyle}
          placeholder="e.g. 5, 8"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-cyan">
        <input
          type="checkbox"
          checked={form.creatorGoesFirst}
          onChange={(e) => onChange({ ...form, creatorGoesFirst: e.target.checked })}
        />
        Creator (player) goes first
      </label>
      <button
        type="button"
        disabled={pending || !valid}
        onClick={onSubmit}
        className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

/** Gated on NodeMap.isNodeEditor — separate permission domain from MAP_ADMIN_ADDRESS and AIEncounters.isEncounterEditor. */
export function NodeMapAdminPanel() {
  const { isEditor, isLoading } = useIsNodeMapEditor();
  const admin = useNodeMapAdmin();
  const { data: nodes, refetch } = useAllCampaignNodes();

  const [createForm, setCreateForm] = useState<NodeFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const sortedNodes = useMemo(
    () => [...nodes].sort((a, b) => Number(a.id - b.id)),
    [nodes],
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [updateForm, setUpdateForm] = useState<NodeFormState>(EMPTY_FORM);
  const [updating, setUpdating] = useState(false);

  const selectedNode = useMemo(
    () => sortedNodes.find((n) => n.id.toString() === selectedNodeId),
    [sortedNodes, selectedNodeId],
  );

  useEffect(() => {
    if (selectedNode) setUpdateForm(nodeToForm(selectedNode));
  }, [selectedNode]);

  const [editorAddress, setEditorAddress] = useState("");
  const [editorPending, setEditorPending] = useState(false);

  if (isLoading || !isEditor) return null;

  const handleCreate = async () => {
    setCreating(true);
    try {
      await admin.createNode(
        BigInt(createForm.campaignId),
        BigInt(createForm.mapId),
        parsePrerequisites(createForm.prerequisites),
        BigInt(createForm.costLimit),
        BigInt(createForm.turnTime),
        BigInt(createForm.maxScore),
        createForm.creatorGoesFirst,
      );
      setCreateForm(EMPTY_FORM);
      await refetch();
    } catch (error) {
      console.error("Failed to create campaign node:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedNode) return;
    setUpdating(true);
    try {
      await admin.updateNode(
        selectedNode.id,
        BigInt(updateForm.campaignId),
        BigInt(updateForm.mapId),
        parsePrerequisites(updateForm.prerequisites),
        BigInt(updateForm.costLimit),
        BigInt(updateForm.turnTime),
        BigInt(updateForm.maxScore),
        updateForm.creatorGoesFirst,
      );
      await refetch();
    } catch (error) {
      console.error("Failed to update campaign node:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleSetEditor = async (allowed: boolean) => {
    const addr = editorAddress.trim();
    if (!addr.startsWith("0x")) return;
    setEditorPending(true);
    try {
      await admin.setNodeEditor(addr as `0x${string}`, allowed);
      setEditorAddress("");
    } catch (error) {
      console.error("Failed to update node editor:", error);
    } finally {
      setEditorPending(false);
    }
  };

  return (
    <div className="mt-8 space-y-6 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[CAMPAIGN NODES]</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Nodes</h5>
        <div className="space-y-1">
          {sortedNodes.length === 0 ? (
            <p className="text-xs text-text-muted">No campaign nodes yet.</p>
          ) : (
            sortedNodes.map((n) => (
              <div key={n.id.toString()} className="flex flex-wrap justify-between gap-x-3 text-xs text-text-secondary">
                <span>
                  #{n.id.toString()} {getNodeContent(n.id).title} (map {n.mapId.toString()})
                </span>
                <span className="text-cyan">
                  campaign {n.campaignId.toString()} / cost {n.costLimit.toString()} / turn {n.turnTime.toString()}s / score {n.maxScore.toString()}
                  {" / "}
                  <NodeThreatLabel mapId={n.mapId} />
                  {n.prerequisites.length > 0 &&
                    ` / requires ${n.prerequisites.map((p) => p.toString()).join(" or ")}`}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Create Node</h5>
        <NodeForm
          form={createForm}
          onChange={setCreateForm}
          onSubmit={() => void handleCreate()}
          pending={creating}
          submitLabel="Create Node"
        />
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Update Node</h5>
        {sortedNodes.length === 0 ? (
          <p className="text-xs text-text-muted">Create a node first.</p>
        ) : (
          <>
            <select
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select a node...</option>
              {sortedNodes.map((n) => (
                <option key={n.id.toString()} value={n.id.toString()}>
                  #{n.id.toString()} {getNodeContent(n.id).title}
                </option>
              ))}
            </select>
            {selectedNode && (
              <NodeForm
                form={updateForm}
                onChange={setUpdateForm}
                onSubmit={() => void handleUpdate()}
                pending={updating}
                submitLabel="Update Node"
              />
            )}
          </>
        )}
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Editor Permissions</h5>
        <p className="text-xs text-text-muted">
          No on-chain list of current editors is exposed — this can only add/revoke by address.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={editorAddress}
            onChange={(e) => setEditorAddress(e.target.value)}
            placeholder="0x0000..."
            className={`${inputClass} sm:flex-1`}
            style={inputStyle}
          />
          <button
            type="button"
            disabled={editorPending || !editorAddress.trim()}
            onClick={() => void handleSetEditor(true)}
            className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Grant
          </button>
          <button
            type="button"
            disabled={editorPending || !editorAddress.trim()}
            onClick={() => void handleSetEditor(false)}
            className="px-4 py-2 rounded-none font-mono border border-warning-red text-warning-red hover:bg-warning-red/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revoke
          </button>
        </div>
      </div>
    </div>
  );
}
