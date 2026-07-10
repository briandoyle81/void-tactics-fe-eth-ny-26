"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";

// Lightweight map-name lookup for display (e.g. game list cards) — doesn't
// need blockedTiles/scoringTiles, so it's kept separate from useMapWeb2.ts's
// grid-building fetch.
export function useMapNameWeb2(mapId: number) {
  const { data, isLoading } = useQuery({
    queryKey: ["mapNameWeb2", mapId],
    queryFn: () => apiFetch<{ name: string }>(`/api/maps/${mapId}`),
    enabled: mapId > 0,
    staleTime: Infinity, // maps never change
  });
  return { name: data?.name ?? null, isLoading };
}
