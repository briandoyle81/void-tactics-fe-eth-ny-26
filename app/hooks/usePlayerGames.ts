import { useAccount } from "wagmi";
import { baseSepolia } from "viem/chains";
import { useGetGamesForPlayer } from "./useGameContract";
import { GameDataView } from "../types/types";

const EMPTY_GAMES: GameDataView[] = [];

export function usePlayerGames(options?: { enabled?: boolean }) {
  const { address } = useAccount();

  // Pinned to Base Sepolia — Game is currently only deployed there while
  // multi-chain support is temporarily disabled (see networks.ts). Without
  // this, a wallet connected to a different chain (still selectable via
  // RainbowKit even though the in-app picker is locked to Base Sepolia)
  // silently queries the wrong chain's Game contract and returns no games,
  // including single-player/campaign games, which only ever exist here.
  // `useGetGamesForPlayer` already normalizes and keeps the previous list
  // identity when an idle refetch decoded the same matches.
  const {
    data: gamesData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetGamesForPlayer(address || "0x0", baseSepolia.id, {
    enabled: Boolean(address) && (options?.enabled ?? true),
  });

  const games = Array.isArray(gamesData)
    ? (gamesData as GameDataView[])
    : EMPTY_GAMES;

  return {
    games,
    isLoading,
    isFetching,
    error: error?.message ?? null,
    refetch,
  };
}
