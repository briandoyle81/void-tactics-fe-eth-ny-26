"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiMutate } from "../lib/apiMutate";
import { USER_BALANCE_QUERY_KEY } from "./useUserBalanceWeb2";

// Web2-mode counterpart to `useTournamentActions.ts` — player-facing writes
// against the Prisma-backed API instead of on-chain contract calls. No
// World ID proof to build/submit here — sybil resistance is entirely
// server-side (session + a unique DB constraint), so `register` just needs
// the tournament id.
export interface CreateTournamentParamsWeb2 {
  entryFee?: number;
  minPlayers: number;
  maxPlayers: number;
  registerBy: number; // ms epoch
  costLimit: number;
  turnTimeSeconds: number;
  selectedMapId?: number;
  maxScore: number;
}

export function useTournamentActionsWeb2() {
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    async (tournamentId?: number) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tournaments", "web2"] }),
        ...(tournamentId !== undefined
          ? [queryClient.invalidateQueries({ queryKey: ["tournament", "web2", tournamentId] })]
          : []),
      ]);
    },
    [queryClient],
  );

  const create = useCallback(
    async (params: CreateTournamentParamsWeb2) => {
      const result = await apiMutate<{ summary: { id: number } }>("/api/tournaments", "POST", params);
      await invalidate();
      return result;
    },
    [invalidate],
  );

  const register = useCallback(
    async (tournamentId: number) => {
      await apiMutate(`/api/tournaments/${tournamentId}/register`, "POST");
      await invalidate(tournamentId);
      // Registration deducts entryFee from creditBalance — refresh the header.
      queryClient.invalidateQueries({ queryKey: USER_BALANCE_QUERY_KEY });
    },
    [invalidate, queryClient],
  );

  const start = useCallback(
    async (tournamentId: number) => {
      await apiMutate(`/api/tournaments/${tournamentId}/start`, "POST");
      await invalidate(tournamentId);
    },
    [invalidate],
  );

  const cancel = useCallback(
    async (tournamentId: number) => {
      await apiMutate(`/api/tournaments/${tournamentId}/cancel`, "POST");
      await invalidate(tournamentId);
    },
    [invalidate],
  );

  return { create, register, start, cancel };
}
