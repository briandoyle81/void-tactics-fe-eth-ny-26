"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "../lib/apiFetch";
import { MapMode, type MapPosition, type ScoringPosition } from "../types/types";
import type { MapPickerMap } from "../components/MapPickerModal";

interface Web2MapListItem {
  id: number;
  name: string;
  mode: MapMode;
  blockedTiles: MapPosition[];
  impassableTiles: MapPosition[];
  scoringTiles: ScoringPosition[];
}

// Web2 counterpart to Lobbies.tsx's pvpEligibleMapIds/pvpMapPickerMaps — the
// full preset map list filtered down to PvP-eligible maps (PvP or Both),
// same shared query key as MapsWeb2.tsx so the cache is reused rather than
// double-fetched. No deployment-zone data source in web2 yet (see
// MapPreviewCard.tsx's doc comment) — creatorZonePositions/
// joinerZonePositions stay omitted.
export function usePvpMapsWeb2() {
  const { status } = useSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ["maps", "web2"],
    queryFn: () => apiFetch<Web2MapListItem[]>("/api/maps"),
    enabled: status === "authenticated",
  });

  const pvpEligibleMaps = useMemo(
    () => (data ?? []).filter((m) => m.mode !== MapMode.PvE),
    [data],
  );
  const pvpEligibleMapIds = useMemo(() => pvpEligibleMaps.map((m) => m.id), [pvpEligibleMaps]);
  const pvpMapPickerMaps: MapPickerMap[] = useMemo(
    () =>
      pvpEligibleMaps.map((m) => ({
        id: m.id,
        titleLabel: `Map #${m.id} — ${m.name}`,
        blockedPositions: m.blockedTiles,
        scoringPositions: m.scoringTiles,
        impassablePositions: m.impassableTiles,
        modeLabel: MapMode[m.mode],
      })),
    [pvpEligibleMaps],
  );

  return { pvpEligibleMapIds, pvpMapPickerMaps, isLoading, error };
}
