"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";

// Web2-mode counterpart to reading the Ships contract's
// `amountPurchased`/`recycleReward` in ManageNavy.tsx — the same
// purchase-count recycle gate, backed by GET /api/ships/recycle-eligibility.
interface RecycleEligibility {
  purchasedShipCount: number;
  threshold: number;
  rewardUtc: number;
  canRecycle: boolean;
}

export function useRecycleEligibilityWeb2() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["ships", "recycle-eligibility", "web2"],
    queryFn: () => apiFetch<RecycleEligibility>("/api/ships/recycle-eligibility"),
  });

  return {
    purchasedShipCount: data?.purchasedShipCount ?? 0,
    threshold: data?.threshold ?? 10,
    rewardUtc: data?.rewardUtc ?? 0,
    canRecycle: data?.canRecycle ?? false,
    isLoading,
    refetch,
  };
}
