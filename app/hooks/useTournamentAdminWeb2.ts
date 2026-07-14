"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "../lib/apiMutate";

// Web2-mode counterpart to `useTournamentAdmin.ts` — creator-only writes.
// `createMatchLobby` is a single API call (unlike web3's 3-step orchestration
// across two contracts) since the server does the Lobby-creation +
// match-linking atomically in one route.
export function useTournamentAdminWeb2() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    async (tournamentId: number) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tournaments", "web2"] }),
        queryClient.invalidateQueries({ queryKey: ["tournament", "web2", tournamentId] }),
      ]);
    },
    [queryClient],
  );

  const createMatchLobby = useCallback(
    async (tournamentId: number, matchId: number) => {
      const result = await apiMutate<{ lobbyId: number }>(
        `/api/tournaments/${tournamentId}/matches/${matchId}/create-lobby`,
        "POST",
      );
      await invalidate(tournamentId);
      return result;
    },
    [invalidate],
  );

  const resolveMatch = useCallback(
    async (tournamentId: number, matchId: number, winnerId: string) => {
      await apiMutate(`/api/tournaments/${tournamentId}/matches/${matchId}/resolve`, "POST", { winnerId });
      await invalidate(tournamentId);
    },
    [invalidate],
  );

  const finalize = useCallback(
    async (tournamentId: number) => {
      const result = await apiMutate<{ championId: string; runnerUpId: string | null }>(
        `/api/tournaments/${tournamentId}/finalize`,
        "POST",
      );
      await invalidate(tournamentId);
      return result;
    },
    [invalidate],
  );

  return { createMatchLobby, resolveMatch, finalize };
}
