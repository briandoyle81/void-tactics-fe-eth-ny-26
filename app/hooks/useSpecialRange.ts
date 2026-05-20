import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { useSelectedChainId } from "./useSelectedChainId";

export function useSpecialRange(special: number) {
  const chainId = useSelectedChainId();
  const address = useMemo(
    () => getContractAddresses(chainId).SHIP_ATTRIBUTES as `0x${string}`,
    [chainId],
  );
  const args = useMemo(() => [special] as const, [special]);

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
