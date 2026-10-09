"use client";

import { useMemo } from "react";
import { baseSepolia } from "viem/chains";
import type { Address } from "viem";
import { useRoguelikeRunView } from "./useGameLens";
import { useFleetShipAttributes } from "./useFleetShipAttributes";
import { useShipAttributesByIdsWeb2 } from "./useShipAttributesByIdsWeb2";
import type { RoguelikeRosterEntryWeb2 } from "./useRoguelikeWeb2";

// Hull left on each run roster ship, as a percentage — shown on the run
// map's action bar and the Command Deck's layout B. Keyed by ship id string
// so both modes hand number-native data to shared components.

/** Web3: HP from GameLens.getRunView (0 = not yet damaged this run, i.e. full). */
export function useRunRosterHullWeb3(
  playerAddress: Address | undefined,
  rosterShipIds: bigint[],
): Map<string, number> {
  const { hpByShipId } = useRoguelikeRunView(playerAddress, rosterShipIds.length > 0);
  const { attributesMap } = useFleetShipAttributes(rosterShipIds, baseSepolia.id);
  return useMemo(() => {
    const hull = new Map<string, number>();
    rosterShipIds.forEach((id) => {
      const max = attributesMap.get(id)?.maxHullPoints ?? 0;
      const raw = hpByShipId.get(id.toString()) ?? 0;
      const current = raw === 0 ? max : raw;
      hull.set(id.toString(), max > 0 ? (current / max) * 100 : 100);
    });
    return hull;
  }, [rosterShipIds, attributesMap, hpByShipId]);
}

/** Web2: roster entries store damage taken; 0 is a full hull. */
export function useRunRosterHullWeb2(roster: RoguelikeRosterEntryWeb2[]): Map<string, number> {
  const shipIds = useMemo(() => roster.map((r) => r.shipId), [roster]);
  const { attributesByShipId } = useShipAttributesByIdsWeb2(shipIds);
  return useMemo(() => {
    const hull = new Map<string, number>();
    roster.forEach((entry) => {
      const max = attributesByShipId.get(entry.shipId)?.maxHullPoints ?? 0;
      hull.set(String(entry.shipId), max > 0 ? (Math.max(0, max - entry.hp) / max) * 100 : 100);
    });
    return hull;
  }, [roster, attributesByShipId]);
}
