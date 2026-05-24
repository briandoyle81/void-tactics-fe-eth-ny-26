"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./useCurrentUser";

export function useUtcBalance() {
  const { isLoggedIn } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["utc-balance"],
    queryFn: async () => {
      const res = await fetch("/api/user/utc");
      if (!res.ok) throw new Error("Failed to fetch UTC balance");
      const json = await res.json() as { balance: number };
      return json.balance;
    },
    enabled: isLoggedIn,
    staleTime: 30_000,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ["utc-balance"] });

  return { balance: data ?? 0, isLoading, refetch };
}
