import { useMemo } from "react";
import { useReadContract, useReadContracts, useWriteContract, useAccount } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { getSelectedChainId } from "../config/networks";
import { useSelectedChainId } from "./useSelectedChainId";
import { MapMode } from "../types/types";

export type UseMapsReadOptions = {
  query?: { enabled?: boolean };
  /**
   * "picker" follows the header network dropdown immediately (via `useSelectedChainId`).
   * "wallet" follows the connected wallet chain when set, else the picker (for in-game / lobby reads).
   */
  chainSource?: "wallet" | "picker";
};

// Maps contract address/abi for the chain selected in the header picker (not module-level frozen).
export function useMapsContract() {
  const pickerChainId = useSelectedChainId();
  const { MAPS } = getContractAddresses(pickerChainId);

  return {
    address: MAPS as `0x${string}`,
    abi: CONTRACT_ABIS.MAPS as Abi,
    chainId: pickerChainId,
  };
}

// Hook for reading contract data with proper typing
export function useMapsRead(
  functionName: string,
  args?: readonly unknown[],
  options?: UseMapsReadOptions,
) {
  const pickerChainId = useSelectedChainId();
  const { chainId: walletChainId } = useAccount();
  const chainSource = options?.chainSource ?? "wallet";
  const activeChainId =
    chainSource === "picker"
      ? pickerChainId
      : (walletChainId ?? getSelectedChainId());
  const { MAPS } = getContractAddresses(activeChainId);

  return useReadContract({
    address: MAPS as `0x${string}`,
    abi: CONTRACT_ABIS.MAPS as Abi,
    chainId: activeChainId,
    functionName,
    args,
    query: options?.query,
  });
}

// Hook for writing to contract with proper typing
export function useMapsWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type MapsReadFunction =
  | "mapCount"
  | "getAllPresetMaps"
  | "getPresetMap"
  | "getPresetScoringMap"
  | "mapExists";

// Specific hooks for common functions
export function useMapCount() {
  return useMapsRead("mapCount", undefined, { chainSource: "picker" });
}

export function useGetAllPresetMaps() {
  return useMapsRead("getAllPresetMaps", undefined, { chainSource: "picker" });
}

function isValidPositiveInt(n: number) {
  return Number.isFinite(n) && Number.isInteger(n) && n > 0;
}

export function useGetPresetMap(
  mapId: number,
  readOptions?: { chainSource?: "wallet" | "picker" },
) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead("getPresetMap", enabled ? [BigInt(mapId)] : undefined, {
    query: { enabled },
    chainSource: readOptions?.chainSource ?? "wallet",
  });
}

export function useGetPresetScoringMap(
  mapId: number,
  readOptions?: { chainSource?: "wallet" | "picker" },
) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead(
    "getPresetScoringMap",
    enabled ? [BigInt(mapId)] : undefined,
    {
      query: { enabled },
      chainSource: readOptions?.chainSource ?? "wallet",
    },
  );
}

export function useMapExists(mapId: number) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead("mapExists", enabled ? [BigInt(mapId)] : undefined, {
    query: { enabled },
  });
}

export function useMapMode(mapId: number, readOptions?: { chainSource?: "wallet" | "picker" }) {
  const enabled = isValidPositiveInt(mapId);
  const result = useMapsRead("mapMode", enabled ? [BigInt(mapId)] : undefined, {
    query: { enabled },
    chainSource: readOptions?.chainSource ?? "picker",
  });
  return { ...result, data: result.data as MapMode | undefined };
}

// Batched mode lookup for a whole map list (picker filtering, admin badges)
// — one multicall instead of N individual reads.
export function useMapModes(mapIds: number[]) {
  const pickerChainId = useSelectedChainId();
  const { MAPS } = getContractAddresses(pickerChainId);
  const contracts = useMemo(
    () =>
      mapIds.map((id) => ({
        address: MAPS as `0x${string}`,
        abi: CONTRACT_ABIS.MAPS as Abi,
        chainId: pickerChainId,
        functionName: "mapMode" as const,
        args: [BigInt(id)] as const,
      })),
    [mapIds, MAPS, pickerChainId],
  );
  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: { enabled: mapIds.length > 0 },
  });
  const modeByMapId = useMemo(() => {
    const map = new Map<number, MapMode>();
    mapIds.forEach((id, i) => {
      const mode = data?.[i]?.result as MapMode | undefined;
      if (mode !== undefined) map.set(id, mode);
    });
    return map;
  }, [mapIds, data]);
  return { modeByMapId, isLoading, error };
}

export function useGetGameMapState(
  gameId: number,
  readOptions?: { chainSource?: "wallet" | "picker" },
) {
  return useMapsRead("getGameMapState", [BigInt(gameId)], {
    query: { enabled: gameId > 0 },
    chainSource: readOptions?.chainSource ?? "wallet",
  });
}
