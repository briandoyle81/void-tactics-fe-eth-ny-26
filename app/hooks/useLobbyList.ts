"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { Lobby } from "../types/types";

export function useLobbyList() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["lobbies"],
    queryFn: () => apiFetch<Lobby[]>("/api/lobbies"),
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
