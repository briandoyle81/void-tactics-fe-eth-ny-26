"use client";

import { useMemo } from "react";
import { useAccount } from "./useAccount";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { getSelectedChainId } from "../config/networks";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { GameDataView } from "../types/types";

// Contract params — still needed for wagmi write calls until Phase 4
export function useGameContract() {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  return {
    address: contractAddresses.GAME as `0x${string}`,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
  };
}

export function useGameWrite() {
  return {
    writeContract: async () => {},
    writeContractAsync: async () => { throw new Error("blockchain writes disabled"); },
    isPending: false, isSuccess: false, isError: false, error: null, data: undefined, reset: () => {},
  };
}

// ── Read hooks — replaced with API calls ──────────────────────────────────────

export function useGetGame(gameId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["games", gameId],
    queryFn: () => apiFetch<GameDataView>(`/api/games/${gameId}`),
    enabled: gameId > 0,
    // SSE (useGameStream) handles real-time push; this is a fallback safety-net poll
    refetchInterval: 15000,
    staleTime: 2000,
  });
  return { data, isLoading, error, refetch };
}

export function useGetGamesForPlayer(_playerAddress: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["games", "player"],
    queryFn: () => apiFetch<GameDataView[]>("/api/games"),
    refetchInterval: 5000,
  });
  return { data, isLoading, error, refetch };
}

// Kept as shim — gameId is now a number not a number in the traditional backend
export function useGetGamesFromIds(gameIds: number[]) {
  const key = useMemo(() => gameIds.join(","), [gameIds]);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["games", "byIds", key],
    queryFn: () =>
      Promise.all(gameIds.map((id) => apiFetch<GameDataView>(`/api/games/${id}`))),
    enabled: gameIds.length > 0,
  });
  return { data, isLoading, error, refetch };
}
