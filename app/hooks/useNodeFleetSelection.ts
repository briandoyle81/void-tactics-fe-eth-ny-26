"use client";

import { baseSepolia } from "viem/chains";
import { useOwnedShips } from "./useOwnedShips";
import { useCurrentCostsVersion } from "./useShipAttributesContract";
import { useFleetPlacement } from "./useFleetPlacement";

// Node-match ship-picking: the human is always the sole ("creator side")
// fleet builder — deployment zone is always cols 0-3, rows 0-10. Thin
// wrapper around the shared useFleetPlacement (see feedback_no_parallel_
// components memory for why this used to be its own parallel copy of
// Lobbies.tsx's logic, and why that was wrong).
export function useNodeFleetSelection(costLimit: number, requiredVariant?: number) {
  // Pinned to Base Sepolia — single-player only exists there, so the
  // player's ships/costs-version must come from that chain regardless of
  // what the header network picker is set to (see useOwnedShips.ts).
  const { ships, isLoading: shipsLoading } = useOwnedShips(baseSepolia.id);
  const { data: currentCostsVersion } = useCurrentCostsVersion(baseSepolia.id);
  const globalCostsVersion =
    currentCostsVersion !== undefined && currentCostsVersion !== null
      ? Number(currentCostsVersion)
      : null;

  const fleet = useFleetPlacement({
    ships,
    costLimit,
    costsVersion: globalCostsVersion,
    isCreatorSide: true,
    requiredVariant,
  });

  return { ...fleet, shipsLoading };
}
