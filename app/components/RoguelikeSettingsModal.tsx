"use client";

import React from "react";
import { toast } from "react-hot-toast";
import type { Address } from "viem";
import {
  useCampaignAutoHealPercent,
  useRoguelikeCampaignRequiredVariant,
  useRoguelikeCampaignRootNode,
  useRoguelikeCampaignInitialCostCap,
} from "../hooks/useRoguelikeNodeMap";
import { useRoguelikeNodeMapAdmin } from "../hooks/useRoguelikeNodeMapAdmin";
import { useAIEncountersAdmin } from "../hooks/useAIEncountersAdmin";
import { NodeContentPublishPanel } from "./NodeContentPublishPanel";

interface RoguelikeSettingsModalProps {
  campaignId: bigint;
  /** Every node id in this campaign — passed straight through to
   * NodeContentPublishPanel, see its prop doc for why. */
  nodeIds: number[];
  onClose: () => void;
  onSaved: () => void;
}

// Replaces the campaign-settings portions of RoguelikeNodeMapAdminPanel.tsx
// (fully replaced, alongside RoguelikeNodeEditPanel.tsx, by the in-context
// editor) — root node, auto-heal %, required variant, initial cost cap,
// merged editor grants (same "merge the permissions" decision as
// CampaignSettingsModal.tsx), and Resupply repair-cost/withdraw.
export function RoguelikeSettingsModal({
  campaignId,
  nodeIds,
  onClose,
  onSaved,
}: RoguelikeSettingsModalProps) {
  const admin = useRoguelikeNodeMapAdmin();
  const encountersAdmin = useAIEncountersAdmin();
  const { data: currentRoot, refetch: refetchRoot } = useRoguelikeCampaignRootNode(campaignId);
  const { data: currentAutoHeal, refetch: refetchAutoHeal } = useCampaignAutoHealPercent(campaignId);
  const { data: currentVariant, refetch: refetchVariant } =
    useRoguelikeCampaignRequiredVariant(campaignId);
  const { data: currentCostCap, refetch: refetchCostCap } =
    useRoguelikeCampaignInitialCostCap(campaignId);

  const [rootNodeId, setRootNodeId] = React.useState("");
  const [autoHealPercent, setAutoHealPercent] = React.useState(0);
  const [variant, setVariant] = React.useState(0);
  const [initialCostCap, setInitialCostCap] = React.useState("0");
  const [repairCostPerHp, setRepairCostPerHp] = React.useState("0");
  const [withdrawTo, setWithdrawTo] = React.useState("");
  const [editorAddress, setEditorAddress] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (currentRoot != null) setRootNodeId(currentRoot.toString());
  }, [currentRoot]);
  React.useEffect(() => {
    if (currentAutoHeal != null) setAutoHealPercent(currentAutoHeal);
  }, [currentAutoHeal]);
  React.useEffect(() => {
    if (currentVariant != null) setVariant(currentVariant);
  }, [currentVariant]);
  React.useEffect(() => {
    if (currentCostCap != null) setInitialCostCap(currentCostCap.toString());
  }, [currentCostCap]);

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await action();
      toast.success(`${label} saved.`);
      onSaved();
    } catch (error) {
      console.error(`Failed to save ${label}:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to save ${label}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[500] p-4">
      <div
        className="bg-near-black border-2 p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto rounded-none font-mono"
        style={{ borderColor: "var(--color-amber)" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-amber tracking-wider">[ROGUELIKE SETTINGS]</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-amber hover:text-amber/80 text-2xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <SettingRow label="Root node id">
            <input
              type="number"
              value={rootNodeId}
              onChange={(e) => setRootNodeId(e.target.value)}
              className="flex-1 px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
            <SaveButton
              busy={busy === "root"}
              onClick={() =>
                run("root", async () => {
                  await admin.setCampaignRoot(campaignId, BigInt(rootNodeId || "0"));
                  await refetchRoot();
                })
              }
            />
          </SettingRow>

          <SettingRow label="Auto-heal % on win (0-100)">
            <input
              type="number"
              min={0}
              max={100}
              value={autoHealPercent}
              onChange={(e) => setAutoHealPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className="flex-1 px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
            <SaveButton
              busy={busy === "autoHeal"}
              onClick={() =>
                run("autoHeal", async () => {
                  await admin.setCampaignAutoHealPercent(campaignId, autoHealPercent);
                  await refetchAutoHeal();
                })
              }
            />
          </SettingRow>

          <SettingRow label="Required fleet variant (0 = unrestricted)">
            <input
              type="number"
              min={0}
              value={variant}
              onChange={(e) => setVariant(Math.max(0, Number(e.target.value) || 0))}
              className="flex-1 px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
            <SaveButton
              busy={busy === "variant"}
              onClick={() =>
                run("variant", async () => {
                  await admin.setCampaignRequiredVariant(campaignId, variant);
                  await refetchVariant();
                })
              }
            />
          </SettingRow>

          <SettingRow label="Initial cost cap">
            <input
              type="number"
              value={initialCostCap}
              onChange={(e) => setInitialCostCap(e.target.value)}
              className="flex-1 px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
            <SaveButton
              busy={busy === "costCap"}
              onClick={() =>
                run("costCap", async () => {
                  await admin.setCampaignInitialCostCap(campaignId, BigInt(initialCostCap || "0"));
                  await refetchCostCap();
                })
              }
            />
          </SettingRow>

          <SettingRow label="Repair cost per HP (wei)">
            <input
              type="number"
              value={repairCostPerHp}
              onChange={(e) => setRepairCostPerHp(e.target.value)}
              className="flex-1 px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
            <SaveButton
              busy={busy === "repairCost"}
              onClick={() => run("repairCost", () => admin.setRepairCostPerHP(BigInt(repairCostPerHp || "0")))}
            />
          </SettingRow>

          <SettingRow label="Withdraw resupply fees to">
            <input
              type="text"
              value={withdrawTo}
              onChange={(e) => setWithdrawTo(e.target.value)}
              placeholder="0x..."
              className="flex-1 px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
            <SaveButton
              label="[WITHDRAW]"
              busy={busy === "withdraw"}
              onClick={() => run("withdraw", () => admin.withdrawResupplyFees(withdrawTo as Address))}
            />
          </SettingRow>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-muted">
              Editor access — grants both node-editing and enemy-fleet-editing permissions together
            </label>
            <input
              type="text"
              value={editorAddress}
              onChange={(e) => setEditorAddress(e.target.value)}
              placeholder="0x..."
              className="px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === "grant"}
                onClick={() =>
                  run("grant", async () => {
                    await admin.setNodeEditor(editorAddress as Address, true);
                    await encountersAdmin.setEncounterEditor(editorAddress as Address, true);
                  })
                }
                className="flex-1 px-4 py-2 border-2 border-phosphor-green text-phosphor-green text-xs font-bold uppercase tracking-wider hover:bg-phosphor-green/10 disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                [GRANT]
              </button>
              <button
                type="button"
                disabled={busy === "revoke"}
                onClick={() =>
                  run("revoke", async () => {
                    await admin.setNodeEditor(editorAddress as Address, false);
                    await encountersAdmin.setEncounterEditor(editorAddress as Address, false);
                  })
                }
                className="flex-1 px-4 py-2 border-2 border-warning-red text-warning-red text-xs font-bold uppercase tracking-wider hover:bg-warning-red/10 disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                [REVOKE]
              </button>
            </div>
          </div>

          <NodeContentPublishPanel graphType="ROGUELIKE" nodeIds={nodeIds} />
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-text-muted">{label}</label>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

function SaveButton({
  onClick,
  busy,
  label = "[SAVE]",
}: {
  onClick: () => void;
  busy: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="px-4 py-2 border-2 border-cyan text-cyan text-xs font-bold uppercase tracking-wider hover:bg-cyan/10 disabled:opacity-50"
      style={{ borderRadius: 0 }}
    >
      {busy ? "[SAVING...]" : label}
    </button>
  );
}
