"use client";

import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";

// Web2 counterpart to useNodeMapAdmin.ts — Prisma-backed writes against
// /api/admin/campaign/* instead of NodeMap contract calls. campaignId/nodeId
// are plain numbers (web2-native), matching CampaignNodeWeb2 in
// NodeMapAdminPanelWeb2.tsx (which this hook is extracted alongside/instead
// of, per the campaign-map-editor plan).

export interface CampaignWeb2 {
  id: number;
  requiredVariant: number;
}

export interface CampaignNodeWeb2 {
  id: number;
  campaignId: number;
  mapId: number;
  prerequisites: number[];
  costLimit: number;
  turnTimeSeconds: number;
  maxScore: number;
  creatorGoesFirst: boolean;
}

export function useCampaignAdminWeb2() {
  const getCampaigns = () => apiFetch<CampaignWeb2[]>("/api/admin/campaign/campaigns");

  const getNodes = (campaignId?: number) =>
    apiFetch<CampaignNodeWeb2[]>(
      campaignId != null
        ? `/api/admin/campaign/nodes?campaignId=${campaignId}`
        : "/api/admin/campaign/nodes",
    );

  const createCampaign = (requiredVariant: number) =>
    apiMutate<CampaignWeb2>("/api/admin/campaign/campaigns", "POST", { requiredVariant });

  const setCampaignRequiredVariant = (campaignId: number, requiredVariant: number) =>
    apiMutate<CampaignWeb2>(`/api/admin/campaign/campaigns/${campaignId}`, "PUT", {
      requiredVariant,
    });

  const createNode = (node: Omit<CampaignNodeWeb2, "id">) =>
    apiMutate<CampaignNodeWeb2>("/api/admin/campaign/nodes", "POST", node);

  const updateNode = (node: CampaignNodeWeb2) =>
    apiMutate<CampaignNodeWeb2>(`/api/admin/campaign/nodes/${node.id}`, "PUT", node);

  // Incremental edge edits, read-modify-write over the full-replace PUT —
  // caller passes the node's current full row (already loaded by the edit
  // panel) rather than this hook re-fetching it, since there's no dedicated
  // prerequisites-only endpoint (matches the web3 side's addPrerequisite/
  // removePrerequisite being the preferred path over a full updateNode).
  const addPrerequisite = (node: CampaignNodeWeb2, prerequisiteId: number) => {
    if (node.prerequisites.includes(prerequisiteId)) return Promise.resolve(node);
    return updateNode({ ...node, prerequisites: [...node.prerequisites, prerequisiteId] });
  };

  const removePrerequisite = (node: CampaignNodeWeb2, prerequisiteId: number) =>
    updateNode({
      ...node,
      prerequisites: node.prerequisites.filter((id) => id !== prerequisiteId),
    });

  return {
    getCampaigns,
    getNodes,
    createCampaign,
    setCampaignRequiredVariant,
    createNode,
    updateNode,
    addPrerequisite,
    removePrerequisite,
  };
}
