"use client";

import { PURCHASE_TIERS } from "../lib/purchaseTiers";

export function useShipPurchaserPurchaseInfo() {
  return {
    tierCount: PURCHASE_TIERS.length,
    tiers: PURCHASE_TIERS.map((t) => t.tier),
    shipsPerTier: PURCHASE_TIERS.map((t) => t.shipCount),
    pricesUtc: PURCHASE_TIERS.map((t) => t.priceUtc),
    // kept for interface compat
    pricesWei: PURCHASE_TIERS.map((t) => Number(t.priceUtc)),
    normalized: null,
    isLoading: false,
    error: null,
    isFromCache: false,
    refetch: async () => {},
    purchaserDeployed: true,
  };
}
