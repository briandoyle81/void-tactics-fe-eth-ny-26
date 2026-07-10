import { useMemo } from "react";
import { useGetGamesForPlayer } from "./useGamesWeb2";
import type { Web2GameDataView } from "../types/web2Game";

export function usePlayerGamesWeb2() {
  const { data: gamesData, isLoading, error, refetch } = useGetGamesForPlayer();

  const games = useMemo((): Web2GameDataView[] => {
    if (!Array.isArray(gamesData)) return [];
    return gamesData.filter(
      (g): g is Web2GameDataView => g != null && typeof g === "object",
    );
  }, [gamesData]);

  return {
    games,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
