import { useEffect } from "react";
import { ActionType } from "../types/types";

export function useRetreatModeCancellation({
  actionOverride,
  targetShipId,
  previewPosition,
  selectedShipId,
  setActionOverride,
  setRetreatExplicitByShipId,
}: {
  actionOverride: ActionType | null;
  targetShipId: bigint | null;
  previewPosition: { row: number; col: number } | null;
  selectedShipId: bigint | null;
  setActionOverride: (v: ActionType | null) => void;
  setRetreatExplicitByShipId: (
    fn: (prev: Record<string, true>) => Record<string, true>,
  ) => void;
}) {
  useEffect(() => {
    if (actionOverride !== ActionType.Retreat) return;
    if (targetShipId !== null || previewPosition !== null) {
      setActionOverride(null);
      if (selectedShipId != null) {
        const k = selectedShipId.toString();
        setRetreatExplicitByShipId((prev: Record<string, true>) => {
          if (!prev[k]) return prev;
          const next = { ...prev };
          delete next[k];
          return next;
        });
      }
    }
  }, [
    actionOverride,
    targetShipId,
    previewPosition,
    selectedShipId,
    setActionOverride,
    setRetreatExplicitByShipId,
  ]);
}
