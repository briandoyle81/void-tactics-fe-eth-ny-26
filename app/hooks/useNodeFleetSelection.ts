"use client";

import { baseSepolia } from "viem/chains";
import { useOwnedShips } from "./useOwnedShips";
import { useCurrentCostsVersion } from "./useShipAttributesContract";
import { useCreatorZonePositions } from "./useMapsContract";
import { useFleetPlacement } from "./useFleetPlacement";

// Node-match ship-picking: the human is always the sole ("creator side")
// fleet builder — deployment zone defaults to cols 0-3, rows 0-10, unless
// `mapId`'s own custom creator zone overrides it (see
// docs/eth-global-remote/frontend-handoff-maps-and-deployment-zones-2026-09-23.md
// §2). Thin wrapper around the shared useFleetPlacement (see feedback_no_parallel_
// components memory for why this used to be its own parallel copy of
// Lobbies.tsx's logic, and why that was wrong).
export function useNodeFleetSelection(costLimit: number, requiredVariant?: number, mapId?: number) {
  // Pinned to Base Sepolia — single-player only exists there, so the
  // player's ships/costs-version must come from that chain regardless of
  // what the header network picker is set to (see useOwnedShips.ts).
  const { ships, isLoading: shipsLoading } = useOwnedShips(baseSepolia.id);
  // Costs are per-variant — a roguelike node can require variant 1 (its
  // first three missions) or variant 2 (every later one), so the costs
  // version checked against the fleet's ships must be that node's own
  // variant, not the chain's default. Falls back to the chain default when
  // no specific variant is required (e.g. a mode that accepts either).
  const { data: currentCostsVersion } = useCurrentCostsVersion(
    baseSepolia.id,
    requiredVariant,
  );
  const globalCostsVersion =
    currentCostsVersion !== undefined && currentCostsVersion !== null
      ? Number(currentCostsVersion)
      : null;

  const { data: creatorZonePositions } = useCreatorZonePositions(mapId ?? 0, {
    chainSource: "wallet",
  });

  const fleet = useFleetPlacement({
    ships,
    costLimit,
    costsVersion: globalCostsVersion,
    isCreatorSide: true,
    requiredVariant,
    zoneTiles: Array.isArray(creatorZonePositions) ? creatorZonePositions : undefined,
  });

  return { ...fleet, shipsLoading };
}
