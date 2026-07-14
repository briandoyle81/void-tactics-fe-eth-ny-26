"use client";

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import type { Attributes } from "../types/types";

// Web2-mode counterpart to `useShipAttributesByIds` — same
// attributes/isLoading/error/refetch/isFromCache shape, backed by
// GET /api/ships/attributes instead of a contract read. React Query's own
// cache stands in for the manual localStorage cache web3 needs to avoid
// spamming the RPC provider (not a concern for a same-origin REST call).
// Returns a `Map` (not web3's positional array) since the REST response is
// already keyed by ship id — there's no "does array length match shipIds"
// alignment hazard to guard against here.
export function useShipAttributesByIdsWeb2(shipIds: number[]) {
  const idsKey = useMemo(() => [...shipIds].sort((a, b) => a - b).join(","), [shipIds]);
  const mountTimeRef = useRef(Date.now());

  const query = useQuery({
    queryKey: ["ships", "attributes", idsKey],
    queryFn: () => apiFetch<Record<string, Attributes>>(`/api/ships/attributes?ids=${idsKey}`),
    enabled: shipIds.length > 0,
    staleTime: 60_000,
  });

  const attributesByShipId = useMemo(() => {
    const map = new Map<number, Attributes>();
    if (!query.data) return map;
    for (const id of shipIds) {
      const attrs = query.data[String(id)];
      if (attrs) map.set(id, attrs);
    }
    return map;
  }, [query.data, shipIds]);

  const isFromCache =
    !query.isLoading &&
    query.dataUpdatedAt > 0 &&
    query.dataUpdatedAt < mountTimeRef.current;

  return {
    attributesByShipId,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFromCache,
  };
}
