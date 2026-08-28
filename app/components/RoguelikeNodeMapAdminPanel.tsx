"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import {
  useIsRoguelikeNodeEditor,
  useAllRoguelikeNodes,
  useRoguelikeCampaignCount,
  useRoguelikeCampaignRootNode,
  useCampaignAutoHealPercent,
  useRoguelikeCampaignRequiredVariant,
  useRoguelikeCampaignInitialCostCap,
} from "../hooks/useRoguelikeNodeMap";
import { useRoguelikeNodeMapAdmin } from "../hooks/useRoguelikeNodeMapAdmin";
import { useRepairCostPerHP } from "../hooks/useRoguelikeResupply";
import { useMapEnemyThreat } from "../hooks/useAIEncountersContract";
import { RoguelikeNode, RoguelikeNodeKind } from "../types/roguelike";

const inputClass =
  "w-full px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan";
const inputStyle = { borderRadius: 0, borderColor: "var(--color-cyan)" } as const;

// Only campaign 1 is expected to exist for a while — same "default, not a
// real picker yet" approach NodeMapAdminPanel.tsx takes for the original
// campaign system.
const DEFAULT_CAMPAIGN_ID = "1";

interface NodeFormState {
  campaignId: string;
  kind: RoguelikeNodeKind;
  mapId: string;
  turnTime: string;
  maxScore: string;
  creatorGoesFirst: boolean;
  costCapOverride: string;
}

const EMPTY_FORM: NodeFormState = {
  campaignId: DEFAULT_CAMPAIGN_ID,
  kind: RoguelikeNodeKind.Combat,
  mapId: "",
  turnTime: "",
  maxScore: "",
  creatorGoesFirst: true,
  costCapOverride: "0",
};

function nodeToForm(node: RoguelikeNode): NodeFormState {
  return {
    campaignId: node.campaignId.toString(),
    kind: node.kind,
    mapId: node.mapId.toString(),
    turnTime: node.turnTime.toString(),
    maxScore: node.maxScore.toString(),
    creatorGoesFirst: node.creatorGoesFirst,
    costCapOverride: node.costCapOverride.toString(),
  };
}

// enemyThreat is no longer a stored RoguelikeNodeMap field (removed from
// createNode/updateNode/getNode) — this derives the same "total AI fleet
// cost" number from the map's actual placements instead, same as
// NodeMapAdminPanel.tsx's NodeThreatLabel. Own component instance per row
// so the hook call is valid.
function RoguelikeNodeThreatLabel({ mapId }: { mapId: bigint }) {
  const { totalThreat } = useMapEnemyThreat(mapId);
  return <>{totalThreat}</>;
}

// createNode/updateNode take every field regardless of kind — Combat-only
// fields (mapId/turnTime/maxScore/creatorGoesFirst) are grayed out for
// Resupply, and costCapOverride (Resupply-only, 0 = "no change") is grayed
// out for Combat, rather than building two separate forms.
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
  const isCombat = form.kind === RoguelikeNodeKind.Combat;
  const valid =
    form.campaignId.trim() !== "" &&
    (!isCombat || (form.mapId.trim() !== "" && form.turnTime.trim() !== "" && form.maxScore.trim() !== ""));

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
            onChange={(e) => onChange({ ...form, kind: Number(e.target.value) as RoguelikeNodeKind })}
            className={inputClass}
            style={inputStyle}
          >
            <option value={RoguelikeNodeKind.Combat}>Combat</option>
            <option value={RoguelikeNodeKind.Resupply}>Resupply</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Map ID {!isCombat && "(unused)"}</label>
          <input
            type="number"
            min={0}
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
            value={form.turnTime}
            onChange={(e) => onChange({ ...form, turnTime: e.target.value })}
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
            placeholder="0 = no change"
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

function CampaignSettingsForm() {
  const admin = useRoguelikeNodeMapAdmin();
  const [campaignId, setCampaignId] = useState(DEFAULT_CAMPAIGN_ID);
  const { data: campaignCount, refetch: refetchCount } = useRoguelikeCampaignCount();
  const { data: rootNode, refetch: refetchRoot } = useRoguelikeCampaignRootNode(BigInt(campaignId || "0"));
  const { data: autoHeal, refetch: refetchAutoHeal } = useCampaignAutoHealPercent(BigInt(campaignId || "0"));
  const { data: requiredVariant, refetch: refetchVariant } = useRoguelikeCampaignRequiredVariant(
    BigInt(campaignId || "0"),
  );
  const { data: initialCostCap, refetch: refetchCostCap } = useRoguelikeCampaignInitialCostCap(
    BigInt(campaignId || "0"),
  );

  const [rootInput, setRootInput] = useState("");
  const [healInput, setHealInput] = useState("");
  const [variantInput, setVariantInput] = useState("");
  const [costCapInput, setCostCapInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  useEffect(() => {
    if (rootNode != null) setRootInput(rootNode.toString());
    if (autoHeal != null) setHealInput(autoHeal.toString());
    if (requiredVariant != null) setVariantInput(requiredVariant.toString());
    if (initialCostCap != null) setCostCapInput(initialCostCap.toString());
  }, [rootNode, autoHeal, requiredVariant, initialCostCap]);

  const handleCreateCampaign = async () => {
    setCreatingCampaign(true);
    try {
      await admin.createCampaign();
      await refetchCount();
    } catch (error) {
      console.error("Failed to create campaign:", error);
    } finally {
      setCreatingCampaign(false);
    }
  };

  return (
    <div className="space-y-3 border border-gunmetal bg-black/40 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-text-muted">
          Campaigns: {campaignCount != null ? campaignCount.toString() : "…"}
        </span>
        <button
          type="button"
          disabled={creatingCampaign}
          onClick={() => void handleCreateCampaign()}
          className="px-3 py-1.5 text-xs rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
        >
          {creatingCampaign ? "Creating..." : "+ New Campaign"}
        </button>
      </div>
      <div>
        <label className="block text-xs text-cyan mb-1">Campaign ID to edit</label>
        <input
          type="number"
          min={1}
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs text-cyan mb-1">Root Node ID</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={rootInput}
              onChange={(e) => setRootInput(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
            <button
              type="button"
              disabled={pending === "root" || !rootInput}
              onClick={async () => {
                setPending("root");
                try {
                  await admin.setCampaignRoot(BigInt(campaignId), BigInt(rootInput));
                  await refetchRoot();
                } catch (error) {
                  console.error("Failed to set campaign root:", error);
                } finally {
                  setPending(null);
                }
              }}
              className="shrink-0 px-3 text-xs rounded-none font-mono border border-cyan text-cyan hover:bg-cyan/10 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Auto-Heal % (0-100)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={healInput}
              onChange={(e) => setHealInput(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
            <button
              type="button"
              disabled={pending === "heal" || !healInput}
              onClick={async () => {
                setPending("heal");
                try {
                  await admin.setCampaignAutoHealPercent(BigInt(campaignId), Number(healInput));
                  await refetchAutoHeal();
                } catch (error) {
                  console.error("Failed to set auto-heal percent:", error);
                } finally {
                  setPending(null);
                }
              }}
              className="shrink-0 px-3 text-xs rounded-none font-mono border border-cyan text-cyan hover:bg-cyan/10 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs text-cyan mb-1">Required Variant (0 = any)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={variantInput}
              onChange={(e) => setVariantInput(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
            <button
              type="button"
              disabled={pending === "variant" || variantInput === ""}
              onClick={async () => {
                setPending("variant");
                try {
                  await admin.setCampaignRequiredVariant(BigInt(campaignId), Number(variantInput));
                  await refetchVariant();
                } catch (error) {
                  console.error("Failed to set required variant:", error);
                } finally {
                  setPending(null);
                }
              }}
              className="shrink-0 px-3 text-xs rounded-none font-mono border border-cyan text-cyan hover:bg-cyan/10 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </div>
      </div>
      <div>
        <label className="block text-xs text-cyan mb-1">Initial Cost Cap</label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            value={costCapInput}
            onChange={(e) => setCostCapInput(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
          <button
            type="button"
            disabled={pending === "costcap" || !costCapInput}
            onClick={async () => {
              setPending("costcap");
              try {
                await admin.setCampaignInitialCostCap(BigInt(campaignId), BigInt(costCapInput));
                await refetchCostCap();
              } catch (error) {
                console.error("Failed to set initial cost cap:", error);
              } finally {
                setPending(null);
              }
            }}
            className="shrink-0 px-3 text-xs rounded-none font-mono border border-cyan text-cyan hover:bg-cyan/10 disabled:opacity-50"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}

/** Gated on RoguelikeNodeMap.isNodeEditor — separate permission domain from NodeMap's own editor role. */
export function RoguelikeNodeMapAdminPanel() {
  const { address } = useAccount();
  const { data: isEditor, isLoading } = useIsRoguelikeNodeEditor(address);
  const admin = useRoguelikeNodeMapAdmin();
  const { nodes, refetch } = useAllRoguelikeNodes();
  const { data: repairCostPerHP } = useRepairCostPerHP();

  const [createForm, setCreateForm] = useState<NodeFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const sortedNodes = useMemo(() => [...nodes].sort((a, b) => Number(a.id - b.id)), [nodes]);
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

  const [parentId, setParentId] = useState("");
  const [childId, setChildId] = useState("");
  const [twoWay, setTwoWay] = useState(false);
  const [edgePending, setEdgePending] = useState(false);

  const [editorAddress, setEditorAddress] = useState("");
  const [editorPending, setEditorPending] = useState(false);

  const [repairCostInput, setRepairCostInput] = useState("");
  const [repairCostPending, setRepairCostPending] = useState(false);
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawPending, setWithdrawPending] = useState(false);

  if (isLoading || !isEditor) return null;

  const handleCreate = async () => {
    setCreating(true);
    try {
      await admin.createNode(
        BigInt(createForm.campaignId),
        createForm.kind,
        BigInt(createForm.mapId || "0"),
        BigInt(createForm.turnTime || "0"),
        BigInt(createForm.maxScore || "0"),
        createForm.creatorGoesFirst,
        BigInt(createForm.costCapOverride || "0"),
      );
      setCreateForm(EMPTY_FORM);
      await refetch();
    } catch (error) {
      console.error("Failed to create roguelike node:", error);
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
        updateForm.kind,
        BigInt(updateForm.mapId || "0"),
        BigInt(updateForm.turnTime || "0"),
        BigInt(updateForm.maxScore || "0"),
        updateForm.creatorGoesFirst,
        BigInt(updateForm.costCapOverride || "0"),
      );
      await refetch();
    } catch (error) {
      console.error("Failed to update roguelike node:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddChild = async () => {
    if (!parentId || !childId) return;
    setEdgePending(true);
    try {
      await admin.addChild(BigInt(parentId), BigInt(childId), twoWay);
      await refetch();
    } catch (error) {
      console.error("Failed to add child edge:", error);
    } finally {
      setEdgePending(false);
    }
  };

  const handleRemoveChild = async () => {
    if (!parentId || !childId) return;
    setEdgePending(true);
    try {
      await admin.removeChild(BigInt(parentId), BigInt(childId));
      await refetch();
    } catch (error) {
      console.error("Failed to remove child edge:", error);
    } finally {
      setEdgePending(false);
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
      console.error("Failed to update roguelike node editor:", error);
    } finally {
      setEditorPending(false);
    }
  };

  return (
    <div className="mt-8 space-y-6 border border-purple-400 bg-black/40 p-4" style={{ borderRadius: 0 }}>
      <h4 className="text-lg font-bold text-purple tracking-widest">[ROGUELIKE CAMPAIGN NODES]</h4>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Campaign Settings</h5>
        <CampaignSettingsForm />
      </div>

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Nodes</h5>
        <div className="space-y-1">
          {sortedNodes.length === 0 ? (
            <p className="text-xs text-text-muted">No roguelike nodes yet.</p>
          ) : (
            sortedNodes.map((n) => (
              <div key={n.id.toString()} className="flex flex-wrap justify-between gap-x-3 text-xs text-text-secondary">
                <span>
                  #{n.id.toString()} {n.kind === RoguelikeNodeKind.Combat ? "Combat" : "Resupply"}
                  {n.kind === RoguelikeNodeKind.Combat && ` (map ${n.mapId.toString()})`}
                </span>
                <span className="text-cyan">
                  campaign {n.campaignId.toString()}
                  {n.kind === RoguelikeNodeKind.Combat ? (
                    <>
                      {" / threat "}
                      <RoguelikeNodeThreatLabel mapId={n.mapId} />
                      {` / score ${n.maxScore.toString()}`}
                    </>
                  ) : (
                    ` / cost cap override ${n.costCapOverride.toString()}`
                  )}
                  {n.children.length > 0 &&
                    ` / children ${n.children.map((c) => `${c.childId.toString()}${c.twoWay ? "(2way)" : ""}`).join(", ")}`}
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
                  #{n.id.toString()} ({n.kind === RoguelikeNodeKind.Combat ? "Combat" : "Resupply"})
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
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">
          Graph Edges (no bulk replace — add/remove one at a time)
        </h5>
        <div className="flex flex-wrap items-end gap-3 border border-gunmetal bg-black/40 p-3">
          <div>
            <label className="block text-xs text-cyan mb-1">Parent Node ID</label>
            <input
              type="number"
              min={1}
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs text-cyan mb-1">Child Node ID</label>
            <input
              type="number"
              min={1}
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <label className="flex items-center gap-2 pb-2 text-xs text-cyan">
            <input type="checkbox" checked={twoWay} onChange={(e) => setTwoWay(e.target.checked)} />
            Two-way
          </label>
          <button
            type="button"
            disabled={edgePending || !parentId || !childId}
            onClick={() => void handleAddChild()}
            className="px-3 py-2 text-xs rounded-none font-mono border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 disabled:opacity-50"
          >
            Add Edge
          </button>
          <button
            type="button"
            disabled={edgePending || !parentId || !childId}
            onClick={() => void handleRemoveChild()}
            className="px-3 py-2 text-xs rounded-none font-mono border border-warning-red text-warning-red hover:bg-warning-red/20 disabled:opacity-50"
          >
            Remove Edge
          </button>
        </div>
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

      <div className="space-y-3">
        <h5 className="text-sm font-bold text-cyan uppercase tracking-wider">Resupply Settings</h5>
        <div className="flex flex-wrap items-end gap-3 border border-gunmetal bg-black/40 p-3">
          <div>
            <label className="block text-xs text-cyan mb-1">
              Repair Cost / HP (wei) — current: {repairCostPerHP != null ? repairCostPerHP.toString() : "…"}
            </label>
            <input
              type="text"
              value={repairCostInput}
              onChange={(e) => setRepairCostInput(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. 10000000000000000"
            />
          </div>
          <button
            type="button"
            disabled={repairCostPending || !repairCostInput}
            onClick={async () => {
              setRepairCostPending(true);
              try {
                await admin.setRepairCostPerHP(BigInt(repairCostInput));
                setRepairCostInput("");
              } catch (error) {
                console.error("Failed to set repair cost:", error);
              } finally {
                setRepairCostPending(false);
              }
            }}
            className="px-3 py-2 text-xs rounded-none font-mono border border-cyan text-cyan hover:bg-cyan/10 disabled:opacity-50"
          >
            Set
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-3 border border-gunmetal bg-black/40 p-3">
          <div>
            <label className="block text-xs text-cyan mb-1">Withdraw accumulated UTC fees to</label>
            <input
              type="text"
              value={withdrawTo}
              onChange={(e) => setWithdrawTo(e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="0x0000..."
            />
          </div>
          <button
            type="button"
            disabled={withdrawPending || !withdrawTo.trim().startsWith("0x")}
            onClick={async () => {
              setWithdrawPending(true);
              try {
                await admin.withdrawResupplyFees(withdrawTo.trim() as `0x${string}`);
                setWithdrawTo("");
              } catch (error) {
                console.error("Failed to withdraw resupply fees:", error);
              } finally {
                setWithdrawPending(false);
              }
            }}
            className="px-3 py-2 text-xs rounded-none font-mono border border-amber text-amber hover:bg-amber/10 disabled:opacity-50"
          >
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}
