"use client";

import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { getSelectedChainId } from "../config/networks";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { PresetMap } from "../types/types";

export function useMapsContract() {
  const activeChainId = getSelectedChainId();
  const { MAPS } = getContractAddresses(activeChainId);
  return {
    address: MAPS as `0x${string}`,
    abi: CONTRACT_ABIS.MAPS as Abi,
    chainId: activeChainId,
  };
}

export function useMapsWrite() {
  return {
    writeContract: async () => {},
    writeContractAsync: async () => { throw new Error("blockchain writes disabled"); },
    isPending: false, isSuccess: false, isError: false, error: null, data: undefined, reset: () => {},
  };
}

// ── Read hooks — replaced with API calls ──────────────────────────────────────

function useMapsQuery() {
  return useQuery({
    queryKey: ["maps"],
    queryFn: () => apiFetch<PresetMap[]>("/api/maps"),
    staleTime: 60_000,
  });
}

export function useGetAllPresetMaps() {
  const { data, isLoading, error, refetch } = useMapsQuery();
  return { data: data ?? [], isLoading, error, refetch };
}

export function useMapCount() {
  const { data } = useMapsQuery();
  return { data: BigInt(data?.length ?? 0) };
}

export function useGetPresetMap(mapId: number, _options?: { chainSource?: string }) {
  const { data } = useMapsQuery();
  const map = data?.find((m) => m.id === mapId) ?? null;
  return { data: map ? map.blockedPositions : null };
}

export function useGetPresetScoringMap(mapId: number, _options?: { chainSource?: string }) {
  const { data } = useMapsQuery();
  const map = data?.find((m) => m.id === mapId) ?? null;
  return { data: map ? map.scoringPositions : null };
}

export function useMapExists(mapId: number) {
  const { data } = useMapsQuery();
  return { data: data?.some((m) => m.id === mapId) ?? false };
}

// Game map state is part of the game's state JSON — returned by /api/games/[id]
// Returns null here; GameDisplay uses game.state directly in Phase 5
export function useGetGameMapState(_gameId: number) {
  return { data: null as null, isLoading: false, error: null };
}
