"use client";

import { useOwnedShipsWeb2 } from "./useOwnedShipsWeb2";
import { useFleetPlacementWeb2 } from "./useFleetPlacementWeb2";
import { useMapWeb2 } from "./useMapWeb2";
import { GRID_DIMENSIONS } from "../types/types";

// Web2 counterpart to useNodeFleetSelection.ts — thin wrapper around the
// shared useFleetPlacementWeb2, same role as the web3 version. Web2 ships
// are already recalculated server-side on every GET /api/ships (see
// LobbiesWeb2.tsx's stale-costs comment), so there's no equivalent of
// web3's costsVersion staleness gate to thread through here.
export function useNodeFleetSelectionWeb2(costLimit: number, requiredVariant?: number, mapId?: number) {
  const { ships, isLoading: shipsLoading } = useOwnedShipsWeb2();
  // The player is the creator side in single-player.
  const { creatorZone } = useMapWeb2(mapId ?? 0, GRID_DIMENSIONS.WIDTH, GRID_DIMENSIONS.HEIGHT);

  const fleet = useFleetPlacementWeb2({
    ships,
    costLimit,
    costsVersion: null,
    isCreatorSide: true,
    requiredVariant,
    zoneTiles: creatorZone,
  });

  return { ...fleet, shipsLoading };
}
