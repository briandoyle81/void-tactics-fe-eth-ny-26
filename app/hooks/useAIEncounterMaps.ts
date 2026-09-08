"use client";

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";

// Single-player (SinglePlayerMatch/AIEncounters) is Base Sepolia only —
// always read from that chain regardless of the connected wallet/picker
// chain, same as useSinglePlayerMatch.ts.
const CHAIN_ID = baseSepolia.id;
const MAPS_ABI = CONTRACT_ABIS.MAPS as Abi;
const AI_ENCOUNTERS_ABI = CONTRACT_ABIS.AI_ENCOUNTERS as Abi;
const MAPS_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
  .MAPS as `0x${string}`;
const AI_ENCOUNTERS_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[CHAIN_ID]
  .AI_ENCOUNTERS as `0x${string}`;

export interface AIEncounterMap {
  mapId: bigint;
}

/** Preset maps that have at least one AI ship placement configured — the only maps valid for single-player. */
export function useAIEncounterMaps() {
  const presetMaps = useReadContract({
    address: MAPS_ADDRESS,
    abi: MAPS_ABI,
    chainId: CHAIN_ID,
    functionName: "getAllPresetMaps",
  });

  const mapIds = useMemo(() => {
    const raw = presetMaps.data as readonly [readonly bigint[], unknown, unknown] | undefined;
    return raw ? [...raw[0]] : [];
  }, [presetMaps.data]);

  const placementChecks = useReadContracts({
    contracts: mapIds.map((mapId) => ({
      address: AI_ENCOUNTERS_ADDRESS,
      abi: AI_ENCOUNTERS_ABI,
      chainId: CHAIN_ID,
      functionName: "mapHasPlacements" as const,
      args: [mapId] as const,
    })),
    query: { enabled: mapIds.length > 0 },
  });

  const maps = useMemo((): AIEncounterMap[] => {
    if (!placementChecks.data) return [];
    return mapIds
      .filter((_, i) => placementChecks.data?.[i]?.result === true)
      .map((mapId) => ({ mapId }));
  }, [mapIds, placementChecks.data]);

  return {
    maps,
    isLoading: presetMaps.isLoading || placementChecks.isLoading,
    error: presetMaps.error ?? placementChecks.error ?? null,
  };
}
