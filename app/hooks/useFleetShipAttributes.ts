"use client";

import { useMemo } from "react";
import { useShipAttributesByIds } from "./useShipAttributesByIds";
import type { Attributes } from "../types/types";

// Shared "attributes for a ship-id list, keyed by id, with a single
// loading/aligned flag" computation — previously duplicated between
// Lobbies.tsx and NodeMatchModal.tsx (each built its own attributesMap +
// attributesAligned + effective-loading logic around the same underlying
// useShipAttributesByIds call). See feedback_no_parallel_components memory.
export function useFleetShipAttributes(shipIds: bigint[], chainIdOverride?: number) {
  const {
    attributes,
    isLoading,
    isFromCache,
    error,
    refetch,
  } = useShipAttributesByIds(shipIds, chainIdOverride);

  const aligned = shipIds.length === 0 || attributes.length === shipIds.length;

  const attributesMap = useMemo(() => {
    const map = new Map<bigint, Attributes>();
    if (!aligned) return map;
    shipIds.forEach((id, i) => {
      if (attributes[i]) map.set(id, attributes[i]);
    });
    return map;
  }, [shipIds, attributes, aligned]);

  return {
    attributes,
    attributesMap,
    attributesLoading: isLoading || !aligned,
    isFromCache,
    error,
    refetch,
  };
}
