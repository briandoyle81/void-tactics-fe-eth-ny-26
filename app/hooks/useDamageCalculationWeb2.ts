import { useCallback } from "react";
import { Attributes } from "../types/types";
import { calculateDamage, SpecialLike } from "../utils/calculateDamageWeb2";

export function useDamageCalculationWeb2({
  selectedShipId,
  getShipAttributes,
  selectedWeaponType,
  specialData,
  specialType,
  shipVariant,
}: {
  selectedShipId: number | null;
  getShipAttributes: (id: number) => Attributes | null;
  selectedWeaponType: "weapon" | "special" | "ram";
  specialData: unknown;
  specialType: number;
  shipVariant?: number;
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
        shipVariant,
        weaponType,
        showReducedDamage,
      }),
    [selectedShipId, getShipAttributes, selectedWeaponType, specialData, specialType, shipVariant],
  );
}
