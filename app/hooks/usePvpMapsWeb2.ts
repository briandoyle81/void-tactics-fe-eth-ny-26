"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "../lib/apiFetch";
import { MapMode } from "../types/types";

interface Web2MapListItem {
  id: number;
  name: string;
  mode: MapMode;
}

// Web2 counterpart to Lobbies.tsx's pvpEligibleMapIds/pvpMapOptions — the
// full preset map list filtered down to PvP-eligible maps (PvP or Both),
// same shared query key as MapsWeb2.tsx so the cache is reused rather than
// double-fetched.
export function usePvpMapsWeb2() {
  const { status } = useSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ["maps", "web2"],
    queryFn: () => apiFetch<Web2MapListItem[]>("/api/maps"),
    enabled: status === "authenticated",
  });

  const pvpEligibleMaps = useMemo(
    () => (data ?? []).filter((m) => m.mode !== MapMode.PvE),
    [data],
  );
  const pvpEligibleMapIds = useMemo(() => pvpEligibleMaps.map((m) => m.id), [pvpEligibleMaps]);
  const mapOptions = useMemo(
    () => pvpEligibleMaps.map((m) => ({ id: m.id, label: `Map #${m.id} — ${m.name}` })),
    [pvpEligibleMaps],
  );

  return { pvpEligibleMapIds, mapOptions, isLoading, error };
}
