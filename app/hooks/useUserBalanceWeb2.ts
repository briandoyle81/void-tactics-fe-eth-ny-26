"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { useCurrentUser } from "./useCurrentUser";

export const USER_BALANCE_QUERY_KEY = ["user", "me", "balance"] as const;

// Web2-mode counterpart to reading a connected wallet's native-token balance
// (see Header.tsx's "Flow Balance" widget) — the signed-in user's UTC
// balance, backed by GET /api/user/me. Polls every 30s so UTC earned/spent
// by background flows (kills, tournament payouts) eventually shows up even
// without an explicit refetch from the flow that changed it.
export function useUserBalanceWeb2() {
  const { isLoggedIn } = useCurrentUser();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: USER_BALANCE_QUERY_KEY,
    queryFn: () => apiFetch<{ creditBalance: number }>("/api/user/me"),
    enabled: isLoggedIn,
    refetchInterval: 30_000,
  });

  return {
    creditBalance: data?.creditBalance ?? 0,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

/** Call after any action that spends/earns UTC so the header updates immediately. */
export function useInvalidateUserBalanceWeb2() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: USER_BALANCE_QUERY_KEY });
}
