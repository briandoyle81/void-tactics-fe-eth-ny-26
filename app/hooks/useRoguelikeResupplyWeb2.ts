"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "../lib/apiMutate";

// Web2-mode counterpart to useRoguelikeResupply.ts.

export function useRoguelikeResupplyWeb2() {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["roguelike", "run", "web2"] });

  const resupplyRepair = async (shipIds?: number[]) => {
    const result = await apiMutate<{ repaired: number[]; cost: number }>(
      "/api/roguelike/run/resupply/repair",
      "POST",
      shipIds ? { shipIds } : {},
    );
    await invalidate();
    return result;
  };

  const resupplyModifyRoster = async (addShipIds: number[], removeShipIds: number[]) => {
    await apiMutate("/api/roguelike/run/resupply/roster", "POST", { addShipIds, removeShipIds });
    await invalidate();
  };

  return { resupplyRepair, resupplyModifyRoster };
}
