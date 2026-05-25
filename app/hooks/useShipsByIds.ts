"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { Ship } from "../types/types";
import { cacheShipsData } from "./useShipDataCache";

export function useShipsByIds(shipIds: number[]) {
  const ids = shipIds.map(String).join(",");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ships", "byIds", ids],
    queryFn: async () => {
      if (shipIds.length === 0) return [];
      const ships = await apiFetch<Ship[]>(`/api/ships?ids=${ids}`);
      if (ships.length > 0) cacheShipsData(ships);
      return ships;
    },
    enabled: shipIds.length > 0,
  });

  return {
    ships: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
