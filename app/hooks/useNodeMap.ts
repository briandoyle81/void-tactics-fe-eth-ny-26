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
 * The campaign graph: NodeMap.getAllNodes() plus per-player unlocked/
 * completed state for each node. Unlock is ANY-of over `prerequisites`,
 * enforced on-chain by isNodeUnlocked — this hook just surfaces the result,
 * it doesn't recompute the graph logic itself.
 *
 * When playerAddress is undefined (wallet not connected), still returns the
 * full node list with unlocked/completed both false — the graph is
 * browsable without a wallet; gate the "enter node" action on connection,
 * not the graph render.
 */
export function useCampaignGraph(playerAddress?: Address) {
  const allNodes = useReadContract({
    address: NODE_MAP_ADDRESS,
    abi: NODE_MAP_ABI,
    chainId: CHAIN_ID,
    functionName: "getAllNodes",
  });

  const rawNodes = useMemo(
    () => (allNodes.data as readonly CampaignNode[] | undefined) ?? [],
    [allNodes.data],
  );
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
      allNodes.isLoading ||
      (!!playerAddress && (unlockedReads.isLoading || completedReads.isLoading)),
    error: allNodes.error ?? unlockedReads.error ?? completedReads.error ?? null,
    refetch: () => {
      void allNodes.refetch();
      void unlockedReads.refetch();
      void completedReads.refetch();
    },
  };
}
