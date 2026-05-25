"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "@/app/lib/apiMutate";
import { useLobbyList } from "./useLobbyList";
import { toast } from "react-hot-toast";
import type { Lobby } from "../types/types";

export interface CreateLobbyParams {
  costLimit?: number;
  turnTimeSeconds?: number;
  creatorGoesFirst?: boolean;
  selectedMapId?: number | null;
  maxScore?: number;
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
      costLimit:        params.costLimit ?? 0,
      turnTimeSeconds:  params.turnTimeSeconds ?? 120,
      creatorGoesFirst: params.creatorGoesFirst ?? true,
      selectedMapId:    params.selectedMapId ?? null,
      maxScore:         params.maxScore ?? 3,
    });
    await invalidateLobbies();
  }, [invalidateLobbies]);

  const joinLobby = useCallback(async (lobbyId: number) => {
    await apiMutate(`/api/lobbies/${lobbyId}/join`, "POST");
    await invalidateLobbies();
  }, [invalidateLobbies]);

  const leaveLobby = useCallback(async (lobbyId: number) => {
    await apiMutate(`/api/lobbies/${lobbyId}`, "DELETE");
    await invalidateLobbies();
  }, [invalidateLobbies]);

  const createFleet = useCallback(async (
    lobbyId: number,
    shipIds: number[],
    startingPositions: Array<{ row: number; col: number }>,
  ): Promise<{ id: number; totalCost: number; shipCount: number; gameId: number | null }> => {
    const result = await apiMutate<{ id: number; totalCost: number; shipCount: number; gameId: number | null }>(
      `/api/lobbies/${lobbyId}/fleet`, "POST", {
        shipIds: shipIds.map(Number),
        startingPositions,
      });
    await invalidateLobbies();
    await queryClient.invalidateQueries({ queryKey: ["ships"] });
    return result;
  }, [invalidateLobbies, queryClient]);

  const acceptGame = useCallback(async (lobbyId: number) => {
    const result = await apiMutate<{ gameId: number }>(`/api/lobbies/${lobbyId}/accept`, "POST");
    await invalidateLobbies();
    await queryClient.invalidateQueries({ queryKey: ["games"] });
    return result;
  }, [invalidateLobbies, queryClient]);

  const rejectGame = useCallback(async (lobbyId: number) => {
    await leaveLobby(lobbyId);
  }, [leaveLobby]);

  const timeoutGame = useCallback(async (gameId: number) => {
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
    playerState: { kickCount: 0, hasActiveLobby: false, activeLobbiesCount: 0, activeLobbyId: 0, lastKickTime: 0 },
    lobbyCount: lobbies.length,
    freeGamesPerAddress: 1,
    additionalLobbyFee: 0,
    paused: false,
    lastTransactionHash: undefined as `0x${string}` | undefined,
  };
}
