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
    // No interval here — every caller of this hook (GameDisplayWeb2.tsx)
    // always also uses useGameStreamWeb2 (SSE push + query invalidation)
    // and useGamePollingWeb2 (adaptive 30s/5min/1hr fallback scheduler that
    // calls this query's `refetch`), so a third independent flat-interval
    // poller on the exact same query was pure redundant DB load, not extra
    // coverage.
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
    // SSE (useGameStreamWeb2) also invalidates this query whenever a game
    // the player has open updates, but only while a specific game's detail
    // view is mounted — this interval is what keeps the list itself fresh
    // (e.g. an opponent's move in a game you're not currently viewing).
    // 20s (was 5s) is still prompt for a list that only changes on
    // discrete events (a move, a game starting/ending).
    refetchInterval: 20000,
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
