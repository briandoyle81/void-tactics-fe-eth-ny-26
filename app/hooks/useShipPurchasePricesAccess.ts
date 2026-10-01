"use client";

import { useAccount, useReadContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

const ZERO = "0x0000000000000000000000000000000000000000";

function addrEq(a?: string | null, b?: string | null) {
  return Boolean(
    a && b && typeof a === "string" && typeof b === "string" &&
      a.toLowerCase() === b.toLowerCase(),
  );
}

/**
 * Native pack purchases use `Ships`; UTC pack purchases use `ShipPurchaser`.
 * Tab visibility: connected wallet is owner of either contract (typical deploy setup uses the same owner).
 */
export function useShipPurchasePricesAccess() {
  const { address, isConnected } = useAccount();
  const chainId = useSelectedChainId();
  const shipsAddr = getContractAddresses(chainId).SHIPS;
  const purchaserAddr = getContractAddresses(chainId).SHIP_PURCHASER;
  const purchaserDeployed =
    Boolean(purchaserAddr) &&
    purchaserAddr.toLowerCase() !== ZERO.toLowerCase();

  const { data: shipsOwner } = useReadContract({
    address: shipsAddr as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS,
    chainId,
    functionName: "owner",
    query: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      notifyOnChangeProps: ["data", "error"],
    },
  });

  const { data: purchaserOwner } = useReadContract({
    address: purchaserAddr as `0x${string}`,
    abi: CONTRACT_ABIS.SHIP_PURCHASER,
    chainId,
    functionName: "owner",
    query: {
      enabled: purchaserDeployed,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      notifyOnChangeProps: ["data", "error"],
    },
  });

  const isShipsOwner = addrEq(address, shipsOwner as string);
  const isPurchaserOwner =
    purchaserDeployed && addrEq(address, purchaserOwner as string);

  const canAdminShipPurchasePrices =
    Boolean(isConnected) && (isShipsOwner || isPurchaserOwner);

  return {
    isShipsOwner,
    isPurchaserOwner,
    canAdminShipPurchasePrices,
    purchaserDeployed,
    shipsOwner: shipsOwner as string | undefined,
    purchaserOwner: purchaserOwner as string | undefined,
  };
}
