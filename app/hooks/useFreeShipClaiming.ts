"use client";

import { useState, useCallback, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiMutate } from "@/app/lib/apiMutate";
import { toast } from "react-hot-toast";
import { useCurrentUser } from "./useCurrentUser";

interface ClaimStatus {
  eligible: boolean;
  nextClaimAt: number | null;
}

async function fetchClaimStatus(): Promise<ClaimStatus> {
  const res = await fetch("/api/ships/claim-free");
  if (!res.ok) throw new Error("Failed to fetch claim status");
  return res.json();
}

function formatTimeRemaining(nextClaimAt: number): string {
  const ms = nextClaimAt - Date.now();
  if (ms <= 0) return "";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function useFreeShipClaiming() {
  const queryClient = useQueryClient();
  const { userId } = useCurrentUser();

  const [isClaiming, setIsClaiming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data: claimStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["claim-free-status"],
    queryFn: fetchClaimStatus,
    enabled: !!userId,
    staleTime: 60_000,
  });

  const isEligible = !statusLoading && (claimStatus?.eligible ?? false);
  const hasClaimed = !statusLoading && !!claimStatus && !claimStatus.eligible;

  // Reset isConfirmed after claim when status refreshes
  useEffect(() => {
    if (isConfirmed && hasClaimed) setIsConfirmed(false);
  }, [isConfirmed, hasClaimed]);

  const claimFreeShips = useCallback(async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    setClaimError(null);
    try {
      await apiMutate("/api/ships/claim-free", "POST");
      toast.success("Free ships claimed!");
      setIsConfirmed(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ships"] }),
        queryClient.invalidateQueries({ queryKey: ["claim-free-status"] }),
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("already claimed")) {
        setIsConfirmed(true);
        await queryClient.invalidateQueries({ queryKey: ["claim-free-status"] });
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

  const nextClaimAt = claimStatus?.nextClaimAt ?? null;
  const secondsUntilNextClaim = nextClaimAt ? Math.ceil((nextClaimAt - Date.now()) / 1000) : null;
  const nextClaimInFormatted = nextClaimAt ? formatTimeRemaining(nextClaimAt) : null;

  return {
    claimFreeShips,
    checkEligibility,
    isEligible,
    hasClaimed,
    isClaiming,
    isPending: isClaiming,
    isConfirmed,
    isLoading: isClaiming,
    isLoadingClaimStatus: statusLoading,
    eligibilityChecked: !statusLoading,
    secondsUntilNextClaim,
    nextClaimInFormatted,
    cooldownSeconds: 28 * 24 * 60 * 60,
    error: claimError,
    claimStatusError: null as string | null,
  };
}
