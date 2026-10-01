import { useMemo } from "react";
import { useGetGamesForPlayer } from "./useGamesWeb2";
import type { Web2GameDataView } from "../types/web2Game";

export function usePlayerGamesWeb2(options?: { pausePolling?: boolean }) {
  const { data: gamesData, isLoading, error, refetch } = useGetGamesForPlayer({
    refetchInterval: options?.pausePolling ? false : 20000,
    refetchOnWindowFocus: !options?.pausePolling,
  });

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
