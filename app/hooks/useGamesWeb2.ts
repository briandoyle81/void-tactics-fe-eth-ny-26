"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "../lib/apiFetch";
import type { Web2GameDataView } from "../types/web2Game";

// Web2-mode parallel of `useGameContract.ts`'s read hooks — plain API calls,
// no wallet/contract involved. Exports mirror the web3 hook's names 1:1 for
// call-site parity, even where (like `useGetGamesForPlayer`) the argument is
// vestigial (the route infers the player from the session). All routes
// require a NextAuth session, so every query is gated on `authenticated` —
// otherwise these poll `/api/games*` on a timer for logged-out users too,
// hitting 401 forever (the web3 equivalent has the same gate, via
// `enabled: !!playerAddress`).

export function useGetGame(gameId: number) {
  const { status } = useSession();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["gamesWeb2", gameId],
    queryFn: () => apiFetch<Web2GameDataView>(`/api/games/${gameId}`),
    enabled: gameId > 0 && status === "authenticated",
    // SSE (useGameStreamWeb2) handles real-time push; this is a fallback safety-net poll
    refetchInterval: 15000,
    staleTime: 2000,
  });
  return { data, isLoading, error, refetch };
}

export function useGetGamesForPlayer() {
  const { status } = useSession();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["gamesWeb2", "player"],
    queryFn: () => apiFetch<Web2GameDataView[]>("/api/games"),
    enabled: status === "authenticated",
    refetchInterval: 5000,
  });
  return { data, isLoading, error, refetch };
}

export function useGetGamesFromIds(gameIds: number[]) {
  const { status } = useSession();
  const key = useMemo(() => gameIds.join(","), [gameIds]);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["gamesWeb2", "byIds", key],
    queryFn: () =>
      Promise.all(gameIds.map((id) => apiFetch<Web2GameDataView>(`/api/games/${id}`))),
    enabled: gameIds.length > 0 && status === "authenticated",
  });
  return { data, isLoading, error, refetch };
}
