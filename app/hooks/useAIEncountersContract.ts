"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { AIShipConfig } from "../types/types";
import { aiConfigToPreviewShip } from "../utils/aiShipConfig";

const CHAIN_ID = baseSepolia.id;
const AI_ENCOUNTERS_ABI = CONTRACT_ABIS.AI_ENCOUNTERS as Abi;
const AI_ENCOUNTERS_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
  .AI_ENCOUNTERS as `0x${string}`;

export function useAIEncountersContract() {
  return {
    address: AI_ENCOUNTERS_ADDRESS,
    abi: AI_ENCOUNTERS_ABI,
    chainId: CHAIN_ID,
  };
}

export function useGetAllAIShipConfigs() {
  const result = useReadContract({
    address: AI_ENCOUNTERS_ADDRESS,
    abi: AI_ENCOUNTERS_ABI,
    chainId: CHAIN_ID,
    functionName: "getAllAIShipConfigs",
  });
  return { ...result, data: result.data as AIShipConfig[] | undefined };
}

// Was a hardcoded `constant` (MAX_PLACEMENTS_PER_MAP); now a plain owner-
// tunable uint (`maxPlacementsPerMap`) — read live, don't assume 8.
export function useMaxPlacementsPerMap() {
  const result = useReadContract({
    address: AI_ENCOUNTERS_ADDRESS,
    abi: AI_ENCOUNTERS_ABI,
    chainId: CHAIN_ID,
    functionName: "maxPlacementsPerMap",
  });
  return { ...result, data: result.data as bigint | undefined };
}

export function useGetMapPlacements(mapId: bigint | undefined) {
  const result = useReadContract({
    address: AI_ENCOUNTERS_ADDRESS,
    abi: AI_ENCOUNTERS_ABI,
    chainId: CHAIN_ID,
    functionName: "getMapPlacements",
    args: mapId != null ? [mapId] : undefined,
    query: { enabled: mapId != null },
  });
  const raw = result.data as
    | readonly [readonly { row: number; col: number }[], readonly bigint[]]
    | undefined;
  return {
    ...result,
    data: raw ? { positions: raw[0], configIds: raw[1] } : undefined,
  };
}

/**
 * Total "enemy threat" for a campaign/roguelike node's map — derived as the
 * sum of each placed AI ship's cost (aiConfigToPreviewShip, the same
 * formula real player ships use), not a stored contract field. NodeMap and
 * RoguelikeNodeMap both dropped their on-chain `enemyThreat` field (removed
 * from createNode/updateNode/getNode on both contracts, undocumented,
 * caught by live verification rather than any changelog) — this replaces
 * it for both, since both node kinds carry a `mapId` and AI placement is
 * keyed by mapId regardless of which node-graph system is asking.
 */
export function useMapEnemyThreat(mapId: bigint | undefined) {
  const { data: allConfigs, isLoading: configsLoading } = useGetAllAIShipConfigs();
  const { data: placements, isLoading: placementsLoading } = useGetMapPlacements(mapId);

  const totalThreat = useMemo(() => {
    if (!allConfigs || !placements) return 0;
    const configById = new Map(allConfigs.map((c) => [c.id.toString(), c]));
    return placements.configIds.reduce((sum, configId) => {
      const config = configById.get(configId.toString());
      return config ? sum + aiConfigToPreviewShip(config).shipData.cost : sum;
    }, 0);
  }, [allConfigs, placements]);

  return { totalThreat, isLoading: configsLoading || placementsLoading };
}

/** Batched getMapPlacements across every map id — for admin export, where reading N maps one at a time isn't worth N separate hook instances. */
export function useGetAllMapPlacements(mapIds: number[]) {
  const result = useReadContracts({
    contracts: mapIds.map((id) => ({
      address: AI_ENCOUNTERS_ADDRESS,
      abi: AI_ENCOUNTERS_ABI,
      chainId: CHAIN_ID,
      functionName: "getMapPlacements" as const,
      args: [BigInt(id)] as const,
    })),
    query: { enabled: mapIds.length > 0 },
  });

  const data = mapIds.map((mapId, i) => {
    const raw = result.data?.[i]?.result as
      | readonly [readonly { row: number; col: number }[], readonly bigint[]]
      | undefined;
    return {
      mapId,
      positions: raw ? raw[0] : [],
      configIds: raw ? raw[1] : [],
    };
  });

  return { ...result, data };
}
