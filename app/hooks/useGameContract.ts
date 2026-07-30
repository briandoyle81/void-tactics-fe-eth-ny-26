import { useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import {
  CONTRACT_ABIS,
  CONTRACT_ADDRESSES_BY_CHAIN_ID,
  getContractAddresses,
} from "../config/contracts";
import type { Abi } from "viem";
import { getSelectedChainId } from "../config/networks";
import { GameDataView } from "../types/types";
import { normalizeGameDataView } from "../utils/normalizeGameDataView";

// Hook for reading contract data
// `chainIdOverride` pins to a specific chain instead of following the wallet
// or header network picker — needed anywhere a game is known to live on a
// specific chain (currently: everywhere, since Game is Base-Sepolia-only
// while multi-chain support is temporarily disabled — see networks.ts).
export function useGameContract(chainIdOverride?: number) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = chainIdOverride ?? walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  return {
    address: contractAddresses.GAME as `0x${string}`,
    abi: CONTRACT_ABIS.GAME as Abi,
    chainId: activeChainId,
  };
}

// `flee`/`endGameOnTimeout` moved off Game onto PvPMatch (the PvP-specific
// game orchestrator). PvPMatch is only deployed on Base Sepolia today, same
// as SinglePlayerMatch/AIEncounters — pin to that chain directly rather than
// going through the chain-generic address map (matches useTournamentAdmin.ts).
export function usePvPMatchContract() {
  return {
    address: CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
      .PVP_MATCH as `0x${string}`,
    abi: CONTRACT_ABIS.PVP_MATCH as Abi,
    chainId: baseSepolia.id,
  };
}

// Hook for reading contract data with proper typing
// `chainIdOverride` — see useGameContract above.
export function useGameRead(
  functionName: string,
  args?: readonly unknown[],
  options?: { query?: { enabled?: boolean } },
  chainIdOverride?: number,
) {
  const { chainId: walletChainId } = useAccount();
  const activeChainId = chainIdOverride ?? walletChainId ?? getSelectedChainId();
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

export function useGetGamesForPlayer(playerAddress: string, chainIdOverride?: number) {
  const args = useMemo(() => [playerAddress] as const, [playerAddress]);
  return useGameRead(
    "getGamesForPlayer",
    args,
    { query: { enabled: !!playerAddress } },
    chainIdOverride,
  );
}

export function useGetGame(gameId: number, chainIdOverride?: number) {
  const args = useMemo(() => [BigInt(gameId)] as const, [gameId]);
  const result = useGameRead(
    "getGame",
    args,
    { query: { enabled: gameId > 0 } },
    chainIdOverride,
  );
  const data = useMemo(
    () =>
      result.data
        ? normalizeGameDataView(result.data as GameDataView)
        : undefined,
    [result.data],
  );
  return { ...result, data };
}

export function useGetGamesFromIds(gameIds: number[], chainIdOverride?: number) {
  const args = useMemo(
    () => [gameIds.map((id) => BigInt(id))] as const,
    // gameIds reference must be stable at call sites for this memo to be effective
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameIds],
  );
  const result = useGameRead(
    "getGamesFromIds",
    args,
    { query: { enabled: gameIds.length > 0 } },
    chainIdOverride,
  );
  const data = useMemo(
    () =>
      (result.data as GameDataView[] | undefined)?.map(normalizeGameDataView),
    [result.data],
  );
  return { ...result, data };
}
