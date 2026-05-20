import { useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { getSelectedChainId } from "../config/networks";
import { GameDataView } from "../types/types";

// Hook for reading contract data
export function useGameContract() {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  return {
    address: contractAddresses.GAME as `0x${string}`,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
  };
}

// Hook for reading contract data with proper typing
export function useGameRead(
  functionName: string,
  args?: readonly unknown[],
  options?: { query?: { enabled?: boolean } }
) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const address = useMemo(
    () => getContractAddresses(activeChainId).GAME as `0x${string}`,
    [activeChainId],
  );

  return useReadContract({
    address,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
    functionName,
    args,
    query: options?.query,
  });
}

// Hook for writing to contract with proper typing
export function useGameWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type GameReadFunction =
  | "gameCount"
  | "playerGames"
  | "getGame"
  | "getGamesFromIds"
  | "games";

// Specific hooks for common functions
export function useGameCount() {
  return useGameRead("gameCount");
}

export function useGetGamesForPlayer(playerAddress: string) {
  const args = useMemo(() => [playerAddress] as const, [playerAddress]);
  return useGameRead("getGamesForPlayer", args, {
    query: { enabled: !!playerAddress },
  });
}

export function useGetGame(gameId: number) {
  const args = useMemo(() => [BigInt(gameId)] as const, [gameId]);
  const result = useGameRead("getGame", args, {
    query: { enabled: gameId > 0 },
  });
  return { ...result, data: result.data as GameDataView | undefined };
}

export function useGetGamesFromIds(gameIds: number[]) {
  const args = useMemo(
    () => [gameIds.map((id) => BigInt(id))] as const,
    // gameIds reference must be stable at call sites for this memo to be effective
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameIds],
  );
  return useGameRead("getGamesFromIds", args, {
    query: { enabled: gameIds.length > 0 },
  });
}
