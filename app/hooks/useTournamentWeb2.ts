"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import type { Web2TournamentDetail } from "../types/web2Tournament";

// Web2-mode counterpart to `useTournament.ts` — fetches config, registrants,
// and the full bracket from `/api/tournaments/[id]` instead of a batched
// on-chain read. No event subscriptions available without a chain, so this
// polls while mounted.
export function useTournamentWeb2(tournamentId: number | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tournament", "web2", tournamentId],
    queryFn: () => apiFetch<Web2TournamentDetail>(`/api/tournaments/${tournamentId}`),
    enabled: tournamentId !== null,
    // Tournament state only changes on discrete events (registration, a
    // match resolving) — 3s was far tighter than needed for that cadence.
    refetchInterval: 15000,
  });

  return {
    tournament: data ?? null,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
