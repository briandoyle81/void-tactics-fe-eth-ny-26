import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Reads for the DroneStorefront DEC sink (docs/faction-2.md §3): a player's
 * current tier, the exact cost of their next tier, and their DEC
 * balance/allowance. `tierCoreCost` reverts once past the last configured
 * tier — `nextTierCostError` set means "max tier reached" rather than a
 * real failure.
 */
export function useDroneStorefront() {
  const { address } = useAccount();
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  const droneStorefrontAddress = contractAddresses.DRONE_STOREFRONT as
    | `0x${string}`
    | undefined;
  const droneEnergyCoresAddress = contractAddresses.DRONE_ENERGY_CORES as
    | `0x${string}`
    | undefined;

  const isDeployed =
    !!droneStorefrontAddress &&
    droneStorefrontAddress.toLowerCase() !== ZERO_ADDRESS &&
    !!droneEnergyCoresAddress &&
    droneEnergyCoresAddress.toLowerCase() !== ZERO_ADDRESS;

  const {
    data: currentTier,
    isLoading: isLoadingTier,
    refetch: refetchTier,
  } = useReadContract({
    address: droneStorefrontAddress,
    abi: CONTRACT_ABIS.DRONE_STOREFRONT as Abi,
    functionName: "droneCoreTier",
    args: address ? [address] : undefined,
    chainId: activeChainId,
    query: { enabled: isDeployed && !!address },
  });

  const tierNumber = currentTier !== undefined ? Number(currentTier) : 0;
  const nextTier = tierNumber + 1;

  const {
    data: nextTierCost,
    isError: nextTierCostErrored,
    isLoading: isLoadingNextTierCost,
    refetch: refetchNextTierCost,
  } = useReadContract({
    address: droneStorefrontAddress,
    abi: CONTRACT_ABIS.DRONE_STOREFRONT as Abi,
    functionName: "tierCoreCost",
    args: useMemo(() => [BigInt(nextTier)] as const, [nextTier]),
    chainId: activeChainId,
    query: { enabled: isDeployed && currentTier !== undefined },
  });

  const maxTierReached = isDeployed && currentTier !== undefined && nextTierCostErrored;

  const {
    data: decBalance,
    refetch: refetchDecBalance,
  } = useReadContract({
    address: droneEnergyCoresAddress,
    abi: CONTRACT_ABIS.DRONE_ENERGY_CORES as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: activeChainId,
    query: { enabled: isDeployed && !!address },
  });

  const {
    data: decAllowance,
    refetch: refetchDecAllowance,
  } = useReadContract({
    address: droneEnergyCoresAddress,
    abi: CONTRACT_ABIS.DRONE_ENERGY_CORES as Abi,
    functionName: "allowance",
    args:
      address && droneStorefrontAddress
        ? [address, droneStorefrontAddress]
        : undefined,
    chainId: activeChainId,
    query: { enabled: isDeployed && !!address },
  });

  const refetchAll = () => {
    void refetchTier();
    void refetchNextTierCost();
    void refetchDecBalance();
    void refetchDecAllowance();
  };

  return {
    isDeployed,
    droneStorefrontAddress,
    droneEnergyCoresAddress,
    currentTier: tierNumber,
    nextTier,
    nextTierCost: nextTierCost as bigint | undefined,
    maxTierReached,
    isLoadingTier,
    isLoadingNextTierCost,
    decBalance: decBalance as bigint | undefined,
    decAllowance: decAllowance as bigint | undefined,
    refetchAll,
  };
}
