import { useReadContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Base Sepolia only today (see deployed_addresses.json) — same pattern as
// SHIPS_ROUTER_ADDRESS in useShipsByIds.ts.
const REGISTRY_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
  .FACTION_REWARD_TOKEN_REGISTRY as `0x${string}`;

/**
 * Reads FactionRewardTokenRegistry.rewardToken(variant) live — see
 * docs/update/Frontend_Updates_2026-09-17.md §2. Never hardcode "variant 2 ->
 * DEC": the mapping is owner-configurable and designed to grow over time.
 * `rewardToken === ZERO_ADDRESS` means no reward token is registered for
 * that variant yet (an AI kill of that variant pays nothing, mirrored by the
 * contract's `RewardSkipped` event instead of an ERC20 `Transfer`).
 */
export function useFactionRewardToken(variant: number | undefined) {
  const activeChainId = useSelectedChainId();

  const isDeployed =
    activeChainId === baseSepolia.id &&
    !!REGISTRY_ADDRESS &&
    REGISTRY_ADDRESS.toLowerCase() !== ZERO_ADDRESS;

  const {
    data: rewardTokenAddress,
    isLoading,
    refetch: refetchRewardToken,
  } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: CONTRACT_ABIS.FACTION_REWARD_TOKEN_REGISTRY as Abi,
    functionName: "rewardToken",
    args: variant != null ? [variant] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: isDeployed && variant != null },
  });

  const rewardToken = rewardTokenAddress as `0x${string}` | undefined;
  const hasRegisteredReward =
    !!rewardToken && rewardToken.toLowerCase() !== ZERO_ADDRESS;

  return {
    isDeployed,
    registryAddress: REGISTRY_ADDRESS,
    rewardToken,
    hasRegisteredReward,
    isLoading,
    refetchRewardToken,
  };
}
