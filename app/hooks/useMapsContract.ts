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

/** A preset map's impassable (movement-blocking) tiles — independent of getPresetMap's LOS-blocking tiles. */
export function useGetPresetMapImpassable(
  mapId: number,
  readOptions?: { chainSource?: "wallet" | "picker" },
) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead("getPresetMapImpassable", enabled ? [BigInt(mapId)] : undefined, {
    query: { enabled },
    chainSource: readOptions?.chainSource ?? "wallet",
  });
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

// Batched map-name lookup for a whole map list (picker labels, admin list)
// — one multicall instead of N individual reads, same shape as
// useMapModes. On-chain counterpart to web2's useMapNameWeb2 — every
// seeded map has a real name as of the 2026-09-23 maps/deployment-zones
// redesign (docs/eth-global-remote/frontend-handoff-maps-and-deployment-zones-2026-09-23.md
// §3); an empty string means the map was never named.
export function useMapNames(mapIds: number[]) {
  const pickerChainId = useSelectedChainId();
  const { MAPS } = getContractAddresses(pickerChainId);
  const contracts = useMemo(
    () =>
      mapIds.map((id) => ({
        address: MAPS as `0x${string}`,
        abi: CONTRACT_ABIS.MAPS as Abi,
        chainId: pickerChainId,
        functionName: "mapName" as const,
        args: [BigInt(id)] as const,
      })),
    [mapIds, MAPS, pickerChainId],
  );
  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: { enabled: mapIds.length > 0 },
  });
  const nameByMapId = useMemo(() => {
    const map = new Map<number, string>();
    mapIds.forEach((id, i) => {
      const name = data?.[i]?.result as string | undefined;
      if (name) map.set(id, name);
    });
    return map;
  }, [mapIds, data]);
  return { nameByMapId, isLoading, error };
}

/** `Map #<id>` alone, or `Map #<id> — <name>` when the map has one — same format web2's titleLabel construction already uses. */
export function mapTitleLabel(id: number, nameByMapId: Map<number, string>): string {
  const name = nameByMapId.get(id);
  return name ? `Map #${id} — ${name}` : `Map #${id}`;
}

// Batched impassable-tile lookup for a whole map list (admin list's
// "Impassable tiles" count, mirroring the blocked/scoring counts already
// shown) — one multicall instead of N individual reads, same shape as
// useMapModes/useMapNames. See
// docs/eth-global-remote/frontend-handoff-maps-and-deployment-zones-2026-09-23.md §1.
export function useMapsImpassablePositions(mapIds: number[]) {
  const pickerChainId = useSelectedChainId();
  const { MAPS } = getContractAddresses(pickerChainId);
  const contracts = useMemo(
    () =>
      mapIds.map((id) => ({
        address: MAPS as `0x${string}`,
        abi: CONTRACT_ABIS.MAPS as Abi,
        chainId: pickerChainId,
        functionName: "getPresetMapImpassable" as const,
        args: [BigInt(id)] as const,
      })),
    [mapIds, MAPS, pickerChainId],
  );
  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: { enabled: mapIds.length > 0 },
  });
  const impassableByMapId = useMemo(() => {
    const map = new Map<number, Array<{ row: number; col: number }>>();
    mapIds.forEach((id, i) => {
      const positions = data?.[i]?.result as Array<{ row: number; col: number }> | undefined;
      if (positions) map.set(id, positions);
    });
    return map;
  }, [mapIds, data]);
  return { impassableByMapId, isLoading, error };
}

/** A map's custom creator-side deployment-zone tiles; `[]` means the map hasn't customized it (use the engine default column band). */
export function useCreatorZonePositions(
  mapId: number,
  readOptions?: { chainSource?: "wallet" | "picker" },
) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead("getCreatorZonePositions", enabled ? [BigInt(mapId)] : undefined, {
    query: { enabled },
    chainSource: readOptions?.chainSource ?? "wallet",
  });
}

/** A map's custom joiner-side deployment-zone tiles; `[]` means the map hasn't customized it (use the engine default column band). */
export function useJoinerZonePositions(
  mapId: number,
  readOptions?: { chainSource?: "wallet" | "picker" },
) {
  const enabled = isValidPositiveInt(mapId);
  return useMapsRead("getJoinerZonePositions", enabled ? [BigInt(mapId)] : undefined, {
    query: { enabled },
    chainSource: readOptions?.chainSource ?? "wallet",
  });
}

// Batched deployment-zone lookup for a whole map list (admin list's
// "Custom deployment zone" counts) — one multicall per side instead of
// N individual reads each, same shape as useMapModes/useMapNames/
// useMapsImpassablePositions. `[]` for a map means it hasn't customized
// that side's zone (uses the engine default column band) — see
// docs/eth-global-remote/frontend-handoff-maps-and-deployment-zones-2026-09-23.md §2.
function useMapsZonePositions(
  mapIds: number[],
  functionName: "getCreatorZonePositions" | "getJoinerZonePositions",
) {
  const pickerChainId = useSelectedChainId();
  const { MAPS } = getContractAddresses(pickerChainId);
  const contracts = useMemo(
    () =>
      mapIds.map((id) => ({
        address: MAPS as `0x${string}`,
        abi: CONTRACT_ABIS.MAPS as Abi,
        chainId: pickerChainId,
        functionName,
        args: [BigInt(id)] as const,
      })),
    [mapIds, MAPS, pickerChainId, functionName],
  );
  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: { enabled: mapIds.length > 0 },
  });
  const byMapId = useMemo(() => {
    const map = new Map<number, Array<{ row: number; col: number }>>();
    mapIds.forEach((id, i) => {
      const positions = data?.[i]?.result as Array<{ row: number; col: number }> | undefined;
      if (positions) map.set(id, positions);
    });
    return map;
  }, [mapIds, data]);
  return { byMapId, isLoading, error };
}

export function useMapsCreatorZonePositions(mapIds: number[]) {
  const { byMapId, isLoading, error } = useMapsZonePositions(mapIds, "getCreatorZonePositions");
  return { creatorZoneByMapId: byMapId, isLoading, error };
}

export function useMapsJoinerZonePositions(mapIds: number[]) {
  const { byMapId, isLoading, error } = useMapsZonePositions(mapIds, "getJoinerZonePositions");
  return { joinerZoneByMapId: byMapId, isLoading, error };
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
