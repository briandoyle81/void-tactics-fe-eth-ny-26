"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "@/app/lib/apiMutate";
import { useLobbyList } from "./useLobbyList";
import { toast } from "react-hot-toast";
import type { Lobby } from "../types/types";

export interface CreateLobbyParams {
  costLimit?: number | bigint;
  turnTimeSeconds?: number | bigint;
  creatorGoesFirst?: boolean;
  selectedMapId?: number | bigint | null;
  maxScore?: number | bigint;
  activeLobbiesCount?: number;
}

export interface LobbyListState {
  lobbies: Lobby[];
  isLoading: boolean;
  error: string | null;
}

export function useLobbies() {
  const queryClient = useQueryClient();
  const { lobbies, isLoading, error, refetch } = useLobbyList();

  const invalidateLobbies = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["lobbies"] });
  }, [queryClient]);

  const createLobby = useCallback(async (params: CreateLobbyParams) => {
    await apiMutate("/api/lobbies", "POST", {
      costLimit:       Number(params.costLimit ?? 0),
      turnTimeSeconds: Number(params.turnTimeSeconds ?? 120),
      creatorGoesFirst: params.creatorGoesFirst ?? true,
      selectedMapId:   params.selectedMapId ? Number(params.selectedMapId) : null,
      maxScore:        Number(params.maxScore ?? 3),
    });
    await invalidateLobbies();
  }, [invalidateLobbies]);

  const joinLobby = useCallback(async (lobbyId: bigint) => {
    await apiMutate(`/api/lobbies/${lobbyId}/join`, "POST");
    await invalidateLobbies();
  }, [invalidateLobbies]);

  const leaveLobby = useCallback(async (lobbyId: bigint) => {
    await apiMutate(`/api/lobbies/${lobbyId}`, "DELETE");
    await invalidateLobbies();
  }, [invalidateLobbies]);

  const createFleet = useCallback(async (
    lobbyId: bigint,
    shipIds: bigint[],
    startingPositions: Array<{ row: number; col: number }>,
  ) => {
    await apiMutate(`/api/lobbies/${lobbyId}/fleet`, "POST", {
      shipIds: shipIds.map(Number),
      startingPositions,
    });
    await invalidateLobbies();
    await queryClient.invalidateQueries({ queryKey: ["ships"] });
  }, [invalidateLobbies, queryClient]);

  const acceptGame = useCallback(async (lobbyId: bigint) => {
    const result = await apiMutate<{ gameId: number }>(`/api/lobbies/${lobbyId}/accept`, "POST");
    await invalidateLobbies();
    await queryClient.invalidateQueries({ queryKey: ["games"] });
    return result;
  }, [invalidateLobbies, queryClient]);

  const rejectGame = useCallback(async (lobbyId: bigint) => {
    await leaveLobby(lobbyId);
  }, [leaveLobby]);

  const timeoutGame = useCallback(async (gameId: bigint) => {
    try {
      await apiMutate(`/api/games/${gameId}/timeout`, "POST");
      await queryClient.invalidateQueries({ queryKey: ["games"] });
      toast.success("Game ended by timeout.");
    } catch (err) {
      toast.error(`Timeout failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }, [queryClient]);

  const lobbyList: LobbyListState = { lobbies, isLoading, error };

  return {
    lobbyList,
    loadLobbies: refetch,
    createLobby,
    joinLobby,
    leaveLobby,
    createFleet,
    acceptGame,
    rejectGame,
    timeoutGame,
    // Shims for Lobbies.tsx call-site compat
    playerState: { kickCount: 0n, hasActiveLobby: false, activeLobbiesCount: 0n, activeLobbyId: 0n, lastKickTime: 0n },
    lobbyCount: BigInt(lobbies.length),
    freeGamesPerAddress: 1n,
    additionalLobbyFee: 0n,
    paused: false,
    lastTransactionHash: undefined as `0x${string}` | undefined,
  };
}
