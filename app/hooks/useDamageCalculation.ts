import { useCallback } from "react";
import { Attributes } from "../types/types";
import { calculateDamage, SpecialLike } from "../utils/calculateDamage";

export function useDamageCalculation({
  selectedShipId,
  getShipAttributes,
  selectedWeaponType,
  specialData,
  specialType,
}: {
  selectedShipId: number | null;
  getShipAttributes: (id: number) => Attributes | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialData: unknown;
  specialType: number;
}) {
  return useCallback(
    (
      targetShipId: number,
      weaponType?: "weapon" | "special",
      showReducedDamage?: boolean,
      shooterShipIdOverride?: number,
    ) =>
      calculateDamage({
        shooterId: shooterShipIdOverride ?? selectedShipId,
        targetShipId,
        getShipAttributes,
        selectedWeaponType: selectedWeaponType === "ram" ? "weapon" : selectedWeaponType,
        specialData: (specialData ?? null) as SpecialLike | null,
        specialType,
        weaponType,
        showReducedDamage,
      }),
    [selectedShipId, getShipAttributes, selectedWeaponType, specialData, specialType],
  );
}
