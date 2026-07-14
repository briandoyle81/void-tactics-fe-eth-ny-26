"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";

// Web2-mode counterpart to `usePlayerStats(address, chainId)` — a player's
// win/loss record, backed by GET /api/user/[id]/stats instead of an
// on-chain read.
export function usePlayerStatsWeb2(userId: string | null) {
  const { data } = useQuery({
    queryKey: ["user", "stats", userId],
    queryFn: () => apiFetch<{ wins: number; losses: number }>(`/api/user/${userId}/stats`),
    enabled: userId != null && userId !== "",
    staleTime: 30_000,
  });

  return data ?? null;
}
