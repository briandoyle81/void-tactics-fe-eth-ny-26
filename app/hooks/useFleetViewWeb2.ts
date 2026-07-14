"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import type { Web2Ship } from "../types/web2Ship";

interface FleetViewResponse {
  id: number;
  ownerId: string;
  ships: Web2Ship[];
}

// Web2-mode counterpart to web3's `getFleetShipIds`/`getShipsByIds` reads
// used by Lobbies.tsx's Fleet View Modal — fetches an already-submitted
// fleet's roster (own or opponent's) for display.
export function useFleetViewWeb2(lobbyId: number | null, fleetId: number | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["fleetViewWeb2", lobbyId, fleetId],
    queryFn: () => apiFetch<FleetViewResponse>(`/api/lobbies/${lobbyId}/fleet/${fleetId}`),
    enabled: lobbyId !== null && fleetId !== null && fleetId > 0,
  });

  return {
    ownerId: data?.ownerId ?? null,
    ships: data?.ships ?? [],
    isLoading,
    error,
  };
}
