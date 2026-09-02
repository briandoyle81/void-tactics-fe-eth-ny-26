"use client";

import React from "react";
import { toast } from "react-hot-toast";
import type { Address } from "viem";
import { useCampaignRequiredVariant } from "../hooks/useNodeMap";
import { useNodeMapAdmin } from "../hooks/useNodeMapAdmin";
import { useAIEncountersAdmin } from "../hooks/useAIEncountersAdmin";
import { NodeContentPublishPanel } from "./NodeContentPublishPanel";

const DEFAULT_CAMPAIGN_ID = 1n;

interface CampaignSettingsModalProps {
  /** Every node id in this campaign — passed straight through to
   * NodeContentPublishPanel, see its prop doc for why. */
  nodeIds: number[];
  onClose: () => void;
}

// Replaces the campaign-settings portions of NodeMapAdminPanel.tsx (which
// this modal, along with CampaignNodeEditPanel.tsx, fully replaces) —
// required-variant, campaign creation, and editor-permission grants. Grant
// Editor Access deliberately calls NodeMap.setNodeEditor AND AIEncounters.
// setEncounterEditor together in one submit ("merge the permissions") so a
// newly-granted admin never ends up able to edit node fields/edges but not
// enemy fleets — see the map editor plan's decision log.
export function CampaignSettingsModal({ nodeIds, onClose }: CampaignSettingsModalProps) {
  const admin = useNodeMapAdmin();
  const encountersAdmin = useAIEncountersAdmin();
  const { data: currentVariant, refetch: refetchVariant } = useCampaignRequiredVariant(
    DEFAULT_CAMPAIGN_ID,
  );

  const [variant, setVariant] = React.useState(0);
  const [isSavingVariant, setIsSavingVariant] = React.useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = React.useState(false);
  const [editorAddress, setEditorAddress] = React.useState("");
  const [isGranting, setIsGranting] = React.useState(false);

  React.useEffect(() => {
    if (currentVariant != null) setVariant(currentVariant);
  }, [currentVariant]);

  const handleSaveVariant = async () => {
    setIsSavingVariant(true);
    try {
      const hash = await admin.setCampaignRequiredVariant(DEFAULT_CAMPAIGN_ID, variant);
      await refetchVariant();
      toast.success(`Required variant updated. (tx: ${hash.slice(0, 10)}…)`);
    } catch (error) {
      console.error("Failed to set required variant:", error);
      toast.error(error instanceof Error ? error.message : "Failed to set required variant");
    } finally {
      setIsSavingVariant(false);
    }
  };

  const handleCreateCampaign = async () => {
    setIsCreatingCampaign(true);
    try {
      const hash = await admin.createCampaign();
      toast.success(`Campaign created. (tx: ${hash.slice(0, 10)}…)`);
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleGrantEditor = async (allowed: boolean) => {
    if (!editorAddress.startsWith("0x") || editorAddress.length !== 42) {
      toast.error("Enter a valid 0x address.");
      return;
    }
    setIsGranting(true);
    try {
      await admin.setNodeEditor(editorAddress as Address, allowed);
      await encountersAdmin.setEncounterEditor(editorAddress as Address, allowed);
      toast.success(
        allowed
          ? "Granted node-editor + enemy-fleet-editor access."
          : "Revoked node-editor + enemy-fleet-editor access.",
      );
    } catch (error) {
      console.error("Failed to update editor permissions:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update editor permissions");
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[500] p-4">
      <div
        className="bg-near-black border-2 p-6 max-w-lg w-full rounded-none font-mono"
        style={{ borderColor: "var(--color-amber)" }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-amber tracking-wider">[CAMPAIGN SETTINGS]</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-amber hover:text-amber/80 text-2xl font-bold leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-muted">Required fleet variant (0 = unrestricted)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                value={variant}
                onChange={(e) => setVariant(Math.max(0, Number(e.target.value) || 0))}
                className="flex-1 px-3 py-2 bg-near-black border text-cyan focus:outline-none focus:ring-2 focus:ring-cyan"
                style={{ borderRadius: 0, borderColor: "var(--color-cyan)" }}
              />
              <button
                type="button"
                disabled={isSavingVariant}
                onClick={() => void handleSaveVariant()}
                className="px-4 py-2 border-2 border-cyan text-cyan text-xs font-bold uppercase tracking-wider hover:bg-cyan/10 disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                {isSavingVariant ? "[SAVING...]" : "[SAVE]"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-muted">New campaign</label>
            <button
              type="button"
              disabled={isCreatingCampaign}
              onClick={() => void handleCreateCampaign()}
              className="self-start px-4 py-2 border-2 border-cyan text-cyan text-xs font-bold uppercase tracking-wider hover:bg-cyan/10 disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {isCreatingCampaign ? "[CREATING...]" : "[CREATE CAMPAIGN]"}
            </button>
          </div>

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
                disabled={isGranting}
                onClick={() => void handleGrantEditor(true)}
                className="flex-1 px-4 py-2 border-2 border-phosphor-green text-phosphor-green text-xs font-bold uppercase tracking-wider hover:bg-phosphor-green/10 disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                {isGranting ? "[WORKING...]" : "[GRANT]"}
              </button>
              <button
                type="button"
                disabled={isGranting}
                onClick={() => void handleGrantEditor(false)}
                className="flex-1 px-4 py-2 border-2 border-warning-red text-warning-red text-xs font-bold uppercase tracking-wider hover:bg-warning-red/10 disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                {isGranting ? "[WORKING...]" : "[REVOKE]"}
              </button>
            </div>
          </div>

          <NodeContentPublishPanel graphType="CAMPAIGN" nodeIds={nodeIds} />
        </div>
      </div>
    </div>
  );
}
