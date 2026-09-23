import { useMemo } from "react";
import { useReadContract } from "wagmi";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses, ZERO_ADDRESS } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

// Every ship's innate faction ability — variant 1's Ram, variant 2's Repair
// — is dispatched via ActionType.FactionAbility and resolved by a
// dedicated, unequipped resolver contract (RamResolver/RepairResolver),
// decoupled from the equipped-Special config table entirely (see those
// contracts' own header comments). This only exists where the resolver
// system does — Base Sepolia today; the other three chains still run the
// older Game.sol where ramming was an automatic side effect of a plain
// move and Repair never existed, so `isSupported` gates the FE onto the
// right calling convention per chain rather than assuming everywhere has
// been redeployed. See docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md
// and docs/ai-behavior-registry.md.

/** Live `RamResolver.range()` (variant 1's Ram — evict a downed enemy). */
export function useRamResolverConfig() {
  const chainId = useSelectedChainId();
  const address = getContractAddresses(chainId).RAM_RESOLVER as `0x${string}`;
  const isSupported = address.toLowerCase() !== ZERO_ADDRESS;
  const { data } = useReadContract({
    address,
    abi: CONTRACT_ABIS.RAM_RESOLVER as Abi,
    chainId,
    functionName: "range",
    query: { enabled: isSupported },
  });
  return { range: data as number | undefined, isSupported };
}

/** Live `RepairResolver.range()`/`strength()` (variant 2's Repair — heal a friendly, including self). */
export function useRepairResolverConfig() {
  const chainId = useSelectedChainId();
  const address = getContractAddresses(chainId).REPAIR_RESOLVER as `0x${string}`;
  const isSupported = address.toLowerCase() !== ZERO_ADDRESS;
  const { data: range } = useReadContract({
    address,
    abi: CONTRACT_ABIS.REPAIR_RESOLVER as Abi,
    chainId,
    functionName: "range",
    query: { enabled: isSupported },
  });
  const { data: strength } = useReadContract({
    address,
    abi: CONTRACT_ABIS.REPAIR_RESOLVER as Abi,
    chainId,
    functionName: "strength",
    query: { enabled: isSupported },
  });
  return { range: range as number | undefined, strength: strength as number | undefined, isSupported };
}

/** Whichever resolver applies to `variant` (defaults to Ram/variant 1 for an unknown/undefined variant). */
export function useFactionAbilityConfig(variant: number | undefined) {
  const ram = useRamResolverConfig();
  const repair = useRepairResolverConfig();
  return useMemo(() => {
    if (variant === 2) {
      return { range: repair.range, strength: repair.strength, isSupported: repair.isSupported, isHeal: true };
    }
    return { range: ram.range, strength: undefined, isSupported: ram.isSupported, isHeal: false };
  }, [variant, ram.range, ram.isSupported, repair.range, repair.strength, repair.isSupported]);
}
