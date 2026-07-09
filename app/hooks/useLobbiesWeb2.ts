"use client";

import { useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiMutate } from "../lib/apiMutate";
import { useLobbyListWeb2 } from "./useLobbyListWeb2";
import { toast } from "react-hot-toast";
import type { Web2Lobby } from "../types/web2Lobby";
import { useCurrentUser } from "./useCurrentUser";

// Web2-mode counterpart to `useLobbies.ts`. Deliberately excludes:
// - `createAiLobby` — AI opponent was eliminated, never ported (see
//   docs/merge-explore-traditional-plan.md Stage 2).
// - `timeoutGame` — calls `/api/games/[id]/timeout`, which belongs to the
//   not-yet-built games subsystem.

export interface CreateLobbyParams {
  costLimit?: number;
  turnTimeSeconds?: number;
  creatorGoesFirst?: boolean;
  selectedMapId?: number | null;
  maxScore?: number;
}

export interface LobbyListStateWeb2 {
  lobbies: Web2Lobby[];
  isLoading: boolean;
  error: string | null;
}

interface PlayerLobbyStateWeb2 {
  kickCount: number;
  kickTimeoutUntil: string | null;
  lobbiesCreatedCount: number;
  freeGamesPerAddress: number;
  lobbyCreationCostUtc: number;
}

async function fetchPlayerState(): Promise<PlayerLobbyStateWeb2> {
  const res = await fetch("/api/lobbies/player-state");
  if (!res.ok) throw new Error("Failed to fetch player lobby state");
  return res.json();
}

export function useLobbiesWeb2() {
  const queryClient = useQueryClient();
  const { lobbies, isLoading, error, refetch } = useLobbyListWeb2();
  const { userId } = useCurrentUser();

  const { data: playerStateData } = useQuery({
    queryKey: ["lobby-player-state", "web2"],
    queryFn: fetchPlayerState,
    enabled: !!userId,
    staleTime: 30_000,
  });

  const invalidateLobbies = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lobbies", "web2"] }),
      queryClient.invalidateQueries({ queryKey: ["lobby-player-state", "web2"] }),
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
    startingPositions?: Array<{ row: number; col: number }>,
  ): Promise<{ id: number; totalCost: number; shipCount: number; gameId: number | null }> => {
    const result = await apiMutate<{ id: number; totalCost: number; shipCount: number; gameId: number | null }>(
      `/api/lobbies/${lobbyId}/fleet`, "POST", {
        shipIds: shipIds.map(Number),
        startingPositions: startingPositions ?? null,
      });
    await invalidateLobbies();
    await queryClient.invalidateQueries({ queryKey: ["ships", "owned", "web2"] });
    return result;
  }, [invalidateLobbies, queryClient]);

  const acceptGame = useCallback(async (lobbyId: number) => {
    const result = await apiMutate<{ gameId: number }>(`/api/lobbies/${lobbyId}/accept`, "POST");
    await invalidateLobbies();
    return result;
  }, [invalidateLobbies]);

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

  const freeGamesPerAddress = playerStateData?.freeGamesPerAddress ?? 1;
  const lobbyCreationCostUtc = playerStateData?.lobbyCreationCostUtc ?? 0;
  const kickTimeoutUntilMs = playerStateData?.kickTimeoutUntil
    ? new Date(playerStateData.kickTimeoutUntil).getTime()
    : 0;

  const lobbyList: LobbyListStateWeb2 = { lobbies, isLoading, error };

  return {
    lobbyList,
    loadLobbies: refetch,
    createLobby,
    joinLobby,
    leaveLobby,
    createFleet,
    acceptGame,
    rejectGame,
    timeoutJoiner,
    quitWithPenalty,
    playerState: {
      kickCount: playerStateData?.kickCount ?? 0,
      kickTimeoutUntil: kickTimeoutUntilMs,
      lobbiesCreatedCount: playerStateData?.lobbiesCreatedCount ?? 0,
    },
    lobbyCount: lobbies.length,
    freeGamesPerAddress,
    lobbyCreationCostUtc,
  };
}
