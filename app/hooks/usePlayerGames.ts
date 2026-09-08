import { useMemo } from "react";
import { useAccount } from "wagmi";
import { baseSepolia } from "viem/chains";
import { useGetGamesForPlayer } from "./useGameContract";
import { GameDataView } from "../types/types";
import { normalizeGameDataView } from "../utils/normalizeGameDataView";

export function usePlayerGames() {
  const { address } = useAccount();

  // Pinned to Base Sepolia — Game is currently only deployed there while
  // multi-chain support is temporarily disabled (see networks.ts). Without
  // this, a wallet connected to a different chain (still selectable via
  // RainbowKit even though the in-app picker is locked to Base Sepolia)
  // silently queries the wrong chain's Game contract and returns no games,
  // including single-player/campaign games, which only ever exist here.
  const { data: gamesData, isLoading, error, refetch } = useGetGamesForPlayer(
    address || "0x0",
    baseSepolia.id,
  );

  const games = useMemo((): GameDataView[] => {
    if (!Array.isArray(gamesData)) return [];
    return (gamesData as GameDataView[])
      .filter((g): g is GameDataView => g != null && typeof g === "object")
      .map(normalizeGameDataView);
  }, [gamesData]);

  return {
    games,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
