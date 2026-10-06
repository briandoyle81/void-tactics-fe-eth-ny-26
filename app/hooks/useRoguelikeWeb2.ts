"use client";

import { useMemo } from "react";
import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import type { Web2Ship } from "../types/web2Ship";
import { useNodeContentWeb2, mergeNodeContent, type ResolvedNodeContent } from "./useNodeContent";

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

// Same key as useOwnedShipsWeb2's query.
const OWNED_SHIPS_QUERY_KEY = ["ships", "owned", "web2"];

/**
 * Web2 counterpart to resetRoguelikeRunQueries: drops the cached run and
 * refreshes owned ships so the released roster no longer shows in a fleet.
 */
export function resetRoguelikeRunQueriesWeb2(queryClient: QueryClient): void {
  queryClient.removeQueries({ queryKey: RUN_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: OWNED_SHIPS_QUERY_KEY });
}

export function useRoguelikeRunWeb2(enabled = true) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: RUN_QUERY_KEY,
    queryFn: () => apiFetch<{ run: RoguelikeRunWeb2 | null }>("/api/roguelike/run"),
    enabled,
  });

  return {
    run: data?.run ?? null,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

export function useRoguelikeCampaignWeb2(campaignId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["roguelike", "campaign", "web2", campaignId],
    queryFn: () => apiFetch<RoguelikeCampaignWeb2>(`/api/roguelike/campaigns/${campaignId}`),
  });
  return { campaign: data, isLoading, error: error instanceof Error ? error : null, refetch };
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
  winEffects: string[];
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

/** Every node in a campaign, in one call — web2 counterpart to web3's useAllRoguelikeNodes. Powers RoguelikeGraphWeb2's full-map view. */
export function useRoguelikeCampaignNodesWeb2(campaignId: number | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["roguelike", "campaign-nodes", "web2", campaignId],
    queryFn: () => apiFetch<RoguelikeNodeWeb2[]>(`/api/roguelike/campaigns/${campaignId}/nodes`),
    enabled: campaignId != null,
  });
  return { nodes: data ?? [], isLoading, error: error instanceof Error ? error : null, refetch };
}

export type RoguelikeNodeWeb2WithContent = RoguelikeNodeWeb2 & ResolvedNodeContent;

/** Web2 counterpart to useRoguelikeNodeMap.ts's useRoguelikeGraphWithContent — same structure+content merge, Prisma-backed instead of on-chain. */
export function useRoguelikeCampaignNodesWeb2WithContent(campaignId: number | undefined) {
  const graph = useRoguelikeCampaignNodesWeb2(campaignId);
  const { contentById, isLoading: contentLoading } = useNodeContentWeb2("ROGUELIKE");

  const nodes = useMemo(
    () => mergeNodeContent(graph.nodes, contentById, contentLoading),
    [graph.nodes, contentById, contentLoading],
  );

  return { ...graph, nodes };
}

export function useRoguelikeMatchWeb2() {
  const queryClient = useQueryClient();
  // Run changes reserve/release roster ships (inFleet), so refresh the owned
  // ship list alongside the run — mirrors useRoguelikeMatch.ts.
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: RUN_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: OWNED_SHIPS_QUERY_KEY }),
    ]);

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
