"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useMapEnemyThreatWeb2 } from "../hooks/useMapEnemyThreatWeb2";

// enemyThreat mirrors NodeMapAdminPanel.tsx's NodeThreatLabel — total AI
// fleet cost derived from the map's actual placements, one hook instance
// per row (same per-item hook pattern used throughout this port).
function NodeThreatLabelWeb2({ mapId }: { mapId: number }) {
  const { totalThreat } = useMapEnemyThreatWeb2(mapId);
  return <>threat {totalThreat}</>;
}

// Web2 counterpart to NodeMapAdminPanel.tsx (web3) — same layout/flow,
// backed by Campaign/CampaignNode rows via /api/admin/campaign/campaigns
// and /api/admin/campaign/nodes instead of the NodeMap contract, gated on
// useWeb2Admin() instead of on-chain isNodeEditor.

interface CampaignWeb2 {
  id: number;
  requiredVariant: number;
}
interface CampaignNodeWeb2 {
  id: number;
  campaignId: number;
  mapId: number;
  prerequisites: number[];
  costLimit: number;
  turnTimeSeconds: number;
  maxScore: number;
  creatorGoesFirst: boolean;
}

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

interface NodeFormState {
  campaignId: string;
  mapId: string;
  prerequisites: string;
  costLimit: string;
  turnTimeSeconds: string;
  maxScore: string;
  creatorGoesFirst: boolean;
}

const EMPTY_FORM: NodeFormState = {
  campaignId: "1",
  mapId: "",
  prerequisites: "",
  costLimit: "",
  turnTimeSeconds: "",
  maxScore: "",
  creatorGoesFirst: true,
};

function nodeToForm(node: CampaignNodeWeb2): NodeFormState {
  return {
    campaignId: node.campaignId.toString(),
    mapId: node.mapId.toString(),
    prerequisites: node.prerequisites.join(", "),
    costLimit: node.costLimit.toString(),
    turnTimeSeconds: node.turnTimeSeconds.toString(),
    maxScore: node.maxScore.toString(),
    creatorGoesFirst: node.creatorGoesFirst,
  };
}

function parsePrerequisites(text: string): number[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^\d+$/.test(s))
    .map((s) => Number(s));
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
    form.turnTimeSeconds.trim() !== "" &&
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
            value={form.turnTimeSeconds}
            onChange={(e) => onChange({ ...form, turnTimeSeconds: e.target.value })}
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
          Prerequisites (comma-separated node ids, ANY-of unlock)
        </label>
        <input
          type="text"
          value={form.prerequisites}
          onChange={(e) => onChange({ ...form, prerequisites: e.target.value })}
          className={inputClass}
          style={inputStyle}
          placeholder="e.g. 1, 2"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-cyan">
        <input
          type="checkbox"
          checked={form.creatorGoesFirst}
          onChange={(e) => onChange({ ...form, creatorGoesFirst: e.target.checked })}
        />
        Creator goes first
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

export function NodeMapAdminPanelWeb2() {
  const isAdmin = useWeb2Admin();
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin", "campaigns", "web2"],
    queryFn: () => apiFetch<CampaignWeb2[]>("/api/admin/campaign/campaigns"),
    enabled: isAdmin,
  });
  const { data: nodes = [] } = useQuery({
    queryKey: ["admin", "campaign-nodes", "web2"],
    queryFn: () => apiFetch<CampaignNodeWeb2[]>("/api/admin/campaign/nodes"),
    enabled: isAdmin,
  });

  const [requiredVariant, setRequiredVariant] = useState("1");
  const [campaignPending, setCampaignPending] = useState(false);
  const [createForm, setCreateForm] = useState<NodeFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [updateForm, setUpdateForm] = useState<NodeFormState>(EMPTY_FORM);
  const [updating, setUpdating] = useState(false);

  const sortedNodes = React.useMemo(() => [...nodes].sort((a, b) => a.id - b.id), [nodes]);
  const selectedNode = sortedNodes.find((n) => n.id.toString() === selectedNodeId);

  React.useEffect(() => {
    if (selectedNode) setUpdateForm(nodeToForm(selectedNode));
  }, [selectedNode]);

  if (!isAdmin) return null;

  const handleCreateCampaign = async () => {
    setCampaignPending(true);
    try {
      await apiMutate("/api/admin/campaign/campaigns", "POST", {
        requiredVariant: Number(requiredVariant),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "campaigns", "web2"] });
      toast.success("Campaign created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create campaign");
    } finally {
      setCampaignPending(false);
    }
  };

  const handleCreateNode = async () => {
    setCreating(true);
    try {
      await apiMutate("/api/admin/campaign/nodes", "POST", {
        campaignId: Number(createForm.campaignId),
        mapId: Number(createForm.mapId),
        prerequisites: parsePrerequisites(createForm.prerequisites),
        costLimit: Number(createForm.costLimit),
        turnTimeSeconds: Number(createForm.turnTimeSeconds),
        maxScore: Number(createForm.maxScore),
        creatorGoesFirst: createForm.creatorGoesFirst,
      });
      setCreateForm(EMPTY_FORM);
      await queryClient.invalidateQueries({ queryKey: ["admin", "campaign-nodes", "web2"] });
      toast.success("Node created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create node");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateNode = async () => {
    if (!selectedNode) return;
    setUpdating(true);
    try {
      await apiMutate(`/api/admin/campaign/nodes/${selectedNode.id}`, "PUT", {
        campaignId: Number(updateForm.campaignId),
        mapId: Number(updateForm.mapId),
        prerequisites: parsePrerequisites(updateForm.prerequisites),
        costLimit: Number(updateForm.costLimit),
        turnTimeSeconds: Number(updateForm.turnTimeSeconds),
        maxScore: Number(updateForm.maxScore),
        creatorGoesFirst: updateForm.creatorGoesFirst,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "campaign-nodes", "web2"] });
      toast.success("Node updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update node");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="mt-8 space-y-6 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[CAMPAIGN NODES]</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Campaigns</h5>
        <div className="space-y-1">
          {campaigns.length === 0 ? (
            <p className="text-xs text-text-muted">No campaigns yet.</p>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="flex justify-between text-xs text-text-secondary">
                <span>Campaign #{c.id}</span>
                <span className="text-cyan">
                  {c.requiredVariant > 0 ? `Requires Faction ${c.requiredVariant}` : "Unrestricted"}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-cyan mb-1">Required Variant (0 = unrestricted)</label>
            <input
              type="number"
              min={0}
              value={requiredVariant}
              onChange={(e) => setRequiredVariant(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <button
            type="button"
            disabled={campaignPending}
            onClick={() => void handleCreateCampaign()}
            className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
          >
            {campaignPending ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Nodes</h5>
        <div className="space-y-1">
          {sortedNodes.length === 0 ? (
            <p className="text-xs text-text-muted">No campaign nodes yet.</p>
          ) : (
            sortedNodes.map((n) => (
              <div key={n.id} className="flex flex-wrap justify-between gap-x-3 text-xs text-text-secondary">
                <span>#{n.id} (map {n.mapId})</span>
                <span className="text-cyan">
                  campaign {n.campaignId} / cost {n.costLimit} / turn {n.turnTimeSeconds}s / score {n.maxScore}
                  {" / "}
                  <NodeThreatLabelWeb2 mapId={n.mapId} />
                  {n.prerequisites.length > 0 && ` / requires ${n.prerequisites.join(" or ")}`}
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
          onSubmit={() => void handleCreateNode()}
          pending={creating}
          submitLabel="Create Node"
        />
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Update Node</h5>
        {sortedNodes.length === 0 ? (
          <p className="text-xs text-text-muted">Create a node first.</p>
        ) : (
          <div className="space-y-3">
            <select
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">Select a node…</option>
              {sortedNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  #{n.id} (map {n.mapId})
                </option>
              ))}
            </select>
            {selectedNode && (
              <NodeForm
                form={updateForm}
                onChange={setUpdateForm}
                onSubmit={() => void handleUpdateNode()}
                pending={updating}
                submitLabel="Update Node"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
