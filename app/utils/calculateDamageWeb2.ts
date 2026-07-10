import { Attributes } from "../types/types";

// `number`-typed parallel of `calculateDamage.ts`. Isomorphic — used both
// client-side (GameDisplayWeb2.tsx, damage preview) and server-side
// (gameEngineWeb2.ts, actual damage application — see that file for the
// preview-vs-apply minimum-damage discrepancy this function intentionally
// preserves: preview can show 0, applying always floors at 1 via
// `Math.max(1, ...)` at the call site).

export interface SpecialLike {
  strength: number;
}

export interface DamageResult {
  baseDamage: number;
  reducedDamage: number;
  willKill: boolean;
  reactorCritical: boolean;
}

export function calculateDamage({
  shooterId,
  targetShipId,
  getShipAttributes,
  selectedWeaponType,
  specialData,
  specialType,
  weaponType,
  showReducedDamage,
}: {
  shooterId: number | null;
  targetShipId: number;
  getShipAttributes: (id: number) => Attributes | null;
  selectedWeaponType: "weapon" | "special";
  specialData: SpecialLike | null | undefined;
  specialType: number;
  weaponType?: "weapon" | "special";
  showReducedDamage?: boolean;
}): DamageResult {
  const empty: DamageResult = {
    baseDamage: 0,
    reducedDamage: 0,
    willKill: false,
    reactorCritical: false,
  };

  if (shooterId == null) return empty;

  const shooterAttributes = getShipAttributes(shooterId);
  const targetAttributes = getShipAttributes(targetShipId);
  if (!shooterAttributes || !targetAttributes) return empty;

  const currentWeaponType = weaponType ?? selectedWeaponType;

  // EMP: no HP damage, just reactor tick
  if (currentWeaponType === "special" && specialType === 1) {
    return { ...empty, reactorCritical: true };
  }

  // Repair: always show repair amount, ignores DR, can target 0-HP ships
  if (currentWeaponType === "special" && specialType === 2) {
    const baseDamage =
      specialData?.strength ?? shooterAttributes.gunDamage;
    return { baseDamage, reducedDamage: baseDamage, willKill: false, reactorCritical: false };
  }

  // Shooting a 0-HP (disabled) ship triggers reactor critical
  if (targetAttributes.hullPoints === 0) {
    return { ...empty, reactorCritical: true };
  }

  const baseDamage =
    currentWeaponType === "special"
      ? (specialData?.strength ?? shooterAttributes.gunDamage)
      : shooterAttributes.gunDamage;

  const reduction = targetAttributes.damageReduction;
  const reducedDamage =
    currentWeaponType === "special" && !showReducedDamage
      ? baseDamage
      : Math.max(0, baseDamage - Math.floor((baseDamage * reduction) / 100));

  const willKill = reducedDamage >= targetAttributes.hullPoints;

  return { baseDamage, reducedDamage, willKill, reactorCritical: false };
}
