import { useMemo } from "react";
import { useReadContract, useWriteContract } from "wagmi";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import type { Abi } from "viem";
import { Lobby, PlayerLobbyState, PlayerLobbyStateTuple, tupleToPlayerLobbyState } from "../types/types";
import { useSelectedChainId } from "./useSelectedChainId";

/** Lobbies contract target for the in-app network picker (reads and intended writes). */
export function useLobbiesChainParams() {
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  return {
    address: contractAddresses.LOBBIES as `0x${string}`,
    abi: CONTRACT_ABIS.LOBBIES as Abi,
    chainId: activeChainId,
  } as const;
}

// Hook for reading contract data
export function useLobbiesContract() {
  return useLobbiesChainParams();
}

// Hook for reading contract data with proper typing
export function useLobbiesRead(
  functionName: string,
  args?: readonly unknown[],
  options?: { query?: { enabled?: boolean } }
) {
  const { address, abi, chainId } = useLobbiesChainParams();
  return useReadContract({
    address,
    abi,
    chainId,
    functionName,
    args,
    query: options?.query,
  });
}

// Hook for writing to contract with proper typing
export function useLobbiesWrite() {
  return useWriteContract();
}

// Type-safe contract function names
export type LobbiesReadFunction =
  | "getLobby"
  | "getPlayerState"
  | "getPlayerTimeoutEnd"
  | "isLobbyOpenForJoining"
  | "lobbyCount"
  | "freeGamesPerAddress"
  | "additionalLobbyFee"
  | "paused";

export type LobbiesWriteFunction =
  | "createLobby"
  | "joinLobby"
  | "leaveLobby"
  | "timeoutJoiner"
  | "createFleet"
  | "quitWithPenalty"
  | "acceptGame"
  | "rejectGame";

// Helper hooks for common operations
export function useLobby(
  lobbyId: bigint,
  options?: { enabled?: boolean }
) {
  const args = useMemo(() => [lobbyId] as const, [lobbyId]);
  const { data, error, isLoading, refetch } = useLobbiesRead(
    "getLobby",
    args,
    { query: { enabled: options?.enabled ?? true } }
  );

  return {
    // The contract returns the Lobby struct directly (same shape as `Lobby`).
    lobby: (data as Lobby | undefined) ?? undefined,
    error,
    isLoading,
    refetch,
  };
}

export function usePlayerLobbyState(playerAddress: string) {
  const args = useMemo(() => [playerAddress] as const, [playerAddress]);
  const { data, error, isLoading, refetch } = useLobbiesRead("getPlayerState", args);

  return {
    playerState: data
      ? tupleToPlayerLobbyState(data as PlayerLobbyStateTuple)
      : undefined,
    error,
    isLoading,
    refetch,
  };
}

export function useLobbyCount() {
  return useLobbiesRead("lobbyCount");
}

export function useLobbySettings() {
  const freeGames = useLobbiesRead("freeGamesPerAddress");
  const additionalFee = useLobbiesRead("additionalLobbyFee");
  const paused = useLobbiesRead("paused");

  return {
    freeGamesPerAddress: freeGames.data,
    additionalLobbyFee: additionalFee.data,
    paused: paused.data,
    isLoading:
      freeGames.isLoading || additionalFee.isLoading || paused.isLoading,
    error: freeGames.error || additionalFee.error || paused.error,
  };
}

export function useIsLobbyOpenForJoining(lobbyId: bigint) {
  const args = useMemo(() => [lobbyId] as const, [lobbyId]);
  return useLobbiesRead("isLobbyOpenForJoining", args);
}
