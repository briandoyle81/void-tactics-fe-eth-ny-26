"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/app/lib/apiFetch";
import { Attributes } from "../types/types";

export function useShipAttributesByIds(shipIds: number[]) {
  const ids = shipIds.map(String).join(",");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ships", "attributes", ids],
    queryFn: () => apiFetch<Record<string, Attributes>>(`/api/ships/attributes?ids=${ids}`),
    enabled: shipIds.length > 0,
    staleTime: 30_000,
  });

  const attributesMap = new Map<number, Attributes>(
    Object.entries(data ?? {}).map(([id, attrs]) => [Number(id), attrs])
  );

  return {
    attributesMap,
    isLoading,
    error,
    refetch,
  };
}
