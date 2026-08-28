"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi, Address } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { CampaignNode } from "../types/types";

// Single-player (NodeMap/SinglePlayerMatch/AIEncounters) is Base Sepolia
// only — always read from that chain regardless of the connected
// wallet/picker chain, same pattern as useSinglePlayerMatch.ts and
// useAIEncounterMaps.ts.
const CHAIN_ID = baseSepolia.id;
const NODE_MAP_ABI = CONTRACT_ABIS.NODE_MAP as Abi;
const NODE_MAP_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
  .NODE_MAP as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export function useNodeMapContract() {
  return {
    address: NODE_MAP_ADDRESS,
    abi: NODE_MAP_ABI,
    chainId: CHAIN_ID,
  };
}

/**
 * Whether a campaign requires a specific human fleet variant (0 =
 * unrestricted). The Shattered Hive campaign (campaignId = 1) now requires
 * variant 1 — `SinglePlayerMatch.startNodeMatch` reverts `WrongCampaignVariant`
 * otherwise. See docs/update/Frontend_Update_Guide_Campaigns_Maps.md §7.
 */
export function useCampaignRequiredVariant(campaignId: bigint | undefined) {
  const result = useReadContract({
    address: NODE_MAP_ADDRESS,
    abi: NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "campaignRequiredVariant",
    args: campaignId != null ? [campaignId] : undefined,
    query: { enabled: campaignId != null },
  });
  return { ...result, data: result.data as number | undefined };
}

/** Single node lookup — mission-result screen only needs this one, not the whole graph. */
export function useGetNode(nodeId: bigint | undefined) {
  const result = useReadContract({
    address: NODE_MAP_ADDRESS,
    abi: NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "getNode",
    args: nodeId != null ? [nodeId] : undefined,
    query: { enabled: nodeId != null },
  });
  return { ...result, data: result.data as CampaignNode | undefined };
}

export interface CampaignGraphNode extends CampaignNode {
  unlocked: boolean;
  completed: boolean;
}

/**
 * All nodes in one campaign: NodeMap.getNodesInCampaign(campaignId) for the
 * id list, then a batched getNode(id) per id (no getAllNodes-equivalent
 * convenience call exists for a single campaign — same two-stage shape as
 * useAllRoguelikeNodes in useRoguelikeNodeMap.ts). getAllNodes() itself was
 * removed on-chain (unscoped across every campaign, became uncallable past
 * ~1,600 total nodes) — see docs/update/Frontend_Updates_2026-08-27.md §2.
 */
export function useNodesInCampaign(campaignId: bigint | undefined) {
  const idsResult = useReadContract({
    address: NODE_MAP_ADDRESS,
    abi: NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "getNodesInCampaign",
    args: campaignId != null ? [campaignId] : undefined,
    query: { enabled: campaignId != null },
  });

  const nodeIds = useMemo(
    () => (idsResult.data as readonly bigint[] | undefined) ?? [],
    [idsResult.data],
  );

  const nodesResult = useReadContracts({
    contracts: nodeIds.map((id) => ({
      address: NODE_MAP_ADDRESS,
      abi: NODE_MAP_ABI,
      chainId: CHAIN_ID,
      functionName: "getNode" as const,
      args: [id] as const,
    })),
    query: { enabled: nodeIds.length > 0 },
  });

  const nodes = useMemo(
    () =>
      nodesResult.data
        ?.map((r) => r.result as CampaignNode | undefined)
        .filter((n): n is CampaignNode => n != null) ?? [],
    [nodesResult.data],
  );

  return {
    data: nodes,
    isLoading: idsResult.isLoading || nodesResult.isLoading,
    error: idsResult.error ?? nodesResult.error ?? null,
    refetch: () => {
      void idsResult.refetch();
      void nodesResult.refetch();
    },
  };
}

/**
 * Every node across every existing campaign — admin/export use only (the
 * "show everything, labeled by campaign" case: NodeMapAdminPanel.tsx,
 * AdminSettingsExport.tsx), not the player-facing single-active-campaign
 * graph. Reads campaignCount() then batches getNodesInCampaign(id) for ids
 * 1..count (campaigns are 1-indexed — verified live: campaignExists(0) is
 * false, campaignExists(1) is true), flattens, then batches getNode(id).
 */
export function useAllCampaignNodes() {
  const countResult = useReadContract({
    address: NODE_MAP_ADDRESS,
    abi: NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "campaignCount",
  });

  const campaignIds = useMemo(() => {
    const count = countResult.data != null ? Number(countResult.data as bigint) : 0;
    return Array.from({ length: count }, (_, i) => BigInt(i + 1));
  }, [countResult.data]);

  const idsPerCampaignResult = useReadContracts({
    contracts: campaignIds.map((id) => ({
      address: NODE_MAP_ADDRESS,
      abi: NODE_MAP_ABI,
      chainId: CHAIN_ID,
      functionName: "getNodesInCampaign" as const,
      args: [id] as const,
    })),
    query: { enabled: campaignIds.length > 0 },
  });

  const nodeIds = useMemo(() => {
    const ids: bigint[] = [];
    idsPerCampaignResult.data?.forEach((r) => {
      (r.result as readonly bigint[] | undefined)?.forEach((id) => ids.push(id));
    });
    return ids;
  }, [idsPerCampaignResult.data]);

  const nodesResult = useReadContracts({
    contracts: nodeIds.map((id) => ({
      address: NODE_MAP_ADDRESS,
      abi: NODE_MAP_ABI,
      chainId: CHAIN_ID,
      functionName: "getNode" as const,
      args: [id] as const,
    })),
    query: { enabled: nodeIds.length > 0 },
  });

  const nodes = useMemo(
    () =>
      nodesResult.data
        ?.map((r) => r.result as CampaignNode | undefined)
        .filter((n): n is CampaignNode => n != null) ?? [],
    [nodesResult.data],
  );

  return {
    data: nodes,
    isLoading: countResult.isLoading || idsPerCampaignResult.isLoading || nodesResult.isLoading,
    error: countResult.error ?? idsPerCampaignResult.error ?? nodesResult.error ?? null,
    refetch: () => {
      void countResult.refetch();
      void idsPerCampaignResult.refetch();
      void nodesResult.refetch();
    },
  };
}

/**
 * The campaign graph: useNodesInCampaign(campaignId) plus per-player
 * unlocked/completed state for each node. Unlock is ANY-of over
 * `prerequisites`, enforced on-chain by isNodeUnlocked — this hook just
 * surfaces the result, it doesn't recompute the graph logic itself.
 *
 * When playerAddress is undefined (wallet not connected), still returns the
 * full node list with unlocked/completed both false — the graph is
 * browsable without a wallet; gate the "enter node" action on connection,
 * not the graph render.
 */
export function useCampaignGraph(playerAddress: Address | undefined, campaignId: bigint) {
  const rawNodesResult = useNodesInCampaign(campaignId);
  const rawNodes = rawNodesResult.data;
  const nodeIds = useMemo(() => rawNodes.map((n) => n.id), [rawNodes]);
  const player = playerAddress ?? ZERO_ADDRESS;

  const unlockedReads = useReadContracts({
    contracts: nodeIds.map((id) => ({
      address: NODE_MAP_ADDRESS,
      abi: NODE_MAP_ABI,
      chainId: CHAIN_ID,
      functionName: "isNodeUnlocked" as const,
      args: [player, id] as const,
    })),
    query: { enabled: nodeIds.length > 0 && !!playerAddress },
  });

  const completedReads = useReadContracts({
    contracts: nodeIds.map((id) => ({
      address: NODE_MAP_ADDRESS,
      abi: NODE_MAP_ABI,
      chainId: CHAIN_ID,
      functionName: "isNodeCompleted" as const,
      args: [player, id] as const,
    })),
    query: { enabled: nodeIds.length > 0 && !!playerAddress },
  });

  const nodes = useMemo((): CampaignGraphNode[] => {
    return rawNodes.map((node, i) => ({
      ...node,
      unlocked: (unlockedReads.data?.[i]?.result as boolean | undefined) ?? false,
      completed: (completedReads.data?.[i]?.result as boolean | undefined) ?? false,
    }));
  }, [rawNodes, unlockedReads.data, completedReads.data]);

  return {
    nodes,
    isLoading:
      rawNodesResult.isLoading ||
      (!!playerAddress && (unlockedReads.isLoading || completedReads.isLoading)),
    error: rawNodesResult.error ?? unlockedReads.error ?? completedReads.error ?? null,
    refetch: () => {
      rawNodesResult.refetch();
      void unlockedReads.refetch();
      void completedReads.refetch();
    },
  };
}
