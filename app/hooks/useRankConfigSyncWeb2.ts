import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/apiFetch";
import { setRankConfig } from "../utils/rankConfigCache";

type RankConfigResponse = Record<number, { rankThresholds: number[]; rankBonusPct: number[] }>;

// Web2 counterpart to useRankConfigSync.ts — keeps the shared rank-config
// cache warm from the DB-backed tables instead of an on-chain read. Mount
// once near the app root (see providers.tsx).
export function useRankConfigSyncWeb2(): void {
  const { data } = useQuery({
    queryKey: ["ship-rank-config"],
    queryFn: () => apiFetch<RankConfigResponse>("/api/ship-rank-config"),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data) return;
    for (const [variant, cfg] of Object.entries(data)) {
      setRankConfig(Number(variant), { thresholds: cfg.rankThresholds, bonusPct: cfg.rankBonusPct });
    }
  }, [data]);
}
