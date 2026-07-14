"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { Web2Ship } from "../types/web2Ship";
import { cacheShipsData } from "./useShipDataCacheWeb2";

// Web2-mode counterpart to `useOwnedShips.ts` — fetches the current user's
// ships from the Prisma-backed `/api/ships` route instead of an on-chain
// read. Deliberately named/typed distinctly from the web3 hook; see
// app/types/web2Ship.ts for why the two never share a type.

async function fetchAllShips(): Promise<Web2Ship[]> {
  const all: Web2Ship[] = [];
  let cursor: number | null = null;

  do {
    const url: string = `/api/ships${cursor ? `?cursor=${cursor}` : ""}`;
    const { ships, nextCursor }: { ships: Web2Ship[]; nextCursor: number | null } =
      await apiFetch<{ ships: Web2Ship[]; nextCursor: number | null }>(url);
    all.push(...ships);
    cursor = nextCursor;
  } while (cursor !== null);

  if (all.length > 0) cacheShipsData(all);
  return all;
}

export function useOwnedShipsWeb2() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ships", "owned", "web2"],
    queryFn: fetchAllShips,
    // Every purchase/construct/recycle/claim-free action already calls
    // `refetch()` on success (see ManageNavyWeb2.tsx) — this interval only
    // needs to catch changes from elsewhere (another tab/device), not
    // reflect your own actions, so it doesn't need to be this tight.
    refetchInterval: 20000,
  });

  const ships = data ?? [];
  return {
    ships,
    shipCount: ships.length,
    hasShips: ships.length > 0,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
