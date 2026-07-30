"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "../lib/apiFetch";

/** Web2 counterpart to useAIEncounterMaps.ts — map ids with AI content configured. */
export function useAIEncounterMapsWeb2() {
  const { status } = useSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai-encounter-maps", "web2"],
    queryFn: () => apiFetch<number[]>("/api/lobbies/vs-ai/maps"),
    enabled: status === "authenticated",
    staleTime: 60_000,
  });

  return { mapIds: data ?? [], isLoading, error };
}
