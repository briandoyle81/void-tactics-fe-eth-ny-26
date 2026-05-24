"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";

export interface PlayerStats {
  wins: bigint;
  losses: bigint;
  totalGames: bigint;
}

// address and chainId params are kept for call-site compatibility but ignored —
// the server uses the session to identify the player
export function usePlayerStats(_address?: string, _chainId?: number) {
  const { data } = useQuery({
    queryKey: ["user", "stats"],
    queryFn: () => apiFetch<PlayerStats>("/api/user/stats"),
    staleTime: 30_000,
  });
  return data;
}
