"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useInvalidateUserBalanceWeb2 } from "./useUserBalanceWeb2";

export interface UtcPurchaseTierPreview {
  tier: number;
  shipCount: number;
  priceUsdCents: number;
  utcAmount: number;
}

export function useUtcPurchaseTiersWeb2(enabled: boolean) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["utc-purchase-tiers", "web2"],
    queryFn: () => apiFetch<{ tiers: UtcPurchaseTierPreview[] }>("/api/utc/purchase"),
    enabled,
  });

  return {
    tiers: data?.tiers ?? [],
    isLoading,
    error: error?.message ?? null,
  };
}

export function useUtcPurchaseWeb2() {
  const invalidateBalance = useInvalidateUserBalanceWeb2();

  const purchase = async (tier: number) => {
    const result = await apiMutate<{ utcEarned: number; creditBalance: number }>(
      "/api/utc/purchase",
      "POST",
      { tier },
    );
    invalidateBalance();
    return result;
  };

  return { purchase };
}
