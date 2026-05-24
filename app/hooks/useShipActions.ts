"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "@/app/lib/apiMutate";
import { toast } from "react-hot-toast";

export function useShipActions() {
  const queryClient = useQueryClient();

  const invalidateShips = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["ships"] });
  }, [queryClient]);

  const constructShip = useCallback(async (shipId: bigint) => {
    try {
      await apiMutate(`/api/ships/${shipId}/construct`, "POST");
      toast.success("Ship constructed!");
      await invalidateShips();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }, [invalidateShips]);

  const constructAllShips = useCallback(async (shipIds: bigint[]) => {
    try {
      await Promise.all(shipIds.map((id) => apiMutate(`/api/ships/${id}/construct`, "POST")));
      toast.success("All ships constructed!");
      await invalidateShips();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }, [invalidateShips]);

  const recycleShips = useCallback(async (shipIds: bigint[]) => {
    try {
      await Promise.all(shipIds.map((id) => apiMutate(`/api/ships/${id}`, "DELETE")));
      toast.success("Ships recycled.");
      await invalidateShips();
    } catch (err) {
      toast.error(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }, [invalidateShips]);

  return {
    constructShip,
    constructAllShips,
    recycleShips,
    isPending: false,
    error: null,
  };
}
