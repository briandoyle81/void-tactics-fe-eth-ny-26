"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { useMapEnemyThreatWeb2 } from "../hooks/useMapEnemyThreatWeb2";

// Mirrors RoguelikeNodeMapAdminPanel.tsx's RoguelikeNodeThreatLabel.
function RoguelikeNodeThreatLabelWeb2({ mapId }: { mapId: number }) {
  const { totalThreat } = useMapEnemyThreatWeb2(mapId);
  return <>{totalThreat}</>;
}

// Web2 counterpart to RoguelikeNodeMapAdminPanel.tsx (web3) — campaign
// settings, node CRUD with kind-gated fields, incremental edge editor
// (no bulk replace, same as web3), and the repair-cost-per-HP setting.

interface RoguelikeCampaignAdmin {
  id: number;
  requiredVariant: number;
  autoHealPercent: number;
  initialCostCap: number;
  rootNodeId: number | null;
}
interface RoguelikeNodeAdmin {
  id: number;
  campaignId: number;
  kind: number;
  mapId: number | null;
  turnTimeSeconds: number | null;
  maxScore: number | null;
  creatorGoesFirst: boolean | null;
  costCapOverride: number | null;
  childEdges: Array<{ id: number; parentId: number; childId: number; twoWay: boolean }>;
}

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

interface NodeFormState {
  campaignId: string;
  kind: number;
  mapId: string;
  turnTimeSeconds: string;
  maxScore: string;
  creatorGoesFirst: boolean;
  costCapOverride: string;
}

const EMPTY_FORM: NodeFormState = {
  campaignId: "1",
  kind: 0,
  mapId: "",
  turnTimeSeconds: "",
  maxScore: "",
  creatorGoesFirst: true,
  costCapOverride: "0",
};

function nodeToForm(node: RoguelikeNodeAdmin): NodeFormState {
  return {
    campaignId: node.campaignId.toString(),
    kind: node.kind,
    mapId: node.mapId?.toString() ?? "",
    turnTimeSeconds: node.turnTimeSeconds?.toString() ?? "",
    maxScore: node.maxScore?.toString() ?? "",
    creatorGoesFirst: node.creatorGoesFirst ?? true,
    costCapOverride: node.costCapOverride?.toString() ?? "0",
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
  const isCombat = form.kind === 0;
  const valid =
    form.campaignId.trim() !== "" &&
    (!isCombat || (form.mapId.trim() !== "" && form.turnTimeSeconds.trim() !== "" && form.maxScore.trim() !== ""));

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
          <label className="block text-xs text-cyan mb-1">Kind</label>
          <select
            value={form.kind}
            onChange={(e) => onChange({ ...form, kind: Number(e.target.value) })}
            className={inputClass}
            style={inputStyle}
          >
            <option value={0}>Combat</option>
            <option value={1}>Resupply</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Map ID {!isCombat && "(unused)"}</label>
          <input
            type="number"
            min={1}
            disabled={!isCombat}
            value={form.mapId}
            onChange={(e) => onChange({ ...form, mapId: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Turn Time (s) {!isCombat && "(unused)"}</label>
          <input
            type="number"
            min={0}
            disabled={!isCombat}
            value={form.turnTimeSeconds}
            onChange={(e) => onChange({ ...form, turnTimeSeconds: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Max Score {!isCombat && "(unused)"}</label>
          <input
            type="number"
            min={0}
            disabled={!isCombat}
            value={form.maxScore}
            onChange={(e) => onChange({ ...form, maxScore: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">
            Cost Cap Override {isCombat && "(unused, Resupply only)"}
          </label>
          <input
            type="number"
            min={0}
            disabled={isCombat}
            value={form.costCapOverride}
            onChange={(e) => onChange({ ...form, costCapOverride: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-cyan">
        <input
          type="checkbox"
          disabled={!isCombat}
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

export function RoguelikeNodeMapAdminPanelWeb2() {
  const isAdmin = useWeb2Admin();
  const queryClient = useQueryClient();

  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin", "roguelike-campaigns", "web2"],
    queryFn: () => apiFetch<RoguelikeCampaignAdmin[]>("/api/admin/roguelike/campaigns"),
    enabled: isAdmin,
  });
  const { data: nodes = [] } = useQuery({
    queryKey: ["admin", "roguelike-nodes", "web2"],
    queryFn: () => apiFetch<RoguelikeNodeAdmin[]>("/api/admin/roguelike/nodes"),
    enabled: isAdmin,
  });
  const { data: settings } = useQuery({
    queryKey: ["admin", "roguelike-settings", "web2"],
    queryFn: () => apiFetch<{ repairCostPerHp: number }>("/api/admin/roguelike-settings"),
    enabled: isAdmin,
  });

  const [requiredVariant, setRequiredVariant] = useState("0");
  const [autoHealPercent, setAutoHealPercent] = useState("0");
  const [initialCostCap, setInitialCostCap] = useState("1000");
  const [campaignPending, setCampaignPending] = useState(false);

  const [rootCampaignId, setRootCampaignId] = useState("1");
  const [rootNodeId, setRootNodeId] = useState("");
  const [rootPending, setRootPending] = useState(false);

  const [createForm, setCreateForm] = useState<NodeFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [updateForm, setUpdateForm] = useState<NodeFormState>(EMPTY_FORM);
  const [updating, setUpdating] = useState(false);

  const [parentId, setParentId] = useState("");
  const [childId, setChildId] = useState("");
  const [twoWay, setTwoWay] = useState(false);
  const [edgePending, setEdgePending] = useState(false);

  const [repairCostPerHp, setRepairCostPerHp] = useState("1");
  const [repairCostPending, setRepairCostPending] = useState(false);

  React.useEffect(() => {
    if (settings) setRepairCostPerHp(settings.repairCostPerHp.toString());
  }, [settings]);

  const sortedNodes = React.useMemo(() => [...nodes].sort((a, b) => a.id - b.id), [nodes]);
  const selectedNode = sortedNodes.find((n) => n.id.toString() === selectedNodeId);

  React.useEffect(() => {
    if (selectedNode) setUpdateForm(nodeToForm(selectedNode));
  }, [selectedNode]);

  if (!isAdmin) return null;

  const invalidateCampaigns = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "roguelike-campaigns", "web2"] });
  const invalidateNodes = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "roguelike-nodes", "web2"] });

  const handleCreateCampaign = async () => {
    setCampaignPending(true);
    try {
      await apiMutate("/api/admin/roguelike/campaigns", "POST", {
        requiredVariant: Number(requiredVariant),
        autoHealPercent: Number(autoHealPercent),
        initialCostCap: Number(initialCostCap),
      });
      await invalidateCampaigns();
      toast.success("Campaign created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create campaign");
    } finally {
      setCampaignPending(false);
    }
  };

  const handleSetRoot = async () => {
    const campaign = campaigns.find((c) => c.id === Number(rootCampaignId));
    if (!campaign) return;
    setRootPending(true);
    try {
      await apiMutate(`/api/admin/roguelike/campaigns/${campaign.id}`, "PUT", {
        requiredVariant: campaign.requiredVariant,
        autoHealPercent: campaign.autoHealPercent,
        initialCostCap: campaign.initialCostCap,
        rootNodeId: Number(rootNodeId),
      });
      await invalidateCampaigns();
      toast.success("Root node set");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to set root node");
    } finally {
      setRootPending(false);
    }
  };

  const handleCreateNode = async () => {
    setCreating(true);
    try {
      await apiMutate("/api/admin/roguelike/nodes", "POST", {
        campaignId: Number(createForm.campaignId),
        kind: createForm.kind,
        mapId: createForm.mapId ? Number(createForm.mapId) : null,
        turnTimeSeconds: createForm.turnTimeSeconds ? Number(createForm.turnTimeSeconds) : null,
        maxScore: createForm.maxScore ? Number(createForm.maxScore) : null,
        creatorGoesFirst: createForm.creatorGoesFirst,
        costCapOverride: createForm.costCapOverride ? Number(createForm.costCapOverride) : null,
      });
      setCreateForm(EMPTY_FORM);
      await invalidateNodes();
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
      await apiMutate(`/api/admin/roguelike/nodes/${selectedNode.id}`, "PUT", {
        campaignId: Number(updateForm.campaignId),
        kind: updateForm.kind,
        mapId: updateForm.mapId ? Number(updateForm.mapId) : null,
        turnTimeSeconds: updateForm.turnTimeSeconds ? Number(updateForm.turnTimeSeconds) : null,
        maxScore: updateForm.maxScore ? Number(updateForm.maxScore) : null,
        creatorGoesFirst: updateForm.creatorGoesFirst,
        costCapOverride: updateForm.costCapOverride ? Number(updateForm.costCapOverride) : null,
      });
      await invalidateNodes();
      toast.success("Node updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update node");
    } finally {
      setUpdating(false);
    }
  };

  const handleAddEdge = async () => {
    if (!parentId || !childId) return;
    setEdgePending(true);
    try {
      await apiMutate("/api/admin/roguelike/edges", "POST", {
        parentId: Number(parentId),
        childId: Number(childId),
        twoWay,
      });
      await invalidateNodes();
      toast.success("Edge added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add edge");
    } finally {
      setEdgePending(false);
    }
  };

  const handleRemoveEdge = async (pId: number, cId: number) => {
    setEdgePending(true);
    try {
      await apiMutate("/api/admin/roguelike/edges", "DELETE", { parentId: pId, childId: cId });
      await invalidateNodes();
      toast.success("Edge removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove edge");
    } finally {
      setEdgePending(false);
    }
  };

  const handleSetRepairCost = async () => {
    setRepairCostPending(true);
    try {
      await apiMutate("/api/admin/roguelike-settings", "PUT", {
        repairCostPerHp: Number(repairCostPerHp),
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "roguelike-settings", "web2"] });
      toast.success("Repair cost updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update repair cost");
    } finally {
      setRepairCostPending(false);
    }
  };

  return (
    <div className="mt-8 space-y-6 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[ROGUELIKE CAMPAIGN]</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Campaigns</h5>
        <div className="space-y-1">
          {campaigns.length === 0 ? (
            <p className="text-xs text-text-muted">No campaigns yet.</p>
          ) : (
            campaigns.map((c) => (
              <div key={c.id} className="flex flex-wrap justify-between gap-x-3 text-xs text-text-secondary">
                <span>Campaign #{c.id}</span>
                <span className="text-cyan">
                  variant {c.requiredVariant || "any"} / heal {c.autoHealPercent}% / cap {c.initialCostCap} / root{" "}
                  {c.rootNodeId ?? "unset"}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-cyan mb-1">Required Variant</label>
            <input type="number" min={0} value={requiredVariant} onChange={(e) => setRequiredVariant(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs text-cyan mb-1">Auto-heal %</label>
            <input type="number" min={0} max={100} value={autoHealPercent} onChange={(e) => setAutoHealPercent(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs text-cyan mb-1">Initial Cost Cap</label>
            <input type="number" min={0} value={initialCostCap} onChange={(e) => setInitialCostCap(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
        </div>
        <button
          type="button"
          disabled={campaignPending}
          onClick={() => void handleCreateCampaign()}
          className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
        >
          {campaignPending ? "Creating..." : "Create Campaign"}
        </button>

        <div className="grid grid-cols-3 gap-3 items-end pt-2">
          <div>
            <label className="block text-xs text-cyan mb-1">Campaign ID</label>
            <input type="number" min={1} value={rootCampaignId} onChange={(e) => setRootCampaignId(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs text-cyan mb-1">Root Node ID</label>
            <input type="number" min={1} value={rootNodeId} onChange={(e) => setRootNodeId(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <button
            type="button"
            disabled={rootPending || !rootNodeId}
            onClick={() => void handleSetRoot()}
            className="px-4 py-2 rounded-none font-mono border border-cyan text-cyan hover:bg-cyan/10 disabled:opacity-50"
          >
            {rootPending ? "Setting..." : "Set Root"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Nodes</h5>
        <div className="space-y-1">
          {sortedNodes.length === 0 ? (
            <p className="text-xs text-text-muted">No nodes yet.</p>
          ) : (
            sortedNodes.map((n) => (
              <div key={n.id} className="flex flex-wrap justify-between gap-x-3 text-xs text-text-secondary">
                <span>
                  #{n.id} {n.kind === 0 ? "Combat" : "Resupply"}
                  {n.kind === 0 && ` (map ${n.mapId})`}
                </span>
                <span className="text-cyan">
                  campaign {n.campaignId}
                  {n.kind === 0 ? (
                    <>
                      {" / threat "}
                      <RoguelikeNodeThreatLabelWeb2 mapId={n.mapId ?? 0} />
                      {` / score ${n.maxScore}`}
                    </>
                  ) : (
                    ` / cost cap override ${n.costCapOverride}`
                  )}
                  {n.childEdges.length > 0 &&
                    ` / children ${n.childEdges.map((e) => `${e.childId}${e.twoWay ? "(2way)" : ""}`).join(", ")}`}
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
                  #{n.id} ({n.kind === 0 ? "Combat" : "Resupply"})
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

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Edges</h5>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-cyan mb-1">Parent Node ID</label>
            <input type="number" min={1} value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs text-cyan mb-1">Child Node ID</label>
            <input type="number" min={1} value={childId} onChange={(e) => setChildId(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <label className="flex items-center gap-2 text-xs text-cyan">
            <input type="checkbox" checked={twoWay} onChange={(e) => setTwoWay(e.target.checked)} />
            Two-way
          </label>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={edgePending || !parentId || !childId}
            onClick={() => void handleAddEdge()}
            className="px-4 py-2 rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
          >
            Add Edge
          </button>
          <button
            type="button"
            disabled={edgePending || !parentId || !childId}
            onClick={() => void handleRemoveEdge(Number(parentId), Number(childId))}
            className="px-4 py-2 rounded-none font-mono border border-warning-red text-warning-red hover:bg-warning-red/10 disabled:opacity-50"
          >
            Remove Edge
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Resupply Settings</h5>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-cyan mb-1">Repair Cost per HP (UTC)</label>
            <input
              type="number"
              min={0}
              value={repairCostPerHp}
              onChange={(e) => setRepairCostPerHp(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <button
            type="button"
            disabled={repairCostPending}
            onClick={() => void handleSetRepairCost()}
            className="px-4 py-2 rounded-none font-mono border border-cyan text-cyan hover:bg-cyan/10 disabled:opacity-50"
          >
            {repairCostPending ? "Saving..." : "Set Repair Cost"}
          </button>
        </div>
      </div>
    </div>
  );
}
