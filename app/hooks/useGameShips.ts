"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { Ship } from "../types/types";
import { cacheShipsData } from "./useShipDataCache";

export function useGameShips(gameId: number) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["gameShips", gameId],
    queryFn: async () => {
      const ships = await apiFetch<Ship[]>(`/api/games/${gameId}/ships`);
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
