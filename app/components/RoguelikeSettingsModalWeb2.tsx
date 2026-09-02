"use client";

import React from "react";
import { toast } from "react-hot-toast";
import type { RoguelikeCampaignWeb2 } from "../hooks/useRoguelikeWeb2";
import { useRoguelikeAdminWeb2 } from "../hooks/useRoguelikeAdminWeb2";
import { NodeContentPublishPanel } from "./NodeContentPublishPanel";

interface RoguelikeSettingsModalWeb2Props {
  campaign: RoguelikeCampaignWeb2;
  /** Every node id in this campaign — passed straight through to
   * NodeContentPublishPanel, see its prop doc for why. */
  nodeIds: number[];
  onClose: () => void;
  onSaved: () => void;
}

// Web2 counterpart to RoguelikeSettingsModal.tsx — root node/auto-heal/
// variant/cost-cap (one full-replace PUT, matching the API route) and
// repair-cost-per-HP. No editor-permission section (flat web2 admin
// allowlist) and no withdraw (no accumulated on-chain fees to sweep in
// web2 mode — repair charges are deducted directly against player UTC
// balances, not escrowed).
export function RoguelikeSettingsModalWeb2({
  campaign,
  nodeIds,
  onClose,
  onSaved,
}: RoguelikeSettingsModalWeb2Props) {
  const admin = useRoguelikeAdminWeb2();

  const [rootNodeId, setRootNodeId] = React.useState(campaign.rootNodeId?.toString() ?? "");
  const [autoHealPercent, setAutoHealPercent] = React.useState(campaign.autoHealPercent);
  const [variant, setVariant] = React.useState(campaign.requiredVariant);
  const [initialCostCap, setInitialCostCap] = React.useState(campaign.initialCostCap.toString());
  const [repairCostPerHp, setRepairCostPerHp] = React.useState("0");
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    void admin.getRepairCostPerHp().then((s) => setRepairCostPerHp(s.repairCostPerHp.toString()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCampaignFields = async (label: string, overrides: Partial<RoguelikeCampaignWeb2>) => {
    setBusy(label);
    try {
      await admin.updateCampaign({ ...campaign, ...overrides });
      onSaved();
      toast.success(`${label} saved.`);
    } catch (error) {
      console.error(`Failed to save ${label}:`, error);
      toast.error(error instanceof Error ? error.message : `Failed to save ${label}`);
    } finally {
      setBusy(null);
    }
  };

  const handleSaveRepairCost = async () => {
    setBusy("repairCost");
    try {
      await admin.setRepairCostPerHp(Math.max(0, Number(repairCostPerHp) || 0));
      toast.success("Repair cost saved.");
    } catch (error) {
      console.error("Failed to save repair cost:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save repair cost");
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
                void saveCampaignFields("root", { rootNodeId: Number(rootNodeId) || null })
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
              onClick={() => void saveCampaignFields("autoHeal", { autoHealPercent })}
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
              onClick={() => void saveCampaignFields("variant", { requiredVariant: variant })}
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
                void saveCampaignFields("costCap", { initialCostCap: Number(initialCostCap) || 0 })
              }
            />
          </SettingRow>

          <SettingRow label="Repair cost per HP">
            <input
              type="number"
              value={repairCostPerHp}
              onChange={(e) => setRepairCostPerHp(e.target.value)}
              className="flex-1 px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
              style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
            />
            <SaveButton busy={busy === "repairCost"} onClick={() => void handleSaveRepairCost()} />
          </SettingRow>

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

function SaveButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="px-4 py-2 border-2 border-cyan text-cyan text-xs font-bold uppercase tracking-wider hover:bg-cyan/10 disabled:opacity-50"
      style={{ borderRadius: 0 }}
    >
      {busy ? "[SAVING...]" : "[SAVE]"}
    </button>
  );
}
