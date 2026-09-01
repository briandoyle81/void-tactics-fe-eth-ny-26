"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { aiConfigToPreviewShipWeb2, type AIShipConfigWeb2 } from "../utils/aiShipConfigWeb2";

export interface AIMapPlacementWeb2 {
  id: number;
  row: number;
  col: number;
  configId: number;
  config: AIShipConfigWeb2;
}

// Web2 counterpart to useMapEnemyThreat (useAIEncountersContract.ts) — total
// enemy fleet cost for a map, derived from its actual AI placements via the
// player-facing /api/ai-map-placements read instead of an on-chain read.
// Also returns the raw placements so callers building an EnemyFleetPreview
// (CampaignNodePreviewWeb2.tsx, RoguelikeGraphWeb2.tsx) don't need their own
// duplicate fetch — same queryKey either way, so this was already one
// cached request in practice, just previously duplicated code.
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

  return { totalThreat, placements: placements ?? [], isLoading };
}
