"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useCurrentUser } from "./useCurrentUser";
import { USER_BALANCE_QUERY_KEY } from "./useUserBalanceWeb2";

const QUERY_KEY = ["drone-storefront", "web2"] as const;

interface DroneStorefrontResponse {
  tier: number;
  decBalance: number;
  nextTierCost: number | null;
  maxTierReached: boolean;
}

// Web2-mode counterpart to `useDroneStorefront.ts` — reads come from
// GET /api/drone-storefront (Prisma-backed) instead of on-chain
// droneCoreTier/tierCoreCost/DEC-balance reads; no allowance concept, since
// DEC is spent via a server-side atomic decrement, not an ERC20 approve.
export function useDroneStorefrontWeb2() {
  const { isLoggedIn } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<DroneStorefrontResponse>("/api/drone-storefront"),
    enabled: isLoggedIn,
  });

  const refetchAll = async () => {
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: USER_BALANCE_QUERY_KEY }),
    ]);
  };

  const turnIn = async () => {
    const result = await apiMutate<{ tier: number }>("/api/drone-storefront/turn-in", "POST");
    await refetchAll();
    return result;
  };

  return {
    currentTier: data?.tier ?? 0,
    nextTier: (data?.tier ?? 0) + 1,
    nextTierCost: data?.nextTierCost ?? null,
    maxTierReached: data?.maxTierReached ?? false,
    decBalance: data?.decBalance ?? 0,
    isLoading,
    turnIn,
    refetchAll,
  };
}
