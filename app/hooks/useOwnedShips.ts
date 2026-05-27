"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { Ship } from "../types/types";
import { cacheShipsData } from "./useShipDataCache";

async function fetchAllShips(): Promise<Ship[]> {
  const all: Ship[] = [];
  let cursor: number | null = null;

  do {
    const url: string = `/api/ships${cursor ? `?cursor=${cursor}` : ""}`;
    const { ships, nextCursor }: { ships: Ship[]; nextCursor: number | null } =
      await apiFetch<{ ships: Ship[]; nextCursor: number | null }>(url);
    all.push(...ships);
    cursor = nextCursor;
  } while (cursor !== null);

  if (all.length > 0) cacheShipsData(all);
  return all;
}

export function useOwnedShips() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ships", "owned"],
    queryFn: fetchAllShips,
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
