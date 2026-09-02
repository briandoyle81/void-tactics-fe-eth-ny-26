"use client";

import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import type { RoguelikeCampaignWeb2, RoguelikeNodeWeb2 } from "./useRoguelikeWeb2";

// Web2 counterpart to useRoguelikeNodeMapAdmin.ts — Prisma-backed writes
// against /api/admin/roguelike/* instead of RoguelikeNodeMap/RoguelikeResupply
// contract calls. campaignId/nodeId are plain numbers.

export interface RoguelikeNodeWeb2Input {
  campaignId: number;
  kind: number;
  mapId: number | null;
  turnTimeSeconds: number | null;
  maxScore: number | null;
  creatorGoesFirst: boolean | null;
  costCapOverride: number | null;
}

export function useRoguelikeAdminWeb2() {
  const createCampaign = (requiredVariant: number, autoHealPercent: number, initialCostCap: number) =>
    apiMutate<RoguelikeCampaignWeb2>("/api/admin/roguelike/campaigns", "POST", {
      requiredVariant,
      autoHealPercent,
      initialCostCap,
    });

  // Full-replace, matches the API route's shape — callers must send every
  // field each time (same as RoguelikeNodeMap.updateNode's own full-replace
  // semantics for a node, just at the campaign-settings level here).
  const updateCampaign = (campaign: RoguelikeCampaignWeb2) =>
    apiMutate<RoguelikeCampaignWeb2>(`/api/admin/roguelike/campaigns/${campaign.id}`, "PUT", {
      requiredVariant: campaign.requiredVariant,
      autoHealPercent: campaign.autoHealPercent,
      initialCostCap: campaign.initialCostCap,
      rootNodeId: campaign.rootNodeId,
    });

  const createNode = (node: RoguelikeNodeWeb2Input) =>
    apiMutate<RoguelikeNodeWeb2>("/api/admin/roguelike/nodes", "POST", node);

  const updateNode = (nodeId: number, node: RoguelikeNodeWeb2Input) =>
    apiMutate<RoguelikeNodeWeb2>(`/api/admin/roguelike/nodes/${nodeId}`, "PUT", node);

  const addChild = (parentId: number, childId: number, twoWay: boolean) =>
    apiMutate(`/api/admin/roguelike/edges`, "POST", { parentId, childId, twoWay });

  const removeChild = (parentId: number, childId: number) =>
    apiMutate(`/api/admin/roguelike/edges`, "DELETE", { parentId, childId });

  const getRepairCostPerHp = () =>
    apiFetch<{ repairCostPerHp: number }>("/api/admin/roguelike-settings");

  const setRepairCostPerHp = (repairCostPerHp: number) =>
    apiMutate("/api/admin/roguelike-settings", "PUT", { repairCostPerHp });

  return {
    createCampaign,
    updateCampaign,
    createNode,
    updateNode,
    addChild,
    removeChild,
    getRepairCostPerHp,
    setRepairCostPerHp,
  };
}
