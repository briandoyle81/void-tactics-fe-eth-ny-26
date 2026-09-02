"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useCampaignAdminWeb2, type CampaignWeb2 } from "../hooks/useCampaignAdminWeb2";
import { NodeContentPublishPanel } from "./NodeContentPublishPanel";

const DEFAULT_CAMPAIGN_ID = 1;

interface CampaignSettingsModalWeb2Props {
  campaign: CampaignWeb2 | undefined;
  /** Every node id in this campaign — passed straight through to
   * NodeContentPublishPanel, see its prop doc for why. */
  nodeIds: number[];
  onClose: () => void;
  onSaved: () => void;
}

// Web2 counterpart to CampaignSettingsModal.tsx — required-variant and
// campaign creation only. No "Editor Permissions" section: web2 has a
// single flat admin allowlist (WEB2_ADMIN_EMAILS), not a per-address,
// per-contract role system, so there's nothing to grant/merge here (see
// the map editor plan's decision log on "merge the permissions").
export function CampaignSettingsModalWeb2({
  campaign,
  nodeIds,
  onClose,
  onSaved,
}: CampaignSettingsModalWeb2Props) {
  const admin = useCampaignAdminWeb2();
  const [variant, setVariant] = React.useState(campaign?.requiredVariant ?? 0);
  const [isSavingVariant, setIsSavingVariant] = React.useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = React.useState(false);

  React.useEffect(() => {
    if (campaign) setVariant(campaign.requiredVariant);
  }, [campaign]);

  const handleSaveVariant = async () => {
    setIsSavingVariant(true);
    try {
      await admin.setCampaignRequiredVariant(DEFAULT_CAMPAIGN_ID, variant);
      onSaved();
      toast.success("Required variant updated.");
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
      const created = await admin.createCampaign(0);
      onSaved();
      toast.success(`Campaign #${created.id} created.`);
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setIsCreatingCampaign(false);
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

          <NodeContentPublishPanel graphType="CAMPAIGN" nodeIds={nodeIds} />
        </div>
      </div>
    </div>
  );
}
