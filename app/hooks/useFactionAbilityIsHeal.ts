import { useMemo } from "react";
import { useReadContract } from "wagmi";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

/**
 * Whether a variant's innate faction ability (dispatched as
 * `ActionType.FactionAbility`) heals rather than rams — variant 1's is Ram,
 * variant 2's is Repair (docs/faction-2.md §7). Reads `Game.
 * factionAbilityIsHeal(variant)` live rather than hardcoding a
 * variant-number check, per the doc's guidance that this is how future
 * factions' abilities will be distinguished too.
 */
export function useFactionAbilityIsHeal(variant: number | undefined) {
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  const { data, isLoading } = useReadContract({
    address: contractAddresses.GAME as `0x${string}`,
    abi: CONTRACT_ABIS.GAME as Abi,
    functionName: "factionAbilityIsHeal",
    args: useMemo(() => (variant != null ? [variant] : undefined), [variant]),
    chainId: activeChainId,
    query: { enabled: variant != null },
  });

  return { isHeal: !!data, isLoading };
}
