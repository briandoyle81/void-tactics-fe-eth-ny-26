"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { Web2Lobby } from "../types/web2Lobby";

// Web2-mode counterpart to `useLobbyList.ts` — fetches from the
// Prisma-backed `/api/lobbies` route instead of an on-chain read.

export function useLobbyListWeb2() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["lobbies", "web2"],
    queryFn: () => apiFetch<Web2Lobby[]>("/api/lobbies"),
    refetchInterval: 5000,
  });

  return {
    lobbies: data ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch: async () => {
      const result = await refetch();
      return result.data ?? [];
    },
  };
}
