"use client";

export function useShipPurchasePricesAccess() {
  return {
    isShipsOwner: false,
    isPurchaserOwner: false,
    canAdminShipPurchasePrices: false,
    purchaserDeployed: false,
    shipsOwner: undefined as string | undefined,
    purchaserOwner: undefined as string | undefined,
  };
}
