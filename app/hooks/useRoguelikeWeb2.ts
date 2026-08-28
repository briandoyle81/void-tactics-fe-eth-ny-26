"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import type { Web2Ship } from "../types/web2Ship";

// Web2-mode counterpart to useRoguelikeRun.ts/useRoguelikeMatch.ts —
// Prisma-backed run/roster reads and mutations instead of on-chain
// RoguelikeRun/RoguelikeMatch reads/writes. Node/run/ship ids are plain
// numbers (DB-native), not bigint.

export interface RoguelikeRosterEntryWeb2 {
  id: number;
  shipId: number;
  hp: number; // 0 = undamaged/full, matches the on-chain getShipHP convention
  ship: Web2Ship;
}

export interface RoguelikeCampaignWeb2 {
  id: number;
  requiredVariant: number;
  autoHealPercent: number;
  initialCostCap: number;
  rootNodeId: number | null;
}

export interface RoguelikeRunWeb2 {
  id: number;
  userId: string;
  generation: number;
  status: "ACTIVE" | "WON" | "ENDED";
  campaignId: number;
  currentNodeId: number;
  currentCostCap: number;
  activeLobbyId: number | null;
  campaign: RoguelikeCampaignWeb2;
  roster: RoguelikeRosterEntryWeb2[];
  defeatedNodeIds: number[];
}

const RUN_QUERY_KEY = ["roguelike", "run", "web2"];

export function useRoguelikeRunWeb2() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: RUN_QUERY_KEY,
    queryFn: () => apiFetch<{ run: RoguelikeRunWeb2 | null }>("/api/roguelike/run"),
  });

  return {
    run: data?.run ?? null,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

export function useRoguelikeCampaignWeb2(campaignId: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["roguelike", "campaign", "web2", campaignId],
    queryFn: () => apiFetch<RoguelikeCampaignWeb2>(`/api/roguelike/campaigns/${campaignId}`),
  });
  return { campaign: data, isLoading, error: error instanceof Error ? error : null };
}

export interface RoguelikeNodeWeb2 {
  id: number;
  campaignId: number;
  kind: number; // 0=Combat, 1=Resupply
  mapId: number | null;
  turnTimeSeconds: number | null;
  maxScore: number | null;
  creatorGoesFirst: boolean | null;
  costCapOverride: number | null;
  childEdges: Array<{ id: number; parentId: number; childId: number; twoWay: boolean }>;
}

export function useRoguelikeNodeWeb2(nodeId: number | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["roguelike", "node", "web2", nodeId],
    queryFn: () => apiFetch<RoguelikeNodeWeb2>(`/api/roguelike/nodes/${nodeId}`),
    enabled: nodeId != null,
  });
  return { node: data, isLoading, error: error instanceof Error ? error : null };
}

export function useRoguelikeMatchWeb2() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: RUN_QUERY_KEY });

  const startRun = async (campaignId: number, shipIds: number[]) => {
    const result = await apiMutate<{ run: RoguelikeRunWeb2 }>("/api/roguelike/run/start", "POST", {
      campaignId,
      shipIds,
    });
    await invalidate();
    return result.run;
  };

  const enterCombatNode = async (
    nodeId: number,
    startingPositions: Array<{ row: number; col: number }>,
  ) => {
    const result = await apiMutate<{ lobbyId: number; gameId: number }>(
      `/api/roguelike/run/nodes/${nodeId}/enter-combat`,
      "POST",
      { startingPositions },
    );
    await invalidate();
    return result;
  };

  const enterResupplyNode = async (nodeId: number) => {
    const result = await apiMutate<{ run: RoguelikeRunWeb2 }>(
      `/api/roguelike/run/nodes/${nodeId}/enter-resupply`,
      "POST",
    );
    await invalidate();
    return result.run;
  };

  const retreatRun = async () => {
    await apiMutate("/api/roguelike/run/retreat", "POST");
    await invalidate();
  };

  return { startRun, enterCombatNode, enterResupplyNode, retreatRun };
}
