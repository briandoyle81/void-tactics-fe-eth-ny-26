import { useAccount, usePublicClient } from "wagmi";
import { getLegacyGasPriceOverridesForWrite } from "../utils/legacyGasPriceForWrite";
import type { Address } from "viem";
import {
  useLobbiesWrite,
  useLobbiesChainParams,
  useLobbyCount,
  usePlayerLobbyState,
  useLobbySettings,
} from "./useLobbiesContract";
import { useLobbyList } from "./useLobbyList";
import { Lobby } from "../types/types";
import { useSwitchToSelectedChainIfNeeded } from "./useSwitchToSelectedChainIfNeeded";

export interface CreateLobbyParams {
  costLimit: bigint;
  turnTime: bigint;
  creatorGoesFirst: boolean;
  selectedMapId: bigint;
  maxScore: bigint;
  reservedJoiner?: Address; // Optional: address to reserve for (address(0) for open lobby)
}

export interface LobbyListState {
  lobbies: Lobby[];
  isLoading: boolean;
  error: string | null;
}

export function useLobbies() {
  const { address } = useAccount();
  const lobbiesRpc = useLobbiesChainParams();
  const publicClient = usePublicClient({ chainId: lobbiesRpc.chainId });
  const switchToSelectedChainIfNeeded = useSwitchToSelectedChainIfNeeded();
  const { writeContract, data: hash } = useLobbiesWrite();
  const { data: lobbyCount } = useLobbyCount();
  const { playerState } = usePlayerLobbyState(address || "");
  const { freeGamesPerAddress, additionalLobbyFee, paused } =
    useLobbySettings();

  // Use the new lobby list hook
  const {
    lobbies,
    isLoading: lobbiesLoading,
    error: lobbiesError,
    refetch: loadLobbies,
  } = useLobbyList();

  const lobbyList: LobbyListState = {
    lobbies,
    isLoading: lobbiesLoading,
    error: lobbiesError,
  };

  // Create a new lobby
  const createLobby = async (
    params: CreateLobbyParams & { activeLobbiesCount?: number }
  ) => {
    if (!address) throw new Error("No wallet connected");
    if (paused) throw new Error("Lobby creation is currently paused");

    try {
      // Check if player needs to pay for additional lobbies
      // Use passed activeLobbiesCount if available, otherwise fall back to blockchain data
      const currentActiveLobbies =
        params.activeLobbiesCount ??
        (playerState?.activeLobbiesCount
          ? Number(playerState.activeLobbiesCount)
          : 0);
      const needsPayment =
        currentActiveLobbies >= Number(freeGamesPerAddress || 0n);

      const value: bigint = needsPayment
        ? (additionalLobbyFee as bigint) || 0n
        : 0n;

      await switchToSelectedChainIfNeeded();
      await writeContract({
        ...lobbiesRpc,
        ...(await getLegacyGasPriceOverridesForWrite(
          lobbiesRpc.chainId,
          publicClient,
        )),
        functionName: "createLobby",
        args: [
          params.costLimit,
          params.turnTime,
          params.creatorGoesFirst,
          params.selectedMapId,
          params.maxScore,
          params.reservedJoiner || "0x0000000000000000000000000000000000000000", // Use zero address if not specified
        ],
        value,
      });

    } catch (error) {
      console.error("Failed to create lobby:", error);
      throw error;
    }
  };

  // Join an existing lobby
  const joinLobby = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await switchToSelectedChainIfNeeded();
      await writeContract({
        ...lobbiesRpc,
        ...(await getLegacyGasPriceOverridesForWrite(
          lobbiesRpc.chainId,
          publicClient,
        )),
        functionName: "joinLobby",
        args: [lobbyId],
      });

    } catch (error) {
      console.error("Failed to join lobby:", error);
      throw error;
    }
  };

  // Leave a lobby
  const leaveLobby = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await switchToSelectedChainIfNeeded();
      await writeContract({
        ...lobbiesRpc,
        ...(await getLegacyGasPriceOverridesForWrite(
          lobbiesRpc.chainId,
          publicClient,
        )),
        functionName: "leaveLobby",
        args: [lobbyId],
      });
    } catch (error) {
      console.error("Failed to leave lobby:", error);
      throw error;
    }
  };

  // Timeout a joiner
  const timeoutJoiner = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await switchToSelectedChainIfNeeded();
      await writeContract({
        ...lobbiesRpc,
        ...(await getLegacyGasPriceOverridesForWrite(
          lobbiesRpc.chainId,
          publicClient,
        )),
        functionName: "timeoutJoiner",
        args: [lobbyId],
      });
    } catch (error) {
      console.error("Failed to timeout joiner:", error);
      throw error;
    }
  };

  // Create a fleet for a lobby
  const createFleet = async (
    lobbyId: bigint,
    shipIds: bigint[],
    startingPositions: Array<{ row: number; col: number }>
  ): Promise<void> => {
    if (!address) throw new Error("No wallet connected");

    try {
      await switchToSelectedChainIfNeeded();
      await writeContract({
        ...lobbiesRpc,
        ...(await getLegacyGasPriceOverridesForWrite(
          lobbiesRpc.chainId,
          publicClient,
        )),
        functionName: "createFleet",
        args: [lobbyId, shipIds, startingPositions],
      });
      // Transaction submitted successfully
    } catch (error) {
      console.error("Failed to create fleet:", error);
      throw error;
    }
  };

  // Quit with penalty
  const quitWithPenalty = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await switchToSelectedChainIfNeeded();
      await writeContract({
        ...lobbiesRpc,
        ...(await getLegacyGasPriceOverridesForWrite(
          lobbiesRpc.chainId,
          publicClient,
        )),
        functionName: "quitWithPenalty",
        args: [lobbyId],
      });
    } catch (error) {
      console.error("Failed to quit with penalty:", error);
      throw error;
    }
  };

  // Accept a reserved game
  const acceptGame = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await switchToSelectedChainIfNeeded();
      await writeContract({
        ...lobbiesRpc,
        ...(await getLegacyGasPriceOverridesForWrite(
          lobbiesRpc.chainId,
          publicClient,
        )),
        functionName: "acceptGame",
        args: [lobbyId],
      });

    } catch (error) {
      console.error("Failed to accept game:", error);
      throw error;
    }
  };

  // Reject a reserved game
  const rejectGame = async (lobbyId: bigint) => {
    if (!address) throw new Error("No wallet connected");

    try {
      await switchToSelectedChainIfNeeded();
      await writeContract({
        ...lobbiesRpc,
        ...(await getLegacyGasPriceOverridesForWrite(
          lobbiesRpc.chainId,
          publicClient,
        )),
        functionName: "rejectGame",
        args: [lobbyId],
      });

    } catch (error) {
      console.error("Failed to reject game:", error);
      throw error;
    }
  };

  return {
    // State
    lobbyList,
    playerState,
    lobbyCount,
    freeGamesPerAddress,
    additionalLobbyFee,
    paused,

    // Actions
    createLobby,
    joinLobby,
    leaveLobby,
    timeoutJoiner,
    createFleet,
    quitWithPenalty,
    acceptGame,
    rejectGame,
    loadLobbies,

    // Transaction hash for waiting on receipt
    lastTransactionHash: hash,

    // Computed values
    canCreateLobby: !paused && address !== undefined,
    needsPaymentForLobby: playerState
      ? Number(playerState.activeLobbiesCount) >=
        Number(freeGamesPerAddress || 0n)
      : false,
  };
}
