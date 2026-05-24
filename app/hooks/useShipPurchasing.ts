"use client";

export function useShipPurchasing() {
  return {
    tiers: [], shipsPerTier: [], pricesWei: [],
    isLoadingPurchaseInfo: false, flowBalance: undefined,
    isLoadingFlowBalance: false, isPending: false,
    isConfirming: false, isConfirmed: false,
    purchaseShip: async () => { throw new Error("blockchain writes disabled"); },
    activeChainId: 0,
  };
}
