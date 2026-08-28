"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import type { Web2Ship } from "../types/web2Ship";

interface FleetViewResponse {
  id: number;
  ownerId: string;
  ships: Web2Ship[];
  positions: Array<{ shipId: number; row: number; col: number }>;
}

// Web2-mode counterpart to web3's `getFleetShipIds`/`getShipsByIds` reads
// used by Lobbies.tsx's Fleet View Modal — fetches an already-submitted
// fleet's roster (own or opponent's) for display. `positions` also backs the
// opponent-fleet grid preview during fleet selection (mirrors Lobbies.tsx's
// getFleetShipIdsAndPositions read).
export function useFleetViewWeb2(lobbyId: number | null, fleetId: number | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["fleetViewWeb2", lobbyId, fleetId],
    queryFn: () => apiFetch<FleetViewResponse>(`/api/lobbies/${lobbyId}/fleet/${fleetId}`),
    enabled: lobbyId !== null && fleetId !== null && fleetId > 0,
    // A submitted fleet's roster/positions never change — safe to cache
    // indefinitely, same rationale as Lobbies.tsx's opponentCacheKey.
    staleTime: Infinity,
  });

  return {
    ownerId: data?.ownerId ?? null,
    ships: data?.ships ?? [],
    positions: data?.positions ?? [],
    isLoading,
    error,
  };
}
