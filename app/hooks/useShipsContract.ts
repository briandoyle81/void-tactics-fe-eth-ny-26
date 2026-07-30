import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { useSelectedChainId } from "./useSelectedChainId";

// Hook for reading contract data
export function useShipsContract() {
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  return {
    address: contractAddresses.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS as Abi,
    chainId: activeChainId,
  };
}

// Hook for reading contract data with proper typing. `chainIdOverride` lets
// a caller pin the read to a specific chain instead of following the header
// network picker — needed for flows (like the campaign, Base-Sepolia-only)
// that must work regardless of what chain the picker happens to be on.
export function useShipsRead(
  functionName: string,
  args?: readonly unknown[],
  chainIdOverride?: number,
) {
  const pickerChainId = useSelectedChainId();
  const activeChainId = chainIdOverride ?? pickerChainId;
  const contractAddresses = getContractAddresses(activeChainId);

  return useReadContract({
    address: contractAddresses.SHIPS as `0x${string}`,
    abi: CONTRACT_ABIS.SHIPS as Abi,
    chainId: activeChainId,
    functionName,
    args,
  });
}

// Hook for writing to contract with proper typing
export function useShipsWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type ShipsReadFunction =
  | "getShip"
  | "getShipIdsOwned"
  | "getShipsByIds"
  | "getPurchaseInfo"
  | "getCosts"
  | "getCurrentCostsVersion"
  | "isShipDestroyed"
  | "getTierOfTrait"
  | "shipCount";

export type ShipsWriteFunction =
  | "constructShip"
  | "constructShips"
  | "constructAllMyShips"
  | "shipBreaker"
  /** Permissionless: refreshes costsVersion + cost via ShipAttributes (reverts if ship in fleet). */
  | "syncShipCosts"
  /** Owner or game only; players should use syncShipCosts. */
  | "setCostOfShip";
