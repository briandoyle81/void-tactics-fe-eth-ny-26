"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import type { Web2Tournament } from "../types/web2Tournament";

// Web2-mode counterpart to `useTournamentList.ts` — fetches from the
// Prisma-backed `/api/tournaments` route instead of an on-chain read.
export function useTournamentListWeb2() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tournaments", "web2"],
    queryFn: () => apiFetch<Web2Tournament[]>("/api/tournaments"),
    // Tournament list changes on discrete events (create/register/finalize),
    // not continuously — 20s (was 5s) is still prompt for that cadence.
    refetchInterval: 20000,
  });

  return {
    tournaments: data ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch: async () => {
      const result = await refetch();
      return result.data ?? [];
    },
  };
}
