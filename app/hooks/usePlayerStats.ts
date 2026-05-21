import { useMemo } from "react";
import { useReadContract } from "wagmi";
import type { Abi } from "viem";
import GameResultsContract from "../contracts/DeployModule#GameResults.json";
import { DEPLOYED_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";

const GAME_RESULTS_ABI = GameResultsContract.abi as Abi;

export interface PlayerStats {
  wins: bigint;
  losses: bigint;
  totalGames: bigint;
}

export function usePlayerStats(
  playerAddress: `0x${string}` | undefined,
  chainId: number,
) {
  const contractAddress = useMemo(() => {
    const addrs =
      DEPLOYED_ADDRESSES_BY_CHAIN_ID[
        chainId as keyof typeof DEPLOYED_ADDRESSES_BY_CHAIN_ID
      ];
    return (addrs?.["DeployModule#GameResults"] as `0x${string}`) ?? undefined;
  }, [chainId]);

  const config = useMemo(
    () => ({
      address: contractAddress ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`),
      abi: GAME_RESULTS_ABI,
      functionName: "getPlayerStats" as const,
      args: [playerAddress ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`)] as [`0x${string}`],
      chainId,
      query: { enabled: !!contractAddress && !!playerAddress },
    }),
    [contractAddress, playerAddress, chainId],
  );

  const { data } = useReadContract(config);
  return data as PlayerStats | undefined;
}
