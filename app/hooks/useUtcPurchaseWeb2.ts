"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { apiMutate } from "../lib/apiMutate";
import { useInvalidateUserBalanceWeb2 } from "./useUserBalanceWeb2";
import { UTC_PURCHASE_TIERS, type UtcPurchaseTier } from "../lib/utcPurchaseTiers";

export interface UtcPurchaseTierPreview {
  tier: number;
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

// Live (DB-backed) direct UTC-purchase tiers, editable via the (web2)
// Purchase Prices admin panel's "UTC packs" section — see
// ShipPurchasePricesWeb2.tsx. Falls back to UTC_PURCHASE_TIERS defaults as
// placeholder data while loading. Independent from usePurchaseTiersWeb2
// (ship packs) — same admin-tab pattern, different Config row.
export function useUtcPurchaseTiersAdminWeb2() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["utc-purchase-tiers", "admin", "web2"],
    queryFn: () => apiFetch<UtcPurchaseTier[]>("/api/utc/purchase-tiers"),
    placeholderData: UTC_PURCHASE_TIERS,
  });

  return {
    tiers: data ?? UTC_PURCHASE_TIERS,
    isLoading,
    error: error?.message ?? null,
    refetch,
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
