"use client";

import { PURCHASE_TIERS } from "../lib/purchaseTiers";

export function useShipsPurchaseInfo() {
  return {
    tierCount: PURCHASE_TIERS.length,
    tiers: PURCHASE_TIERS.map((t) => t.tier),
    shipsPerTier: PURCHASE_TIERS.map((t) => t.shipCount),
    pricesUsdCents: PURCHASE_TIERS.map((t) => t.priceUsdCents),
    // kept for interface compat — unused for USD display
    pricesWei: PURCHASE_TIERS.map((t) => BigInt(t.priceUsdCents)),
    normalized: null,
    isLoading: false,
    error: null,
    isFromCache: false,
    refetch: async () => {},
  };
}
