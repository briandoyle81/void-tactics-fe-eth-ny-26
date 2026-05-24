"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { GameDataView } from "../types/types";

export function usePlayerGames() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["games", "player"],
    queryFn: () => apiFetch<GameDataView[]>("/api/games"),
    refetchInterval: 5000,
  });

  return {
    games: data ?? [],
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
