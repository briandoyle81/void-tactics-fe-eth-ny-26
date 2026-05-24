"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { Ship } from "../types/types";
import { cacheShipsData } from "./useShipDataCache";

export function useOwnedShips() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ships", "owned"],
    queryFn: async () => {
      const ships = await apiFetch<Ship[]>("/api/ships");
      if (ships.length > 0) cacheShipsData(ships);
      return ships;
    },
    refetchInterval: 5000,
  });

  const ships = data ?? [];
  return {
    ships,
    shipCount: ships.length,
    hasShips: ships.length > 0,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
