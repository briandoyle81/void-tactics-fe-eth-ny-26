"use client";

import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOwnedShips } from "./useOwnedShips";
import { apiMutate } from "@/app/lib/apiMutate";
import { toast } from "react-hot-toast";

export function useFreeShipClaiming() {
  const queryClient = useQueryClient();
  const { ships, isLoading: shipsLoading } = useOwnedShips();

  const [isClaiming, setIsClaiming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  // Eligible if user has no ships yet (server enforces cooldown)
  const isEligible = !shipsLoading && ships.length === 0;
  const hasClaimed = !shipsLoading && ships.length > 0;

  // Reset isConfirmed when ships load (i.e. after claim)
  useEffect(() => {
    if (isConfirmed && ships.length > 0) setIsConfirmed(false);
  }, [isConfirmed, ships.length]);

  const claimFreeShips = useCallback(async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    setClaimError(null);
    try {
      await apiMutate("/api/ships/claim-free", "POST");
      toast.success("Free ships claimed!");
      setIsConfirmed(true);
      await queryClient.invalidateQueries({ queryKey: ["ships"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("already claimed")) {
        setIsConfirmed(true);
      } else {
        setClaimError(msg);
        toast.error(`Failed to claim ships: ${msg}`);
      }
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, queryClient]);

  const checkEligibility = useCallback(async (): Promise<boolean> => {
    return isEligible;
  }, [isEligible]);

  return {
    claimFreeShips,
    checkEligibility,
    isEligible,
    hasClaimed,
    isClaiming,
    isPending: isClaiming,
    isConfirmed,
    isLoading: isClaiming,
    isLoadingClaimStatus: shipsLoading,
    eligibilityChecked: !shipsLoading,
    secondsUntilNextClaim: null as number | null,
    nextClaimInFormatted: null as string | null,
    cooldownSeconds: 28 * 24 * 60 * 60, // 28 days — matches server cooldown
    error: claimError,
    claimStatusError: null as string | null,
  };
}
