import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { useSelectedChainId } from "./useSelectedChainId";

// `getSpecialRange` takes a `_variant` argument (ship traits.variant) as of
// the contract redeploy that added per-variant special stats — omitting it
// throws an ABI encoding length mismatch and silently leaves specialRange
// undefined, which callers then fall back to the ship's gun range for
// (wrong shooting range whenever a special is the selected weapon).
export function useSpecialRange(special: number, variant: number = 0) {
  const chainId = useSelectedChainId();
  const address = useMemo(
    () => getContractAddresses(chainId).SHIP_ATTRIBUTES as `0x${string}`,
    [chainId],
  );
  const args = useMemo(() => [special, variant] as const, [special, variant]);

  const {
    data: specialRange,
    isLoading,
    error,
  } = useReadContract({
    address,
    abi: CONTRACT_ABIS.SHIP_ATTRIBUTES as Abi,
    functionName: "getSpecialRange",
    args,
    query: {
      enabled: special > 0,
    },
  });

  return {
    specialRange: specialRange as number | undefined,
    isLoading,
    error,
  };
}
