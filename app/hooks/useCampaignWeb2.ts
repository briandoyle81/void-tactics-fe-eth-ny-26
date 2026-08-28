"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";

// Web2-mode counterpart to useNodeMap.ts's useCampaignGraph — fetches the
// Prisma-backed campaign graph via /api/campaign/nodes instead of an
// on-chain read. Node ids are plain numbers (DB-native), not bigint.

export interface CampaignWeb2Node {
  id: number;
  campaignId: number;
  mapId: number;
  prerequisites: number[];
  costLimit: number;
  turnTimeSeconds: number;
  maxScore: number;
  creatorGoesFirst: boolean;
  unlocked: boolean;
  completed: boolean;
}

export interface CampaignWeb2 {
  id: number;
  requiredVariant: number;
}

export function useCampaignGraphWeb2(campaignId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["campaign", "nodes", "web2", campaignId],
    queryFn: () =>
      apiFetch<{ campaign: CampaignWeb2; nodes: CampaignWeb2Node[] }>(
        `/api/campaign/nodes?campaignId=${campaignId}`,
      ),
  });

  return {
    campaign: data?.campaign,
    nodes: data?.nodes ?? [],
    isLoading,
    error: error instanceof Error ? error : null,
    refetch,
  };
}

export function useStartCampaignNodeWeb2() {
  const queryClient = useQueryClient();

  const startNode = async (
    nodeId: number,
    shipIds: number[],
    startingPositions: Array<{ row: number; col: number }>,
  ) => {
    const result = await apiMutate<{ lobbyId: number; gameId: number }>(
      `/api/campaign/nodes/${nodeId}/start`,
      "POST",
      { shipIds, startingPositions },
    );
    await queryClient.invalidateQueries({ queryKey: ["campaign", "nodes", "web2"] });
    return result;
  };

  return { startNode };
}
