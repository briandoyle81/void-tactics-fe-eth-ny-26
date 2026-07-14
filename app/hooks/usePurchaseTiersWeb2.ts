"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { PURCHASE_TIERS, type PurchaseTier } from "../lib/purchaseTiers";

// Live (DB-backed) ship-pack pricing tiers, editable via the (web2) Purchase
// Prices admin panel — see ShipPurchasePricesWeb2.tsx. Falls back to the
// hardcoded PURCHASE_TIERS defaults as placeholder data while loading, so
// the purchase UI never flashes an empty tier list.
export function usePurchaseTiersWeb2() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ships", "purchase-tiers"],
    queryFn: () => apiFetch<PurchaseTier[]>("/api/ships/purchase-tiers"),
    placeholderData: PURCHASE_TIERS,
  });

  return {
    tiers: data ?? PURCHASE_TIERS,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
