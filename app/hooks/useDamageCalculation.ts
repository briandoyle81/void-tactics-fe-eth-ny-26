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
  selectedShipId: bigint | null;
  getShipAttributes: (id: bigint) => Attributes | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialData: unknown;
  specialType: number;
}) {
  return useCallback(
    (
      targetShipId: bigint,
      weaponType?: "weapon" | "special",
      showReducedDamage?: boolean,
      shooterShipIdOverride?: bigint,
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
