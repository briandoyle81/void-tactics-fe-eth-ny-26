"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { Web2Ship } from "../types/web2Ship";
import { cacheShipsData } from "./useShipDataCacheWeb2";

export function useGameShipsWeb2(gameId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["gameShipsWeb2", gameId],
    queryFn: async () => {
      const ships = await apiFetch<Web2Ship[]>(`/api/games/${gameId}/ships`);
      if (ships.length > 0) cacheShipsData(ships);
      return ships;
    },
    enabled: gameId > 0,
  });

  return {
    ships: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
