"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { formatTimeUntil } from "./useFreeShipClaiming";

// Web2-mode counterpart to `useFreeShipClaiming`'s eligibility/cooldown
// half (the claim action itself is a plain REST POST — see
// ManageNavyWeb2.tsx's `handleClaimFree`) — backed by
// GET /api/ships/claim-free instead of a contract read.
interface ClaimFreeEligibility {
  eligible: boolean;
  nextClaimAt: number | null;
}

export function useClaimFreeEligibilityWeb2() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ships", "claim-free-eligibility", "web2"],
    queryFn: () => apiFetch<ClaimFreeEligibility>("/api/ships/claim-free"),
    refetchInterval: 60_000,
  });

  const secondsUntilNextClaim =
    data?.nextClaimAt != null ? Math.max(0, Math.round((data.nextClaimAt - Date.now()) / 1000)) : null;

  return {
    isEligible: data?.eligible ?? false,
    isLoadingClaimStatus: isLoading,
    claimStatusError: error instanceof Error ? error.message : null,
    nextClaimInFormatted:
      secondsUntilNextClaim != null && secondsUntilNextClaim > 0
        ? formatTimeUntil(secondsUntilNextClaim)
        : null,
    refetch,
  };
}
