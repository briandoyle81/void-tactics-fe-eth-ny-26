"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { RoguelikeNode } from "../types/roguelike";
import { useAllNodeContent, mergeNodeContent, type NodeContentValue } from "./useNodeContent";

// Roguelike is Base Sepolia only, same as the original single-player stack
// (AIEncounters/NodeMap/SinglePlayerMatch) — pin to that chain directly
// rather than following the connected wallet/picker chain.
const CHAIN_ID = baseSepolia.id;
const ROGUELIKE_NODE_MAP_ABI = CONTRACT_ABIS.ROGUELIKE_NODE_MAP as Abi;
export const ROGUELIKE_NODE_MAP_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[
  CHAIN_ID
].ROGUELIKE_NODE_MAP as `0x${string}`;

export function useRoguelikeNodeMapContract() {
  return {
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
  };
}

/** `getNode` already embeds `children` (RoguelikeEdge[]) — no separate `getChildren` call needed for the common case. */
export function useGetRoguelikeNode(nodeId: bigint | undefined) {
  const result = useReadContract({
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "getNode",
    args: nodeId != null ? [nodeId] : undefined,
    query: { enabled: nodeId != null },
  });
  return { ...result, data: result.data as RoguelikeNode | undefined };
}

export function useCampaignAutoHealPercent(campaignId: bigint | undefined) {
  const result = useReadContract({
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "campaignAutoHealPercent",
    args: campaignId != null ? [campaignId] : undefined,
    query: { enabled: campaignId != null },
  });
  return { ...result, data: result.data as number | undefined };
}

/** 0 = unrestricted. Distinct contract from the original campaign's `NodeMap.campaignRequiredVariant` — don't conflate the two. */
export function useRoguelikeCampaignRequiredVariant(campaignId: bigint | undefined) {
  const result = useReadContract({
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "campaignRequiredVariant",
    args: campaignId != null ? [campaignId] : undefined,
    query: { enabled: campaignId != null },
  });
  return { ...result, data: result.data as number | undefined };
}

export function useRoguelikeCampaignRootNode(campaignId: bigint | undefined) {
  const result = useReadContract({
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "campaignRootNode",
    args: campaignId != null ? [campaignId] : undefined,
    query: { enabled: campaignId != null },
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function useRoguelikeCampaignInitialCostCap(campaignId: bigint | undefined) {
  const result = useReadContract({
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "campaignInitialCostCap",
    args: campaignId != null ? [campaignId] : undefined,
    query: { enabled: campaignId != null },
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function useRoguelikeCampaignCount() {
  const result = useReadContract({
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "campaignCount",
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function useIsRoguelikeNodeEditor(address: `0x${string}` | undefined) {
  const result = useReadContract({
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "isNodeEditor",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  return { ...result, data: result.data as boolean | undefined };
}

export function useRoguelikeNodeCount() {
  const result = useReadContract({
    address: ROGUELIKE_NODE_MAP_ADDRESS,
    abi: ROGUELIKE_NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "nodeCount",
  });
  return { ...result, data: result.data as bigint | undefined };
}

// RoguelikeNodeMap has no getAllNodes/getNodesInCampaign convenience call
// (unlike the original NodeMap). Node ids are sequential starting at 1
// (same convention as the original NodeMap), so this batches
// getNode(1..nodeCount()) in one multicall. Used both by admin tooling and
// by RoguelikeGraph.tsx to render the full campaign map (same "load
// everything, filter client-side" approach CampaignGraph.tsx's
// useCampaignGraph takes) — fine at these node-map-scale counts (tens of
// nodes), not something to reach for at arbitrary scale.
export function useAllRoguelikeNodes() {
  const { data: nodeCount } = useRoguelikeNodeCount();
  const ids = useMemo(() => {
    const count = nodeCount != null ? Number(nodeCount) : 0;
    return Array.from({ length: count }, (_, i) => BigInt(i + 1));
  }, [nodeCount]);

  const result = useReadContracts({
    contracts: ids.map((id) => ({
      address: ROGUELIKE_NODE_MAP_ADDRESS,
      abi: ROGUELIKE_NODE_MAP_ABI,
      chainId: CHAIN_ID,
      functionName: "getNode" as const,
      args: [id] as const,
    })),
    query: { enabled: ids.length > 0 },
  });

  const nodes: RoguelikeNode[] = ids
    .map((id, i) => result.data?.[i]?.result as RoguelikeNode | undefined)
    .filter((n): n is RoguelikeNode => !!n && n.exists);

  return { ...result, nodes };
}

export type RoguelikeNodeWithContent = RoguelikeNode & NodeContentValue;

/**
 * The full roguelike graph for one campaign, content included:
 * useAllRoguelikeNodes (filtered to campaignId, same as RoguelikeGraph.tsx
 * does today) merged with the three-layer title/description resolution from
 * useNodeContent.ts — the roguelike counterpart to
 * useCampaignGraphWithContent in useNodeMap.ts.
 */
export function useRoguelikeGraphWithContent(campaignId: bigint) {
  const { nodes: allNodes, ...rest } = useAllRoguelikeNodes();
  const { contentById } = useAllNodeContent("ROGUELIKE");

  const campaignNodes = useMemo(
    () => allNodes.filter((n) => n.campaignId === campaignId),
    [allNodes, campaignId],
  );

  const nodes = useMemo(
    () => mergeNodeContent("ROGUELIKE", campaignNodes, contentById),
    [campaignNodes, contentById],
  );

  return { ...rest, nodes };
}
