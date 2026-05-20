import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useGetGamesForPlayer } from "./useGameContract";
import { GameDataView } from "../types/types";

export function usePlayerGames() {
  const { address } = useAccount();

  const { data: gamesData, isLoading, error, refetch } = useGetGamesForPlayer(
    address || "0x0",
  );

  const games = useMemo((): GameDataView[] => {
    if (!Array.isArray(gamesData)) return [];
    return (gamesData as GameDataView[]).filter(
      (g): g is GameDataView => g != null && typeof g === "object",
    );
  }, [gamesData]);

  return {
    games,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
