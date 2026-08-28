"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { aiConfigToPreviewShipWeb2, type AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";

interface AIMapPlacementWeb2 {
  id: number;
  row: number;
  col: number;
  configId: number;
  config: AIShipConfigWeb2;
}

// Web2 counterpart to useMapEnemyThreat (useAIEncountersContract.ts) — total
// enemy fleet cost for a map, derived from its actual AI placements via the
// player-facing /api/ai-map-placements read instead of an on-chain read.
export function useMapEnemyThreatWeb2(mapId: number | null | undefined) {
  const { data: placements, isLoading } = useQuery({
    queryKey: ["ai-map-placements", mapId],
    queryFn: () => apiFetch<AIMapPlacementWeb2[]>(`/api/ai-map-placements?mapId=${mapId}`),
    enabled: mapId != null,
  });

  const totalThreat = useMemo(() => {
    if (!placements) return 0;
    return placements.reduce(
      (sum, p) => sum + aiConfigToPreviewShipWeb2(p.config).shipData.cost,
      0,
    );
  }, [placements]);

  return { totalThreat, isLoading };
}
