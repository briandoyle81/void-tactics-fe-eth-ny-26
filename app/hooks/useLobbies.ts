"use client";

import { useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiMutate } from "@/app/lib/apiMutate";
import { useLobbyList } from "./useLobbyList";
import { toast } from "react-hot-toast";
import type { Lobby } from "../types/types";
import { useCurrentUser } from "./useCurrentUser";

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

interface PlayerLobbyState {
  kickCount: number;
  kickTimeoutUntil: string | null;
  lobbiesCreatedCount: number;
  freeGamesPerAddress: number;
  lobbyCreationCostUtc: number;
}

async function fetchPlayerState(): Promise<PlayerLobbyState> {
  const res = await fetch("/api/lobbies/player-state");
  if (!res.ok) throw new Error("Failed to fetch player lobby state");
  return res.json();
}

export function useLobbies() {
  const queryClient = useQueryClient();
  const { lobbies, isLoading, error, refetch } = useLobbyList();
  const { userId } = useCurrentUser();

  const { data: playerStateData } = useQuery({
    queryKey: ["lobby-player-state"],
    queryFn: fetchPlayerState,
    enabled: !!userId,
    staleTime: 30_000,
  });

  const invalidateLobbies = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lobbies"] }),
      queryClient.invalidateQueries({ queryKey: ["lobby-player-state"] }),
    ]);
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

  const createAiLobby = useCallback(async (params: {
    difficulty: string;
    costLimit?: number;
    maxScore?: number;
    mapId?: number;
  }): Promise<{ lobbyId: number }> => {
    const result = await apiMutate<{ lobbyId: number }>("/api/lobbies/vs-ai", "POST", params);
    await invalidateLobbies();
    return result;
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
    await apiMutate(`/api/lobbies/${lobbyId}/reject`, "POST");
    await invalidateLobbies();
  }, [invalidateLobbies]);

  const timeoutJoiner = useCallback(async (lobbyId: number) => {
    try {
      await apiMutate(`/api/lobbies/${lobbyId}/timeout-joiner`, "POST");
      await invalidateLobbies();
      toast.success("Joiner timed out. Lobby is open again.");
    } catch (err) {
      toast.error(`Timeout failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }, [invalidateLobbies]);

  const quitWithPenalty = useCallback(async (lobbyId: number) => {
    try {
      await apiMutate(`/api/lobbies/${lobbyId}/quit-with-penalty`, "POST");
      await invalidateLobbies();
      toast.success("Left lobby. Creator has been penalized.");
    } catch (err) {
      toast.error(`Quit failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }, [invalidateLobbies]);

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

  const freeGamesPerAddress = playerStateData?.freeGamesPerAddress ?? 1;
  const kickTimeoutUntilMs = playerStateData?.kickTimeoutUntil
    ? new Date(playerStateData.kickTimeoutUntil).getTime()
    : 0;

  const lobbyList: LobbyListState = { lobbies, isLoading, error };

  return {
    lobbyList,
    loadLobbies: refetch,
    createLobby,
    createAiLobby,
    joinLobby,
    leaveLobby,
    createFleet,
    acceptGame,
    rejectGame,
    timeoutJoiner,
    quitWithPenalty,
    timeoutGame,
    playerState: {
      kickCount: playerStateData?.kickCount ?? 0,
      kickTimeoutUntil: kickTimeoutUntilMs,
      hasActiveLobby: false,
      activeLobbiesCount: 0,
      activeLobbyId: 0,
      lastKickTime: kickTimeoutUntilMs,
    },
    lobbyCount: lobbies.length,
    freeGamesPerAddress,
    additionalLobbyFee: 0,
    paused: false,
    lastTransactionHash: undefined as `0x${string}` | undefined,
  };
}
