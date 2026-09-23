import { useEffect } from "react";
import { useVariantAttributes, VariantAttributeData } from "./useShipAttributesContract";
import { setRankConfig } from "../utils/rankConfigCache";

// Keeps the shared rank-config cache (rankConfigCache.ts) warm from the
// live on-chain tables — mount once near the app root (see providers.tsx),
// not per ship-display component. Only variants 1 and 2 are configured
// today (see useMaxVariant / "Base Sepolia only" scope); add another
// useVariantAttributes call here if a third variant ships.
export function useRankConfigSync(): void {
  const v1 = useVariantAttributes(1);
  const v2 = useVariantAttributes(2);

  useEffect(() => {
    const data = v1.data as VariantAttributeData | undefined;
    if (data) setRankConfig(1, { thresholds: data.rankThresholds, bonusPct: data.rankBonusPct });
  }, [v1.data]);

  useEffect(() => {
    const data = v2.data as VariantAttributeData | undefined;
    if (data) setRankConfig(2, { thresholds: data.rankThresholds, bonusPct: data.rankBonusPct });
  }, [v2.data]);
}
